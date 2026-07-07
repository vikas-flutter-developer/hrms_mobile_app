# 🚀 Enterprise HRMS Suite — Complete Feature List

This document lists all of the features built, integrated, and fully functional across the HRMS mobile app and MERN backend database.

---

## 📱 1. Employee Self-Service (ESS) Features
Empowers standard staff to manage their attendance, leaves, finances, tasks, and communications from a unified mobile interface.

*   **Intelligent Shift Clock-In (3 Methods)**:
    *   **GPS Clock-In**: Validates physical location coordinates against office ranges.
    *   **Biometric Fingerprint Scan**: Stateful visual scanner with pulsing scan animations.
    *   **QR Scanner**: Targeting reticle overlay to scan office-door QR codes.
*   **Attendance Shift Ledger**: Monthly logs showing times, hours worked, and status tags (*Present, Late, Absent, Half-Day, Early Leave, Overtime*).
*   **Calendar Heatmap**: Visual, color-coded calendar displaying daily clock statuses.
*   **Time Regularizations**: Request manual adjustments for missed clock-ins with reasoning text.
*   **Leave Portal**: Live trackers for Sick, Casual, and Earned leave balances. Quick submission forms with automatic manager alerts.
*   **Payslip Hub**: Digital access to salary statements with detailed base pay, PF deductions, taxes, and share sheet options.
*   **Salary Advance Loans**: Request short-term advance loans, check repayments, and track approvals.
*   **Expense Reimbursements**: Capture receipts via camera, upload them securely, and check status with live image preview overlays.
*   **Project Kanban Boards**: Move tasks dynamically through *To-Do*, *In Progress*, and *Completed* columns.
*   **Asset Log**: Manage company-issued hardware assets and submit damage/replacement forms.
*   **Live Collaboration Chat**: Real-time peer messaging powered by Socket.IO, with image and media file upload attachments.
*   **Training & E-Learning**: Enroll in company courses and check off structured progress tasks.
*   **Appraisals & Performance**: Review personal KPIs and fill manager/peer feedback surveys.
*   **Helpdesk Desk**: Raise support tickets and chat with helpdesk operators.

---

## 👥 2. HR & Manager Console Features
Provides managers and HR personnel with total oversight of operations, approvals, and hiring pipelines.

*   **Unified Approvals Panel**: 
    *   **Leaves**: 1-click approvals/rejections for leave requests.
    *   **Time Adjustments**: Review and approve employee clock corrections.
    *   **Expenses**: Inspect claims with image preview overlays and authorize payouts.
    *   **Advance Loans**: Manage corporate lending quotas.
*   **Hiring & Recruitment Console**:
    *   **Hiring Funnel Analytics**: Metrics for open roles, candidate pipeline counts, average time-to-hire, and cost-per-hire.
    *   **Job Postings Creator**: Publish roles with title, department, location, type, and salary details.
    *   **AI Auto-Shortlisting**: Parse candidate resumes against job descriptions to calculate an AI Match percentage.
    *   **Onboarding Checklist**: Track 10-step progress grids (IT setup, team orientation, documentation checks) for hired candidates.
*   **Staff Log Monitor**: Live dashboard tracking daily check-ins, late arrivals, and absences across the entire company.
*   **Interactive Active Directory**: Browse organizational structures, departments, and designations.

---

## 👑 3. Company Workspace Admin Features
Enables corporate workspace owners and CEOs to customize internal tools, shifts, and business details.

*   **Admin Dashboard**: Graphic widgets showing employee count, tickets, and attendance trends.
*   **Shift Planners**: Create shifts (Day, Night, Rotational) with customized grace periods.
*   **Corporate Calendar**: Define custom company holidays and national list calendars.
*   **IP Whitelisting & Restrictions**: Enforce network IP whitelisting to block remote check-ins.
*   **Subscriptions Panel**: Track plan remaining lifespans (Free, Basic, Premium, Custom) and toggle auto-renewal billing.
*   **B2B Self-Registration**: Self-register new company workspaces on the sign-up page, uploading compliance information (GST, PAN, TAN, Reg No) for super admin validation.

---

## 🛡️ 4. B2B Platform Super Admin Features
Platform-wide control center for managing the multi-tenant architecture, subscription tiers, and global system rules.

*   **Global User Directory**: Search, block/unblock, force password resets, and view audit history logs for all accounts.
*   **CEO Impersonation sessions**: Access B2B company workspaces to inspect or configure panels on behalf of workspace owners.
*   **Maintenance Mode**: Global toggle to lock databases (Full/Write-only) and set downtime alert banners.
*   **smtp configuration mailer**: Edit mail gateway settings and send tests.
*   **Master Templates**: Establish universal templates for departments, design levels, leave criteria, and asset tags.
*   **Role-Based Security (RBAC)**: Manage roles, permissions, and security logs.
*   **Scheduled Broadcasts**: Schedule announcements with date-time pickers and check read receipt metrics.
*   **Promotions Console**: Generate active coupon promotional discount codes.
*   **Platform Exports**: Securely export billing history, company profiles, and support tickets to **CSV**, **Excel**, or **PDF**.
