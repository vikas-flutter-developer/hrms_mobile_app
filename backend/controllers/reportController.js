// backend/controllers/reportController.js

const Admin = require("../models/Admin");
const Employee = require("../models/Employee");
const Ticket = require("../models/Ticket");
const ScheduledReport = require("../models/ScheduledReport");
const cron = require("node-cron");
const nodemailer = require("nodemailer");

// Optional: NodeMailer setup (Simulated for testing)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    auth: {
        user: process.env.SMTP_USER || 'dummy',
        pass: process.env.SMTP_PASS || 'dummy'
    }
});

// Run this job every minute to check for daily/weekly/monthly schedules
cron.schedule("* * * * *", async () => {
    try {
        const jobs = await ScheduledReport.find({ status: 'active' });
        const now = new Date();
        for (const job of jobs) {
            // Simplified logic: for demo, we assume the cron triggers when nextRunAt <= now
            if (job.nextRunAt && job.nextRunAt <= now) {
                console.log(`[Auto-Report] Executing ${job.reportType} report for ${job.recipients.join(',')}`);
                
                // Mock sending email
                // transporter.sendMail({ from: 'no-reply@hrms.com', to: job.recipients, subject: 'Automated Report', text: 'Here is your report.' });

                // Update next run time
                job.lastRunAt = now;
                if (job.frequency === 'daily') job.nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                else if (job.frequency === 'weekly') job.nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                else if (job.frequency === 'monthly') job.nextRunAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                
                await job.save();
            }
        }
    } catch (e) {
        console.error("Cron Error:", e);
    }
});

exports.getPlatformReport = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    // 📅 Dynamic Date Range Filter Configuration
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    let reportData = [];

    // Safety fallback check
    if (!Admin || !Employee || !Ticket) {
      return res.status(500).json({ 
        success: false, 
        message: "Critical Error: One or more database schemas failed to initialize on runtime." 
      });
    }

    switch (type) {
      // 🏢 1. Company Growth Report
      case "growth":
        reportData = await Admin.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              "Total Registered Companies": { $sum: 1 },
              "Active Nodes": { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
              "Suspended Nodes": { $sum: { $cond: [{ $eq: ["$status", "Suspended"] }, 1, 0] } }
            }
          },
          { $project: { _id: 0, "Billing Month": "$_id", "Total Registered Companies": 1, "Active Nodes": 1, "Suspended Nodes": 1 } },
          { $sort: { "Billing Month": 1 } }
        ]);
        break;

      // 💳 2. Revenue Report (Daily / Monthly / Yearly transaction aggregation)
      case "revenue":
        const interval = req.query.interval || "monthly";
        let format = "%Y-%m"; // default monthly
        if (interval === "daily") format = "%Y-%m-%d";
        else if (interval === "yearly") format = "%Y";

        const Invoice = require("../models/Invoice");
        let matchFilter = { status: "Paid" };
        if (startDate && endDate) {
          matchFilter.paymentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        reportData = await Invoice.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: { $dateToString: { format: format, date: "$paymentDate" } },
              "Invoices Issued": { $sum: 1 },
              "Collected Revenue (INR)": { $sum: "$totalAmount" }
            }
          },
          {
            $project: {
              _id: 0,
              "Time Period": "$_id",
              "Invoices Issued": 1,
              "Collected Revenue (INR)": 1
            }
          },
          { $sort: { "Time Period": 1 } }
        ]);
        break;

      // 👥 3. User Activity Report
      case "user_activity":
        reportData = await Employee.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$role",
              "Total System Active Users": { $sum: 1 }
            }
          },
          { $project: { _id: 0, "System Authority Role": "$_id", "Total System Active Users": 1 } }
        ]);
        break;

      // 📜 4. Subscription Report
      case "subscription":
        reportData = await Admin.aggregate([
          { $match: dateFilter },
          {
            $project: {
              _id: 0,
              "Company Entity Name": "$companyName",
              "Active Gateway Tier": "$selectedPlanName",
              "Cluster Node Status": "$status",
              "Deployment Timestamp": { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            }
          },
          { $sort: { "Company Entity Name": 1 } }
        ]);
        break;

      // 🎟️ 5. Support Ticket Report
      case "support":
        const tickets = await Ticket.find(dateFilter)
          .populate({
            path: 'employeeId',
            select: 'name company companyName',
            populate: {
              path: 'company',
              select: 'companyName'
            }
          })
          .sort({ createdAt: -1 });

        reportData = tickets.map(t => {
          let companyName = "Unknown";
          if (t.employeeModel === 'Admin' && t.employeeId) {
            companyName = t.employeeId.companyName || "Unknown";
          } else if (t.employeeModel === 'Employee' && t.employeeId && t.employeeId.company) {
            companyName = t.employeeId.company.companyName || "Unknown";
          }
          return {
            "Company Name": companyName,
            "Problem": t.subject,
            "Priority": t.priority || "Medium",
            "Status": t.status,
            "Date Created": t.createdAt.toISOString().split('T')[0]
          };
        });
        break;

      // 🛠️ 6. HR Module Usage Report
      case "hr_usage":
        reportData = await Admin.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$companyType",
              "Total Infrastructure Adapters": { $sum: 1 },
              "Average Scale Matrix Size": { $avg: { $cond: [{ $eq: ["$companySizeRange", "501+"]}, 500, 50] } } 
            }
          },
          { $project: { _id: 0, "Corporate Tier Classification": "$_id", "Total Infrastructure Adapters": 1, "Estimated Employee Footprint": { $round: ["$Average Scale Matrix Size", 0] } } }
        ]);
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid system report request signature." });
    }

    res.status(200).json({ success: true, type, data: reportData });
  } catch (error) {
    console.error("Report Engine Error:", error);
    res.status(500).json({ success: false, message: "Error compiling platform analytical data logs." });
  }
};

exports.scheduleReport = async (req, res) => {
    try {
        const { reportType, frequency, recipients, format } = req.body;
        
        // 🛡️ Data Exfiltration Security: Ensure recipients are actually Super Admins
        const parsedRecipients = recipients.split(',').map(e => e.trim());
        const SuperAdmin = require('../models/Superadmin');
        const validAdmins = await SuperAdmin.find({ email: { $in: parsedRecipients } });
        
        if (validAdmins.length !== parsedRecipients.length) {
            return res.status(403).json({ 
                success: false, 
                message: "Security Gateway Blocked Request: Reports can only be scheduled for registered Super Admin email addresses." 
            });
        }

        // Calculate initial nextRunAt
        const nextRunAt = new Date();
        if (frequency === 'daily') nextRunAt.setDate(nextRunAt.getDate() + 1);
        else if (frequency === 'weekly') nextRunAt.setDate(nextRunAt.getDate() + 7);
        else if (frequency === 'monthly') nextRunAt.setDate(nextRunAt.getDate() + 30);

        const newJob = await ScheduledReport.create({
            reportType,
            frequency,
            recipients: parsedRecipients,
            format,
            nextRunAt
        });

        res.status(201).json({ success: true, message: "Report schedule activated", data: newJob });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to schedule report" });
    }
};

exports.getScheduledReports = async (req, res) => {
    try {
        const jobs = await ScheduledReport.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch scheduled jobs" });
    }
};