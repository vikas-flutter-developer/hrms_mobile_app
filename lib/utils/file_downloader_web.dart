// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:typed_data';

Future<void> downloadFileBytes(List<int> bytes, String filename, String mimeType) async {
  final uint8list = Uint8List.fromList(bytes);
  final blob = html.Blob([uint8list], mimeType);
  final url = html.Url.createObjectUrlFromBlob(blob);
  // ignore: deprecated_member_use
  (html.AnchorElement(href: url)
    ..setAttribute('download', filename)
    ..click());
  html.Url.revokeObjectUrl(url);
}
