import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();
  
  // Dynamic logout callback hook (will be assigned by AuthProvider)
  void Function()? onUnauthorized;

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Setup secure JWT injectors interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: AppConstants.tokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // Un-authorized trigger
            if (onUnauthorized != null) {
              onUnauthorized!();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  // --- REST HTTP GATES ---

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> post(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.post(path, data: data, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> put(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.put(path, data: data, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> patch(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.patch(path, data: data, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> delete(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.delete(path, data: data, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  // Helper to upload files via MultiPartFormData
  Future<Response> uploadFiles(String path, Map<String, File> files, {Map<String, dynamic>? data}) async {
    try {
      final Map<String, dynamic> formDataMap = data != null ? Map<String, dynamic>.from(data) : {};
      
      for (var entry in files.entries) {
        formDataMap[entry.key] = await MultipartFile.fromFile(
          entry.value.path,
          filename: entry.value.path.replaceAll('\\', '/').split('/').last,
        );
      }

      final formData = FormData.fromMap(formDataMap);
      return await _dio.post(path, data: formData);
    } catch (e) {
      rethrow;
    }
  }

  // Helper to fetch raw binary bytes (useful for image downloads)
  Future<Response> getBytes(String path) async {
    try {
      return await _dio.get(
        path,
        options: Options(responseType: ResponseType.bytes),
      );
    } catch (e) {
      rethrow;
    }
  }
}
