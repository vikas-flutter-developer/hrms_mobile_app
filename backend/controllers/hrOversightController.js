// 📈 Fetch Monthly Trend Analytics for Charts (Real DB Linked)
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Candidate = require('../models/Candidate');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// 🏢 Global HR Oversight Summary
exports.getGlobalHROversight = async (req, res) => {
    try {
        const companies = await Admin.find({}, 'companyName status selectedPlanName email');
        const totalAdmins = companies.length;
        const totalEmployees = await Employee.countDocuments({});
        const activeCompanies = companies.filter(c => c.status === 'Active').length;

        const oversightData = [];
        let totalMonthlyPlatformPayroll = 0;
        let totalPlatformCandidates = await Candidate.countDocuments({});

        for (const c of companies) {
            const countEmployees = await Employee.countDocuments({ company: c._id });
            const activeLeaveCount = await Leave.countDocuments({ company: c._id, status: 'Approved' });
            const activeCandidates = await Candidate.countDocuments({ company: c._id });

            // Compute monthly payroll for this company
            const employeeSalaries = await Employee.aggregate([
                { $match: { company: c._id } },
                { $group: { _id: null, total: { $sum: "$salary" } } }
            ]);
            const totalMonthlyPayroll = employeeSalaries.length > 0 ? employeeSalaries[0].total : 0;
            totalMonthlyPlatformPayroll += totalMonthlyPayroll;

            // Enabled modules mapping
            let enabledModules = ['Attendance', 'Leave'];
            let planModules = { payroll: true, performance: true, recruitment: true, training: true };
            
            if (c.selectedPlanName && c.selectedPlanName !== 'None') {
                const plan = await SubscriptionPlan.findOne({ name: c.selectedPlanName });
                if (plan && plan.modules) {
                    planModules = plan.modules;
                }
            }
            if (planModules.payroll) enabledModules.push('Payroll');
            if (planModules.performance) enabledModules.push('Performance');
            if (planModules.recruitment) enabledModules.push('Recruitment');
            if (planModules.training) enabledModules.push('Training');

            // Mock Attendance
            const attendanceRate = Math.floor(Math.random() * 20) + 75; // 75-95%
            const lowAttendanceFlag = attendanceRate < 80;

            // Mock Leave Patterns
            const leaveAbuseFlag = Math.random() > 0.8; // 20% chance of abuse pattern
            const commonLeaveTypes = ['Sick', 'Casual', 'Earned'];
            const topLeaveType = commonLeaveTypes[Math.floor(Math.random() * commonLeaveTypes.length)];

            // Mock Performance KPIs
            const kpiCompletionRate = Math.floor(Math.random() * 40) + 60; // 60-100%

            // Mock Training Stats
            const trainingCompletionRate = Math.floor(Math.random() * 50) + 50; // 50-100%

            // Determine if flagged (adding pending payroll check mock)
            const pendingPayroll = Math.random() > 0.85; // 15% chance of pending payroll
            const isFlagged = c.status === 'Suspended' || c.status === 'Blacklisted' || lowAttendanceFlag || leaveAbuseFlag || pendingPayroll || kpiCompletionRate < 65;

            oversightData.push({
                companyName: c.companyName || 'N/A',
                status: c.status || 'Active',
                plan: c.selectedPlanName || 'None',
                email: c.email || 'N/A',
                flagged: isFlagged,
                totalEmployees: countEmployees,
                activeLeaveCount,
                totalMonthlyPayroll,
                activeCandidates,
                enabledModules,
                attendanceRate,
                lowAttendanceFlag,
                leaveAbuseFlag,
                topLeaveType,
                kpiCompletionRate,
                trainingCompletionRate,
                pendingPayroll
            });
        }

        const summary = {
            totalPlatformPayroll: totalMonthlyPlatformPayroll,
            totalPlatformCandidates: totalPlatformCandidates,
            flaggedCompaniesCount: companies.filter(c => c.status === 'Suspended' || c.status === 'Blacklisted').length,
            totalCompanies: companies.length,
            activeCompanies,
            totalAdmins,
            totalEmployees
        };

        res.status(200).json({ success: true, summary, data: oversightData });
    } catch (error) {
        console.error("Global HR Oversight Error:", error);
        res.status(500).json({ success: false, message: "Failed to compile HR oversight data." });
    }
};


const Payslip = require('../models/Payslip');

exports.getMonthlyHRTrends = async (req, res) => {
    try {
        const companiesCount = await Admin.countDocuments({});
        const currentYear = new Date().getFullYear();

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonthIndex = new Date().getMonth();
        // Get last 6 months
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            let d = new Date();
            d.setMonth(currentMonthIndex - i);
            last6Months.push(monthNames[d.getMonth()]);
        }

        const trendsMap = {};
        last6Months.forEach(m => trendsMap[m] = { month: m, totalSalaryDisbursed: 0, activeHires: 0 });

        const payslips = await Payslip.find({});
        payslips.forEach(p => {
            if (p.month) {
                const mStr = p.month.split(' ')[0];
                if (trendsMap[mStr]) {
                    trendsMap[mStr].totalSalaryDisbursed += (p.netPay || 0);
                }
            }
        });

        const candidates = await Candidate.find({});
        candidates.forEach(c => {
            const mStr = monthNames[new Date(c.createdAt).getMonth()];
            if (trendsMap[mStr]) {
                trendsMap[mStr].activeHires += 1;
            }
        });

        const trends = last6Months.map(m => trendsMap[m]);
        const hasData = trends.some(t => t.totalSalaryDisbursed > 0 || t.activeHires > 0);

        res.status(200).json({
            success: true,
            year: currentYear,
            trends: hasData ? trends : []
        });

    } catch (error) {
        console.error("Trends Aggregation Failure:", error);
        res.status(500).json({ success: false, message: "Failed to compile time-series analytics charts graphs." });
    }
};