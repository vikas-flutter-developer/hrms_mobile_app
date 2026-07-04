class AnnouncementModel {
  final String id;
  final String title;
  final String message;
  final String targetAudience;
  final String createdByName;
  final String createdAt;
  final DateTime? expiresAt;
  final int? visibleForHours;

  AnnouncementModel({
    required this.id,
    required this.title,
    required this.message,
    required this.targetAudience,
    required this.createdByName,
    required this.createdAt,
    this.expiresAt,
    this.visibleForHours,
  });

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  String get expiryLabel {
    if (expiresAt == null) return 'Permanent';
    final now = DateTime.now();
    if (now.isAfter(expiresAt!)) return 'Expired';
    final diff = expiresAt!.difference(now);
    if (diff.inDays >= 1) return 'Expires in ${diff.inDays}d';
    if (diff.inHours >= 1) return 'Expires in ${diff.inHours}h';
    return 'Expires soon';
  }

  factory AnnouncementModel.fromJson(Map<String, dynamic> json) {
    String author = 'Admin';
    if (json['createdBy'] is Map) {
      author = json['createdBy']['name']?.toString() ?? 'Admin';
    } else if (json['createdBy'] != null) {
      author = json['createdBy'].toString();
    }

    DateTime? expiresAt;
    if (json['expiresAt'] != null) {
      try { expiresAt = DateTime.parse(json['expiresAt'].toString()); } catch (_) {}
    }

    return AnnouncementModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notice',
      message: json['message']?.toString() ?? '',
      targetAudience: json['targetAudience']?.toString() ?? 'All',
      createdByName: author,
      createdAt: json['createdAt']?.toString() ?? '',
      expiresAt: expiresAt,
      visibleForHours: json['visibleForHours'] != null
          ? int.tryParse(json['visibleForHours'].toString())
          : null,
    );
  }
}

