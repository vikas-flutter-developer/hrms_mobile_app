class HelpdeskTicket {
  final String id;
  final String title;
  final String description;
  final String category; // 'IT', 'HR', 'Facilities', 'Other'
  final String priority; // 'Low', 'Medium', 'High'
  final String status; // 'Open', 'In-Progress', 'Resolved', 'Closed'
  final String dateCreated;
  final String? resolutionNotes;

  HelpdeskTicket({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    required this.dateCreated,
    this.resolutionNotes,
  });

  factory HelpdeskTicket.fromJson(Map<String, dynamic> json) {
    return HelpdeskTicket(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['subject']?.toString() ?? json['title']?.toString() ?? 'Support Ticket',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'IT Support',
      priority: json['priority']?.toString() ?? 'Medium',
      status: json['status']?.toString() ?? 'Open',
      dateCreated: json['createdAt']?.toString() ?? json['dateCreated']?.toString() ?? '',
      resolutionNotes: json['resolutionNotes']?.toString(),
    );
  }
}
