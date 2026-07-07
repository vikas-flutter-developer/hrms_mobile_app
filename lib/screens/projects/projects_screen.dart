import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/project.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _activeTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _activeTabIndex = _tabController.index;
        });
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      hr.fetchProjects();
      hr.fetchMyTasks();
      hr.fetchMyTeam(); // Load colleagues directory for task assignment dropdown
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showAddProjectModal(BuildContext context, {ProjectModel? project}) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: project?.name);
    final descCtrl = TextEditingController(text: project?.description);
    final deptCtrl = TextEditingController(text: project?.department ?? 'Engineering');
    String status = project?.status ?? 'In Progress';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 20,
                right: 20,
                top: 20,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        project == null ? 'Create New Project' : 'Edit Project Details',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: nameCtrl,
                        decoration: InputDecoration(
                          labelText: 'Project Title',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter project title' : null,
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: deptCtrl,
                        decoration: InputDecoration(
                          labelText: 'Department',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter department' : null,
                      ),
                      const SizedBox(height: 12),

                      if (project != null) ...[
                        DropdownButtonFormField<String>(
                          value: status,
                          decoration: InputDecoration(
                            labelText: 'Project Status',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'Not Started', child: Text('Not Started')),
                            DropdownMenuItem(value: 'In Progress', child: Text('In Progress')),
                            DropdownMenuItem(value: 'Review', child: Text('Review')),
                            DropdownMenuItem(value: 'Completed', child: Text('Completed')),
                            DropdownMenuItem(value: 'On Hold', child: Text('On Hold')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() => status = val);
                            }
                          },
                        ),
                        const SizedBox(height: 12),
                      ],

                      TextFormField(
                        controller: descCtrl,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Project Description / Scope',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter description' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          
                          bool success;
                          if (project == null) {
                            success = await hr.createProject(
                              name: nameCtrl.text.trim(),
                              description: descCtrl.text.trim(),
                              department: deptCtrl.text.trim(),
                              startDate: DateTime.now().toIso8601String(),
                              endDate: DateTime.now().add(const Duration(days: 90)).toIso8601String(),
                            );
                          } else {
                            success = await hr.updateProject(
                              id: project.id,
                              name: nameCtrl.text.trim(),
                              description: descCtrl.text.trim(),
                              department: deptCtrl.text.trim(),
                              startDate: project.startDate,
                              endDate: project.endDate,
                              status: status,
                            );
                          }

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Project details saved!' : 'Failed to save project.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(project == null ? 'Create Project' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showAddTaskModal(BuildContext context, {TaskModel? task}) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final titleCtrl = TextEditingController(text: task?.title);
    final descCtrl = TextEditingController(text: task?.description);
    
    // Find matched project id or fallback to first project
    String? selectedProjectId;
    if (task != null) {
      // Find the project name match in hr.projects
      final match = hr.projects.firstWhere(
        (p) => p.name == task.title || task.description.contains(p.name), 
        orElse: () => hr.projects.first
      );
      selectedProjectId = match.id;
    } else {
      selectedProjectId = hr.projects.isNotEmpty ? hr.projects.first.id : null;
    }

    // Match employee ID for task assignee
    String? selectedAssigneeId;
    if (task != null) {
      final matchEmp = hr.myTeam.firstWhere(
        (e) => e.name == task.assignedToName,
        orElse: () => hr.myTeam.first
      );
      selectedAssigneeId = matchEmp.id;
    } else {
      selectedAssigneeId = hr.myTeam.isNotEmpty ? hr.myTeam.first.id : null;
    }

    String priority = task?.priority ?? 'Medium';
    String status = task?.status ?? 'Todo';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 20,
                right: 20,
                top: 20,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        task == null ? 'Create & Assign Task' : 'Edit Task Details',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Modify details and assign to the correct team member.',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 16),

                      // Project Selection Dropdown
                      DropdownButtonFormField<String>(
                        value: selectedProjectId,
                        decoration: InputDecoration(
                          labelText: 'Select Project',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: hr.projects.map((p) {
                          return DropdownMenuItem(
                            value: p.id,
                            child: Text(p.name, overflow: TextOverflow.ellipsis),
                          );
                        }).toList(),
                        validator: (v) => v == null ? 'Please select a project' : null,
                        onChanged: (val) {
                          setModalState(() => selectedProjectId = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      // Task Title
                      TextFormField(
                        controller: titleCtrl,
                        decoration: InputDecoration(
                          labelText: 'Task Title',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter task title' : null,
                      ),
                      const SizedBox(height: 12),

                      // Assigned To Dropdown
                      DropdownButtonFormField<String>(
                        value: selectedAssigneeId,
                        decoration: InputDecoration(
                          labelText: 'Assign To Employee',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: hr.myTeam.map((emp) {
                          return DropdownMenuItem(
                            value: emp.id,
                            child: Text('${emp.name} (${emp.positionLevel ?? 'Member'})', overflow: TextOverflow.ellipsis),
                          );
                        }).toList(),
                        validator: (v) => v == null ? 'Please select an employee' : null,
                        onChanged: (val) {
                          setModalState(() => selectedAssigneeId = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      // Priority Dropdown
                      DropdownButtonFormField<String>(
                        value: priority,
                        decoration: InputDecoration(
                          labelText: 'Priority Level',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Low', child: Text('🟢 Low')),
                          DropdownMenuItem(value: 'Medium', child: Text('🟡 Medium')),
                          DropdownMenuItem(value: 'High', child: Text('🔴 High')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => priority = val);
                          }
                        },
                      ),
                      const SizedBox(height: 12),

                      if (task != null) ...[
                        DropdownButtonFormField<String>(
                          value: status,
                          decoration: InputDecoration(
                            labelText: 'Task Status',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'Todo', child: Text('📝 Todo')),
                            DropdownMenuItem(value: 'In Progress', child: Text('⚡ In Progress')),
                            DropdownMenuItem(value: 'Review', child: Text('👀 Review')),
                            DropdownMenuItem(value: 'Completed', child: Text('✅ Completed')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() => status = val);
                            }
                          },
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Description
                      TextFormField(
                        controller: descCtrl,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Task Description / Steps',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter task details' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          
                          // Default deadline to 7 days from now
                          final deadlineStr = task?.dueDate.isNotEmpty == true 
                              ? task!.dueDate 
                              : DateTime.now().add(const Duration(days: 7)).toIso8601String();

                          bool success;
                          if (task == null) {
                            success = await hr.createTask(
                              projectId: selectedProjectId!,
                              title: titleCtrl.text.trim(),
                              description: descCtrl.text.trim(),
                              assignedToId: selectedAssigneeId!,
                              priority: priority,
                              deadline: deadlineStr,
                            );
                          } else {
                            success = await hr.updateTask(
                              id: task.id,
                              projectId: selectedProjectId!,
                              title: titleCtrl.text.trim(),
                              description: descCtrl.text.trim(),
                              assignedToId: selectedAssigneeId!,
                              priority: priority,
                              deadline: deadlineStr,
                              status: status,
                            );
                          }

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Task details saved!' : 'Failed to save task.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(task == null ? 'Publish & Assign Task' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _confirmDeleteProject(BuildContext context, String id) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Project?'),
          content: const Text('Are you sure you want to delete this project? This will also remove all associated task board items permanently.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final success = await hr.deleteProject(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Project deleted!' : 'Error deleting project.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text('Delete', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _confirmDeleteTask(BuildContext context, String id) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Task?'),
          content: const Text('Are you sure you want to remove this task assignment permanently from the Task Board?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final success = await hr.deleteTask(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Task deleted!' : 'Error deleting task.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text('Delete', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final hr = Provider.of<HrProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Projects & Task Board', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF0284C7),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF0284C7),
          tabs: const [
            Tab(text: 'Active Projects'),
            Tab(text: 'Task Board'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Active Projects
          hr.isLoading && hr.projects.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : hr.projects.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.folder_off_outlined, size: 48, color: Color(0xFF94A3B8)),
                          SizedBox(height: 12),
                          Text('No active projects found.', style: TextStyle(color: Color(0xFF64748B))),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () async => hr.fetchProjects(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: hr.projects.length,
                        itemBuilder: (context, index) {
                          final prj = hr.projects[index];
                          
                          // Calculate task progress for this project dynamically
                          final prjTasks = hr.projectTasks.where((t) => t.projectId == prj.id || t.projectName == prj.name).toList();
                          double progressPercentage = 0.0;
                          if (prj.status.toLowerCase() == 'completed') {
                            progressPercentage = 100.0;
                          } else if (prjTasks.isNotEmpty) {
                            final completedCount = prjTasks.where((t) => t.status.toLowerCase() == 'completed' || t.status.toLowerCase() == 'done').length;
                            progressPercentage = (completedCount / prjTasks.length) * 100;
                          } else {
                            if (prj.status == 'In Progress' || prj.status == 'Review') {
                              progressPercentage = 35.0;
                            } else if (prj.status == 'On Hold') {
                              progressPercentage = 15.0;
                            } else {
                              progressPercentage = 0.0;
                            }
                          }

                          return Card(
                            elevation: 2,
                            color: Colors.white,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: const BoxDecoration(color: Color(0xFFE0F2FE), shape: BoxShape.circle),
                                        child: const Icon(Icons.account_tree_rounded, color: Color(0xFF0284C7)),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(prj.name, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15)),
                                            Text('Dept: ${prj.department} • Manager: ${prj.managerName}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(prj.status, style: const TextStyle(color: Color(0xFF0284C7), fontSize: 11, fontWeight: FontWeight.bold)),
                                      ),
                                      if (isAdminOrHr) ...[
                                        PopupMenuButton<String>(
                                          icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF64748B)),
                                          onSelected: (val) {
                                            if (val == 'edit') {
                                              _showAddProjectModal(context, project: prj);
                                            } else if (val == 'delete') {
                                              _confirmDeleteProject(context, prj.id);
                                            }
                                          },
                                          itemBuilder: (context) => [
                                            const PopupMenuItem(
                                              value: 'edit',
                                              child: Row(
                                                children: [
                                                  Icon(Icons.edit_rounded, size: 18, color: Colors.blue),
                                                  SizedBox(width: 8),
                                                  Text('Edit Project'),
                                                ],
                                              ),
                                            ),
                                            const PopupMenuItem(
                                              value: 'delete',
                                              child: Row(
                                                children: [
                                                  Icon(Icons.delete_forever_rounded, size: 18, color: Colors.redAccent),
                                                  SizedBox(width: 8),
                                                  Text('Delete Project', style: TextStyle(color: Colors.redAccent)),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                  const Divider(color: Color(0xFFE2E8F0), height: 24),
                                  Text(prj.description, style: const TextStyle(color: Color(0xFF334155), fontSize: 13)),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Project Progress', style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold)),
                                      Text('${progressPercentage.toStringAsFixed(0)}%', style: const TextStyle(color: Color(0xFF0284C7), fontSize: 12, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: progressPercentage / 100,
                                      backgroundColor: const Color(0xFFE2E8F0),
                                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0284C7)),
                                      minHeight: 6,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),

          // Tab 2: Task Board
          hr.isLoading && hr.projectTasks.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : hr.projectTasks.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.assignment_turned_in_outlined, size: 48, color: Color(0xFF94A3B8)),
                          SizedBox(height: 12),
                          Text('No task assignments assigned.', style: TextStyle(color: Color(0xFF64748B))),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () async => hr.fetchMyTasks(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: hr.projectTasks.length,
                        itemBuilder: (context, index) {
                          final task = hr.projectTasks[index];
                          final isCompleted = task.status.toLowerCase() == 'completed';

                          return Card(
                            elevation: 2,
                            color: Colors.white,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(
                                        isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                                        color: isCompleted ? const Color(0xFF10B981) : Colors.amber[700],
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(task.title, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 14)),
                                            Text('Assigned to: ${task.assignedToName} • Priority: ${task.priority}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                          ],
                                        ),
                                      ),
                                      if (isAdminOrHr) ...[
                                        PopupMenuButton<String>(
                                          icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF64748B)),
                                          onSelected: (val) {
                                            if (val == 'edit') {
                                              _showAddTaskModal(context, task: task);
                                            } else if (val == 'delete') {
                                              _confirmDeleteTask(context, task.id);
                                            }
                                          },
                                          itemBuilder: (context) => [
                                            const PopupMenuItem(
                                              value: 'edit',
                                              child: Row(
                                                children: [
                                                  Icon(Icons.edit_rounded, size: 18, color: Colors.blue),
                                                  SizedBox(width: 8),
                                                  Text('Edit Task'),
                                                ],
                                              ),
                                            ),
                                            const PopupMenuItem(
                                              value: 'delete',
                                              child: Row(
                                                children: [
                                                  Icon(Icons.delete_forever_rounded, size: 18, color: Colors.redAccent),
                                                  SizedBox(width: 8),
                                                  Text('Delete Task', style: TextStyle(color: Colors.redAccent)),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: OutlinedButton(
                                      onPressed: () async {
                                        final newStatus = isCompleted ? 'In Progress' : 'Completed';
                                        await hr.updateTaskStatus(task.id, newStatus);
                                      },
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: isCompleted ? Colors.amber[800] : const Color(0xFF10B981),
                                        side: BorderSide(color: isCompleted ? Colors.amber[800]! : const Color(0xFF10B981)),
                                      ),
                                      child: Text(isCompleted ? 'Mark In Progress' : 'Mark Completed'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ],
      ),
      floatingActionButton: isAdminOrHr
          ? (_activeTabIndex == 0
              ? FloatingActionButton.extended(
                  onPressed: () => _showAddProjectModal(context),
                  backgroundColor: const Color(0xFF0284C7),
                  icon: const Icon(Icons.add, color: Colors.white),
                  label: const Text('Create Project', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                )
              : FloatingActionButton.extended(
                  onPressed: () => _showAddTaskModal(context),
                  backgroundColor: const Color(0xFF0284C7),
                  icon: const Icon(Icons.add_task_rounded, color: Colors.white),
                  label: const Text('Assign Task', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ))
          : null,
    );
  }
}
