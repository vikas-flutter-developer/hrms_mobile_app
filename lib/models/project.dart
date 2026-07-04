class ProjectModel {
  final String id;
  final String name;
  final String description;
  final String department;
  final String status; // 'Planning', 'In Progress', 'On Hold', 'Completed'
  final String startDate;
  final String endDate;
  final String managerName;
  final String teamLeadName;
  final int memberCount;

  ProjectModel({
    required this.id,
    required this.name,
    required this.description,
    required this.department,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.managerName,
    required this.teamLeadName,
    required this.memberCount,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    String mName = 'N/A';
    if (json['projectManager'] is Map) {
      mName = json['projectManager']['name']?.toString() ?? 'N/A';
    }

    String lName = 'N/A';
    if (json['teamLead'] is Map) {
      lName = json['teamLead']['name']?.toString() ?? 'N/A';
    }

    int count = 0;
    if (json['members'] is List) {
      count = (json['members'] as List).length;
    }

    return ProjectModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['title']?.toString() ?? json['name']?.toString() ?? 'Project',
      description: json['description']?.toString() ?? '',
      department: json['department']?.toString() ?? 'General',
      status: json['status']?.toString() ?? 'In Progress',
      startDate: json['startDate']?.toString() ?? '',
      endDate: json['deadline']?.toString() ?? json['endDate']?.toString() ?? '',
      managerName: mName,
      teamLeadName: lName,
      memberCount: count,
    );
  }
}

class TaskModel {
  final String id;
  final String title;
  final String description;
  final String status; // 'To Do', 'In Progress', 'Done'
  final String priority; // 'Low', 'Medium', 'High', 'Urgent'
  final String assignedToName;
  final String dueDate;

  TaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.assignedToName,
    required this.dueDate,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    String aName = 'Unassigned';
    if (json['assignedTo'] is Map) {
      aName = json['assignedTo']['name']?.toString() ?? 'Unassigned';
    }

    return TaskModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Task',
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'To Do',
      priority: json['priority']?.toString() ?? 'Medium',
      assignedToName: aName,
      dueDate: json['dueDate']?.toString() ?? '',
    );
  }
}
