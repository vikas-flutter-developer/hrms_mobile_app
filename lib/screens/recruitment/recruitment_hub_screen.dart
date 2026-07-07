import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/constants.dart';

class RecruitmentHubScreen extends StatefulWidget {
  const RecruitmentHubScreen({super.key});

  @override
  State<RecruitmentHubScreen> createState() => _RecruitmentHubScreenState();
}

class _RecruitmentHubScreenState extends State<RecruitmentHubScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _api = ApiService();

  // State variables
  bool _isLoading = false;
  Map<String, dynamic> _analytics = {};
  List<dynamic> _jobs = [];
  List<dynamic> _candidates = [];
  dynamic _selectedOnboardingCandidate;
  List<dynamic> _onboardingChecklist = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) return;
      _fetchTabMetrics();
    });
    _fetchTabMetrics();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchTabMetrics() async {
    setState(() {
      _isLoading = true;
    });
    try {
      if (_tabController.index == 0) {
        final response = await _api.get('/recruitment/analytics');
        if (response.statusCode == 200) {
          _analytics = Map<String, dynamic>.from(response.data);
        }
      } else if (_tabController.index == 1) {
        final response = await _api.get('/recruitment/jobs');
        if (response.statusCode == 200) {
          _jobs = List<dynamic>.from(response.data);
        }
      } else if (_tabController.index == 2) {
        final response = await _api.get('/recruitment/candidates');
        if (response.statusCode == 200) {
          _candidates = List<dynamic>.from(response.data);
        }
      } else if (_tabController.index == 3) {
        await _fetchCandidatesForOnboarding();
      }
    } catch (e) {
      print('Recruitment fetch error: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchCandidatesForOnboarding() async {
    final response = await _api.get('/recruitment/candidates');
    if (response.statusCode == 200) {
      _candidates = List<dynamic>.from(response.data);
      // Filter candidates that are either Hired, Offered, or Shortlisted
      final onboardingPool = _candidates.where((c) => ['Hired', 'Offered', 'Shortlisted'].contains(c['status'])).toList();
      if (onboardingPool.isNotEmpty && _selectedOnboardingCandidate == null) {
        _selectedOnboardingCandidate = onboardingPool.first;
      }
      if (_selectedOnboardingCandidate != null) {
        await _fetchOnboardingChecklist(_selectedOnboardingCandidate['_id']);
      }
    }
  }

  Future<void> _fetchOnboardingChecklist(String candidateId) async {
    try {
      final response = await _api.get('/recruitment/onboarding/$candidateId');
      if (response.statusCode == 200) {
        setState(() {
          _onboardingChecklist = List<dynamic>.from(response.data['onboardingChecklist'] ?? []);
        });
      }
    } catch (e) {
      // If onboarding checklist is empty or not created yet, initialize it
      final initResponse = await _api.post('/recruitment/onboarding/$candidateId');
      if (initResponse.statusCode == 200 || initResponse.statusCode == 201) {
        setState(() {
          _onboardingChecklist = List<dynamic>.from(initResponse.data['onboardingChecklist'] ?? []);
        });
      }
    }
  }

  Future<void> _triggerAIShortlist() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final response = await _api.post('/recruitment/candidates/ai-shortlist');
      if (response.statusCode == 200) {
        final count = response.data['shortlistedCount'] ?? 0;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI shortlisting complete! $count candidates shortlisted.'), backgroundColor: Colors.green),
        );
        _fetchTabMetrics();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('AI matches evaluation error: $e'), backgroundColor: Colors.redAccent),
      );
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _changeCandidateStatus(String candidateId, String status) async {
    try {
      final response = await _api.patch('/recruitment/candidates/$candidateId/status', data: {'status': status});
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Candidate status updated!'), backgroundColor: Colors.green),
        );
        _fetchTabMetrics();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update status: $e'), backgroundColor: Colors.redAccent),
      );
    }
  }

  Future<void> _toggleOnboardingItem(int index) async {
    if (_selectedOnboardingCandidate == null) return;
    final candidateId = _selectedOnboardingCandidate['_id'];
    try {
      final response = await _api.put('/recruitment/onboarding/$candidateId/item/$index');
      if (response.statusCode == 200) {
        setState(() {
          _onboardingChecklist = List<dynamic>.from(response.data['onboardingChecklist'] ?? []);
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Checklist update error: $e'), backgroundColor: Colors.redAccent),
      );
    }
  }

  Future<void> _createNewJob(Map<String, dynamic> jobData) async {
    try {
      final response = await _api.post('/recruitment/jobs', data: jobData);
      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('New job posting created successfully!'), backgroundColor: Colors.green),
        );
        _fetchTabMetrics();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to post job: $e'), backgroundColor: Colors.redAccent),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Recruitment Console', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF2563EB),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF2563EB),
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview & Funnel'),
            Tab(text: 'Job Openings'),
            Tab(text: 'Candidates Pipeline'),
            Tab(text: 'Onboarding checklists'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildJobsTab(),
                _buildCandidatesTab(),
                _buildOnboardingTab(),
              ],
            ),
    );
  }

  // ==========================================
  // TAB 1: OVERVIEW & FUNNEL
  // ==========================================
  Widget _buildOverviewTab() {
    final stats = _analytics['funnelStats'] ?? {};
    final totalJobs = _analytics['totalJobs'] ?? 0;
    final timeToHire = _analytics['avgTimeToHire'] ?? 14;
    final costPerHire = _analytics['costPerHire'] ?? 4500;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: _buildMetricCard('Active Openings', '$totalJobs Positions', Icons.campaign_rounded, const Color(0xFF2563EB)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard('Time to Hire', '$timeToHire Days', Icons.speed_rounded, const Color(0xFF10B981)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildMetricCard('Average Cost per Hire', '₹ $costPerHire', Icons.payments_rounded, const Color(0xFFF59E0B)),
          const SizedBox(height: 24),
          const Text(
            'Hiring Funnel Status',
            style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Card(
            elevation: 2,
            color: Colors.white,
            shadowColor: const Color(0x100F172A),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildFunnelBar('Applied', stats['Applied'] ?? 0, const Color(0xFF2563EB)),
                  _buildFunnelBar('Shortlisted', stats['Shortlisted'] ?? 0, const Color(0xFF3B82F6)),
                  _buildFunnelBar('Interviewing', stats['Interviewing'] ?? 0, const Color(0xFF8B5CF6)),
                  _buildFunnelBar('Offered', stats['Offered'] ?? 0, const Color(0xFFEC4899)),
                  _buildFunnelBar('Hired', stats['Hired'] ?? 0, const Color(0xFF10B981)),
                  _buildFunnelBar('Rejected', stats['Rejected'] ?? 0, const Color(0xFFEF4444)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String title, String val, IconData icon, Color color) {
    return Card(
      elevation: 2,
      color: Colors.white,
      shadowColor: const Color(0x100F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(val, style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildFunnelBar(String stage, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(stage, style: const TextStyle(color: Color(0xFF334155), fontWeight: FontWeight.bold, fontSize: 13)),
              Text('$count Candidates', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: count == 0 ? 0.05 : (count > 10 ? 1.0 : count / 10.0),
              backgroundColor: const Color(0xFFF1F5F9),
              color: color,
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 2: JOB OPENINGS
  // ==========================================
  Widget _buildJobsTab() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateJobDialog,
        backgroundColor: const Color(0xFF2563EB),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: _jobs.isEmpty
          ? const Center(child: Text('No active job openings created.', style: TextStyle(color: Color(0xFF64748B))))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _jobs.length,
              itemBuilder: (context, index) {
                final job = _jobs[index];
                return Card(
                  elevation: 2,
                  color: Colors.white,
                  shadowColor: const Color(0x100F172A),
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              job['title'] ?? '',
                              style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            _buildJobStatusBadge(job['status'] ?? 'Open'),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${job['department']} • ${job['location']} • ${job['type']}',
                          style: const TextStyle(color: Color(0xFF2563EB), fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          job['description'] ?? '',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildJobStatusBadge(String status) {
    final color = status.toLowerCase() == 'open' ? const Color(0xFF10B981) : const Color(0xFF64748B);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
      child: Text(status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  void _showCreateJobDialog() {
    final titleCtrl = TextEditingController();
    final deptCtrl = TextEditingController();
    final locCtrl = TextEditingController();
    final typeCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Post New Job Opening', style: TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: titleCtrl,
                    decoration: const InputDecoration(labelText: 'Job Title'),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  TextFormField(
                    controller: deptCtrl,
                    decoration: const InputDecoration(labelText: 'Department'),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  TextFormField(
                    controller: locCtrl,
                    decoration: const InputDecoration(labelText: 'Location'),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  TextFormField(
                    controller: typeCtrl,
                    decoration: const InputDecoration(labelText: 'Type (Full-time / Remote)'),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  TextFormField(
                    controller: descCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Brief Description'),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                Navigator.pop(context);
                await _createNewJob({
                  'title': titleCtrl.text.trim(),
                  'department': deptCtrl.text.trim(),
                  'location': locCtrl.text.trim(),
                  'type': typeCtrl.text.trim(),
                  'description': descCtrl.text.trim(),
                  'status': 'Open',
                });
              },
              child: const Text('Post Job'),
            ),
          ],
        );
      },
    );
  }

  // ==========================================
  // TAB 3: CANDIDATES PIPELINE
  // ==========================================
  Widget _buildCandidatesTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: Colors.white,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Active Applicants', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              ElevatedButton.icon(
                onPressed: _triggerAIShortlist,
                icon: const Icon(Icons.psychology_rounded, size: 16, color: Colors.white),
                label: const Text('AI Auto-Shortlist', style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              )
            ],
          ),
        ),
        Expanded(
          child: _candidates.isEmpty
              ? const Center(child: Text('No active candidates in the hiring pipeline.', style: TextStyle(color: Color(0xFF64748B))))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _candidates.length,
                  itemBuilder: (context, index) {
                    final cand = _candidates[index];
                    final jobTitle = cand['jobId']?['title'] ?? 'General Role';
                    final score = cand['aiScore'] ?? cand['aiMatchScore'] ?? 0.0;
                    final scorePct = (score * 100).toStringAsFixed(0);

                    return Card(
                      elevation: 2,
                      color: Colors.white,
                      shadowColor: const Color(0x100F172A),
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  cand['name'] ?? '',
                                  style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                _buildCandidateStatusDropdown(cand),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              jobTitle,
                              style: const TextStyle(color: Color(0xFF2563EB), fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.email_rounded, size: 14, color: Color(0xFF64748B)),
                                const SizedBox(width: 6),
                                Text(cand['email'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEEF2FF),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFC7D2FE)),
                                  ),
                                  child: Text('AI Match: $scorePct%', style: const TextStyle(color: Color(0xFF4F46E5), fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        )
      ],
    );
  }

  Widget _buildCandidateStatusDropdown(dynamic cand) {
    final statusList = ['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Hired', 'Rejected'];
    final currentStatus = cand['status'] ?? 'Applied';

    return DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: statusList.contains(currentStatus) ? currentStatus : 'Applied',
        onChanged: (String? val) {
          if (val != null) {
            _changeCandidateStatus(cand['_id'], val);
          }
        },
        items: statusList.map<DropdownMenuItem<String>>((String status) {
          return DropdownMenuItem<String>(
            value: status,
            child: Text(
              status,
              style: TextStyle(
                color: _getStatusColor(status),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'hired':
        return const Color(0xFF10B981);
      case 'shortlisted':
        return const Color(0xFF2563EB);
      case 'interviewing':
        return const Color(0xFF8B5CF6);
      case 'offered':
        return const Color(0xFFEC4899);
      case 'rejected':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF64748B);
    }
  }

  // ==========================================
  // TAB 4: ONBOARDING CHECKLISTS
  // ==========================================
  Widget _buildOnboardingTab() {
    final onboardingPool = _candidates.where((c) => ['Hired', 'Offered', 'Shortlisted'].contains(c['status'])).toList();

    return onboardingPool.isEmpty
        ? const Center(child: Text('No shortlisted/hired candidates for onboarding.', style: TextStyle(color: Color(0xFF64748B))))
        : Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Candidate selector dropdown
                const Text('Select Onboarding Candidate', style: TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<dynamic>(
                      value: onboardingPool.any((c) => c['_id'] == _selectedOnboardingCandidate?['_id'])
                          ? onboardingPool.firstWhere((c) => c['_id'] == _selectedOnboardingCandidate['_id'])
                          : onboardingPool.first,
                      isExpanded: true,
                      onChanged: (dynamic val) {
                        if (val != null) {
                          setState(() {
                            _selectedOnboardingCandidate = val;
                          });
                          _fetchOnboardingChecklist(val['_id']);
                        }
                      },
                      items: onboardingPool.map<DropdownMenuItem<dynamic>>((dynamic cand) {
                        return DropdownMenuItem<dynamic>(
                          value: cand,
                          child: Text('${cand['name']} - ${cand['jobId']?['title'] ?? 'Role'}'),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Checklist list
                const Text('Onboarding Tasks List', style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Expanded(
                  child: Card(
                    elevation: 2,
                    color: Colors.white,
                    shadowColor: const Color(0x100F172A),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: _onboardingChecklist.isEmpty
                        ? const Center(child: CircularProgressIndicator())
                        : ListView.separated(
                            padding: const EdgeInsets.all(12),
                            itemCount: _onboardingChecklist.length,
                            separatorBuilder: (context, index) => const Divider(color: Color(0xFFE2E8F0)),
                            itemBuilder: (context, index) {
                              final task = _onboardingChecklist[index];
                              final isCompleted = task['completed'] ?? false;
                              return CheckboxListTile(
                                value: isCompleted,
                                activeColor: const Color(0xFF10B981),
                                title: Text(
                                  task['item'] ?? '',
                                  style: TextStyle(
                                    color: isCompleted ? const Color(0xFF94A3B8) : const Color(0xFF0F172A),
                                    decoration: isCompleted ? TextDecoration.lineThrough : null,
                                    fontSize: 14,
                                  ),
                                ),
                                controlAffinity: ListTileControlAffinity.leading,
                                onChanged: (bool? checked) {
                                  _toggleOnboardingItem(index);
                                },
                              );
                            },
                          ),
                  ),
                )
              ],
            ),
          );
  }
}
