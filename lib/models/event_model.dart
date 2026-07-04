class CompanyEventModel {
  final String id;
  final String title;
  final String description;
  final String date;
  final String location;
  final String status; // 'Upcoming', 'Ongoing', 'Completed'

  CompanyEventModel({
    required this.id,
    required this.title,
    required this.description,
    required this.date,
    required this.location,
    required this.status,
  });

  factory CompanyEventModel.fromJson(Map<String, dynamic> json) {
    return CompanyEventModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Event',
      description: json['description']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      location: json['location']?.toString() ?? 'Main Office',
      status: json['status']?.toString() ?? 'Upcoming',
    );
  }
}
