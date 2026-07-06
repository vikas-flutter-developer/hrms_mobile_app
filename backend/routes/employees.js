const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csvtojson');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Import centralized database module models
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');
const Department = require('../models/Department');
const Superadmin = require('../models/Superadmin');


// 🔄 NEW: Import Attendance and Leave models for the Insights route
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Announcement = require('../models/Announcement');

// Import your global verification middleware
const verifyToken = require('../middleware/auth');
const checkPermission = require('../middleware/rbac');

// ==========================================
// 📂 MULTER BINARY FILE STORAGE ARCHITECTURE
// ==========================================
// Guarantee target static allocation directory exists on disk layout
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Enforce file identity tracking structure: timestamp-field-original
    cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);
  }
});

// Structural validator filtering layout parameters
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type format extension. Only PDF document uploads are permitted.'), false);
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  } // Strict 5 Megabyte constraint threshold
});

// Declare specific named keys matching React form data states
const onboardingUploads = upload.fields([{
  name: 'resume',
  maxCount: 1
}, {
  name: 'panCard',
  maxCount: 1
}, {
  name: 'aadhaarCard',
  maxCount: 1
}]);

const profileDocumentUploads = upload.fields([{
  name: 'panCard',
  maxCount: 1
}, {
  name: 'aadhaarCard',
  maxCount: 1
}]);

// Helper to handle Multer asynchronously==========================================
// 📋 1. GET: Fetch All Employee Records
// ==========================================
// Base Path: GET http://localhost:5000/api/employees
router.get('/', verifyToken, async (req, res) => {
  try {
    const records = await Employee.find({
      company: req.user.company,
      status: { $ne: 'Archived' }
    }, '-password').sort({ name: 1 });
    res.json(records);
  } catch (err) {
    console.error("Database fetch error:", err);
    res.status(500).json({
      message: "Error parsing database records"
    });
  }
});

router.get('/my-team', verifyToken, async (req, res) => {
  try {
    const records = await Employee.find({
      company: req.user.company,
      status: { $ne: 'Archived' }
    }, '-password').sort({ name: 1 });
    res.json(records);
  } catch (err) {
    console.error("Database fetch error:", err);
    res.status(500).json({
      message: "Error parsing database records"
    });
  }
});

// ==========================================
// 👑 2. GET: Team Leaders Options Pool
// ==========================================
// Base Path: GET http://localhost:5000/api/employees/team-leaders?department=Sales
router.get('/team-leaders', verifyToken, async (req, res) => {
  try {
    const { department } = req.query;

    const query = {
      company: req.user.company,
      positionLevel: { $regex: /team.?lead/i },
      status: { $ne: 'Inactive' }
    };

    // If a department is specified, only return leaders from that dept
    if (department && department.trim() !== '') {
      query.department = { $regex: new RegExp(`^${department.trim()}$`, 'i') };
    }

    const leaders = await Employee.find(query, '_id name empId role department positionLevel');
    res.status(200).json(leaders);
  } catch (err) {
    console.error("Team leader mapping sync failure:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 🚀 3. POST: Collision-Free Sequential Onboarding
// ==========================================
// Base Path: POST http://localhost:5000/api/employees/create-employee
// Wrap multer to gracefully handle and forward errors
const handleUploads = (req, res, next) => {
  onboardingUploads(req, res, function (err) {
    if (err) {
      console.error("Multer Error:", err);
      return res.status(400).json({ message: "File Upload Error: " + err.message });
    }
    next();
  });
};

router.post('/create-employee', verifyToken, checkPermission('manage_employees'), handleUploads, async (req, res) => {
  const {
    name,
    gender,
    dob,
    email,
    password,
    role,
    department,
    phone,
    address,
    previousCompany,
    previousRole,
    yearsOfExperience,
    assignedLeader,
    positionLevel,
    baseSalary,
    incrementPercentage,
    joinDate,
    probationEndDate,
    skills,     // ✅ NEW: Extract skills
    education,   // ✅ NEW: Extract education
    shift       // ✅ NEW: Extract shift
  } = req.body;
  try {
    // 🛡️ SECURITY STEP 1: Safeguard token payload recovery
    if (!req.user) {
      return res.status(401).json({
        message: "Access Denied: User context token payload is missing."
      });
    }

    // Standardize strings to lowercase to prevent evaluation bypass tricks
    const requestorRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
    const targetRole = role ? role.toLowerCase() : 'employee';

    // 🛡️ SECURITY STEP 2: Restrict HR from escalating roles to Admin or higher
    if (requestorRole === 'hr' && targetRole !== 'employee' && targetRole !== 'hr') {
      return res.status(403).json({
        message: "HR users are strictly restricted to creating 'employee' or 'hr' profiles only."
      });
    }

    // Prevent standard employees from hitting this endpoint if they try to bypass frontend guards
    if (requestorRole !== 'admin' && requestorRole !== 'hr') {
      return res.status(403).json({
        message: "Access Denied: Unauthorized account role permissions."
      });
    }
    let existingEmployee = await Employee.findOne({
      company: req.user.company,
      email: email.trim().toLowerCase()
    });
    if (existingEmployee) {
      return res.status(400).json({
        message: "A worker with this email already exists"
      });
    }

    // STRICT SUBSCRIPTION QUOTA CHECK
    const companyProfile = await Admin.findById(req.user.company);
    if (companyProfile) {
      const activeEmployeeCount = await Employee.countDocuments({ company: req.user.company, status: { $ne: 'Archived' } });
      const maxAllowed = companyProfile.employeeQuotaTarget || 10;
      if (activeEmployeeCount >= maxAllowed) {
        return res.status(403).json({
           message: `Subscription Limit Reached! Your company is currently limited to ${maxAllowed} employees. Please upgrade your Subscription Plan to onboard more staff.`
        });
      }
    }

    // STRICT DEPARTMENT CAPACITY CHECK
    if (department) {
      const targetDepartment = await Department.findOne({
        company: req.user.company,
        name: department
      });
      if (targetDepartment) {
        const currentCount = await Employee.countDocuments({
          company: req.user.company,
          department: department,
          status: 'Active'
        });
        if (currentCount >= targetDepartment.capacity) {
          return res.status(400).json({
            message: `Department capacity reached! The ${department} department is limited to a maximum of ${targetDepartment.capacity} staff.`
          });
        }
      } else {
        return res.status(400).json({
          message: `Invalid department selected.`
        });
      }
    }

    // Generate custom sequential Employee IDs
    const currentYear = new Date().getFullYear();
    const yearPrefix = `EMP-${currentYear}-`;
    const employeesThisYear = await Employee.find({
      company: req.user.company,
      empId: new RegExp(`^${yearPrefix}`)
    }, {
      empId: 1
    });
    let nextSequenceNum = 1;
    if (employeesThisYear && employeesThisYear.length > 0) {
      const parsedSequenceNumbers = employeesThisYear.map(emp => {
        const parts = emp.empId.split('-');
        const sequenceTokenAsInt = parseInt(parts[2], 10);
        return isNaN(sequenceTokenAsInt) ? 0 : sequenceTokenAsInt;
      });
      nextSequenceNum = Math.max(...parsedSequenceNumbers) + 1;
    }

    // Safety check loop to ensure absolute uniqueness (prevents E11000 duplicate key error)
    let finalEmpId;
    let isUnique = false;
    while (!isUnique) {
      const paddedSequence = String(nextSequenceNum).padStart(4, '0');
      finalEmpId = `${yearPrefix}${paddedSequence}`;
      const duplicateCheck = await Employee.findOne({ company: req.user.company, empId: finalEmpId });
      if (duplicateCheck) {
        nextSequenceNum++;
      } else {
        isUnique = true;
      }
    }
    const { validatePasswordPolicy } = require('../utils/passwordPolicy');
    await validatePasswordPolicy(password.trim());

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    // Extract individual path keys from multi-file req.files object matrix safely
    const resumePath = req.files && req.files['resume'] ? req.files['resume'][0].filename : "";
    const panPath = req.files && req.files['panCard'] ? req.files['panCard'][0].filename : "";
    const aadhaarPath = req.files && req.files['aadhaarCard'] ? req.files['aadhaarCard'][0].filename : "";

    // Calculate Salaries
    let finalBaseSalary = Number(baseSalary) || 60000;
    let finalSalary = finalBaseSalary;
    if (positionLevel === 'Team Leader' && incrementPercentage) {
      const inc = Number(incrementPercentage);
      if (inc > 0) {
        finalSalary = finalBaseSalary + finalBaseSalary * inc / 100;
      }
    }

    // ✅ NEW: Parse Skills (String to Array)
    let formattedSkills = [];
    if (skills && typeof skills === 'string') {
        formattedSkills = skills.split(',').map(skill => skill.trim()).filter(skill => skill !== "");
    } else if (Array.isArray(skills)) {
        formattedSkills = skills;
    }

    // ✅ NEW: Parse Education (Multiline String to Array of Objects)
    let formattedEducation = [];
    if (education && typeof education === 'string') {
        formattedEducation = education.split('\n').filter(line => line.trim() !== "").map(line => {
            const [degree, institution, year] = line.split('|').map(item => item ? item.trim() : "");
            return { degree, institution, year };
        });
    } else if (Array.isArray(education)) {
        formattedEducation = education;
    }

    // Build core document structure safely
    const newWorkerData = {
      empId: finalEmpId,
      name,
      gender,
      dob: dob ? new Date(dob) : null,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      department,
      positionLevel: positionLevel || 'Member',
      phone,
      address,
      previousCompany: previousCompany || 'None',
      previousRole: previousRole || 'None',
      yearsOfExperience: yearsOfExperience || '0 Years',
      assignedLeader: assignedLeader || null,
      baseSalary: finalBaseSalary,
      incrementPercentage: Number(incrementPercentage) || 0,
      finalSalary: finalSalary,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      probationEndDate: probationEndDate ? new Date(probationEndDate) : new Date(),
      createdBy: req.user.id,
      shift: shift || null,            // ✅ NEW: Add shift
      skills: formattedSkills,         // ✅ NEW: Add parsed skills array
      education: formattedEducation,   // ✅ NEW: Add parsed education array
      // 📂 Map dynamic upload paths to schema parameters
      resume: resumePath,
      panCard: panPath,
      aadhaarCard: aadhaarPath,
      company: req.user.company // 🏢 CRITICAL MULTI-TENANCY INJECTION
    };

    // 🔗 CONDITIONALLY ASSIGN RELATIONAL RELATIONSHIP
    if (requestorRole === 'admin') {
      newWorkerData.Admin = req.user.id;
    }
    const newWorker = new Employee(newWorkerData);
    await newWorker.save();

    // 💾 CONDITIONALLY UPDATE ADMIN LEDGER INDEX
    if (requestorRole === 'admin') {
      await Admin.findByIdAndUpdate(req.user.id, {
        $push: {
          Employee: newWorker._id
        }
      });
    }
    res.status(201).json({
      message: `${targetRole.toUpperCase()} account onboarded successfully with ID: ${finalEmpId}`,
      empId: finalEmpId
    });
  } catch (err) {
    console.error("Error inside onboarding process controller:", err);
    res.status(500).json({
      message: "Server error: " + err.message
    });
  }
});

// ==========================================
// 👤 4. GET: FETCH PROFILE FOR SELF-LOGGED USER
// ==========================================
// Base Path: GET http://localhost:5000/api/employees/profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userRole = req.user && req.user.role ? req.user.role.toLowerCase() : 'employee';
    let userRecord = null;

    // Dynamic lookup depending on whether the user is an Admin, Superadmin, or an Employee/HR
    if (userRole === 'admin') {
      userRecord = await Admin.findById(req.user.id).select('-password').lean();
      if (userRecord) {
        userRecord.role = 'admin';
      }
    } else if (userRole === 'superadmin') {
      userRecord = await Superadmin.findById(req.user.id).select('-password').lean();
      if (userRecord) {
        userRecord.role = 'superadmin';
      }
    } else {
      // This safely pulls both standard employees AND HR personnel profiles with company info
      userRecord = await Employee.findById(req.user.id).select('-password').populate('shift').populate('company');
    }
    if (!userRecord) {
      return res.status(404).json({
        message: "User document identity record not found."
      });
    }
    res.status(200).json(userRecord);
  } catch (err) {
    console.error("Profile dynamic recovery drop:", err);
    res.status(500).json({
      message: "Internal runtime error locating worker ledger profiles."
    });
  }
});

// ==========================================
// 👤 5. PUT: UPDATE PROFILE BY WORKER ACTION
// ==========================================
// Base Path: PUT http://localhost:5000/api/employees/profile
router.put('/profile', verifyToken, async (req, res) => {
  const {
    phone,
    address,
    department,
    previousCompany,
    previousRole,
    yearsOfExperience,
    bankName,
    accountNumber,
    profilePhoto,
    emergencyContactName,
    emergencyContactRelation,
    emergencyContactPhone,
    skills,
    education
  } = req.body;
  try {
    const userRole = req.user && req.user.role ? req.user.role.toLowerCase() : 'employee';
    let updatedUser = null;
    const updatePayload = {};
    
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (address !== undefined) updatePayload.address = address.trim();
    if (department !== undefined && department !== "") updatePayload.department = department.trim();
    if (previousCompany !== undefined) updatePayload.previousCompany = previousCompany.trim();
    if (previousRole !== undefined) updatePayload.previousRole = previousRole.trim();
    if (yearsOfExperience !== undefined) updatePayload.yearsOfExperience = yearsOfExperience.trim();
    if (profilePhoto !== undefined) updatePayload.profilePhoto = profilePhoto;
    if (emergencyContactName !== undefined) updatePayload.emergencyContactName = emergencyContactName.trim();
    if (emergencyContactRelation !== undefined) updatePayload.emergencyContactRelation = emergencyContactRelation.trim();
    if (emergencyContactPhone !== undefined) updatePayload.emergencyContactPhone = emergencyContactPhone.trim();
    if (skills !== undefined) {
      if (typeof skills === 'string') {
        updatePayload.skills = skills.split(",").map(s => s.trim()).filter(s => s !== "");
      } else if (Array.isArray(skills)) {
        updatePayload.skills = skills;
      }
    }
    if (education !== undefined) {
      if (typeof education === 'string') {
        updatePayload.education = education.split("\n").filter(e => e.trim() !== "").map(line => {
          const parts = line.split("|").map(p => p.trim());
          return { degree: parts[0] || "", institution: parts[1] || "", year: parts[2] || "" };
        });
      } else if (Array.isArray(education)) {
        updatePayload.education = education;
      }
    }

    if (userRole === 'admin') {
      updatedUser = await Admin.findByIdAndUpdate(req.user.id, {
        $set: updatePayload
      }, {
        returnDocument: 'after',
        runValidators: true
      }).select('-password');
    } else {
      // Employees and HR personnel can update their profile specs safely.
      // Check if accountNumber is already set to prevent overwrite
      const existingUser = await Employee.findById(req.user.id);
      if (existingUser && !existingUser.accountNumber) {
         if (bankName) updatePayload.bankName = bankName.trim();
         if (accountNumber) updatePayload.accountNumber = accountNumber.trim();
      }

      updatedUser = await Employee.findByIdAndUpdate(req.user.id, {
        $set: updatePayload
      }, {
        returnDocument: 'after',
        runValidators: true
      }).select('-password');
    }
    if (!updatedUser) {
      return res.status(404).json({
        message: "Personnel workspace record is missing."
      });
    }
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("User self-mutation write transaction failure:", err);
    res.status(500).json({
      message: "Internal server fault committing changes down to database layer."
    });
  }
});

// ==========================================
// 5B. PUT: UPDATE PROFILE DOCUMENTS
// ==========================================
router.put('/profile/documents', verifyToken, (req, res, next) => {
  profileDocumentUploads(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: "File Upload Error: " + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).populate('company');
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    let updatedFields = [];
    if (req.files && req.files['panCard'] && req.files['panCard'].length > 0) {
      employee.panCard = req.files['panCard'][0].filename;
      updatedFields.push('PAN PDF');
    }
    if (req.files && req.files['aadhaarCard'] && req.files['aadhaarCard'].length > 0) {
      employee.aadhaarCard = req.files['aadhaarCard'][0].filename;
      updatedFields.push('Aadhaar PDF');
    }

    if (updatedFields.length > 0) {
      await employee.save();

      // Create notification for HR/Admin
      const Announcement = require('../models/Announcement');
      await Announcement.create({
        company: employee.company._id,
        title: "Employee Document Update",
        message: `${updatedFields.join(' and ')} reuploaded by ${employee.name} (${employee.empId}).`,
        targetAudience: 'Specific Users',
        targetRoles: ['admin', 'hr'], // Custom field if Announcement schema supports it, or we can just send to All Admins
        createdBy: employee.company._id
      });
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error("Document update error:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

// ==========================================
// 🔍 6. GET: FETCH SPECIFIC EMPLOYEE INSIGHTS (NEW FEATURE)
// ==========================================
// Base Path: GET http://localhost:5000/api/employees/:id/insights
router.get('/:id/insights', verifyToken, async (req, res) => {
  try {
    const empId = req.params.id; // This is the MongoDB _id of the employee

    // 1. Fetch last 10 attendance records for the drawer
    const attendance = await Attendance.find({
      company: req.user.company,
      employeeId: empId
    }).sort({
      date: -1
    }).limit(10);

    // 2. Fetch all leave history for this person
    const leaves = await Leave.find({
      company: req.user.company,
      employeeId: empId
    }).sort({
      createdAt: -1
    });
    res.status(200).json({
      attendance,
      leaves
    });
  } catch (err) {
    console.error("Error fetching insights:", err);
    res.status(500).json({
      message: "Error fetching employee history."
    });
  }
});
// ==========================================
// 🚀 6.3. PUT: TRANSFER EMPLOYEE
// ==========================================// 🔄 TRANSFER EMPLOYEE
router.put('/:id/transfer', verifyToken, checkPermission('manage_employees'), async (req, res) => {
  try {
    const { newDepartment, newWorkLocation, effectiveDate, notes } = req.body;
    const requestorRole = req.user && req.user.role ? req.user.role.toLowerCase() : 'employee';
    if (requestorRole !== 'admin' && requestorRole !== 'hr') {
      return res.status(403).json({ message: "Access Denied." });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const previousDepartment = employee.department;

    employee.department = newDepartment || employee.department;
    employee.workLocation = newWorkLocation || employee.workLocation;
    
    employee.jobHistory.push({
      eventType: 'Transfer',
      date: effectiveDate ? new Date(effectiveDate) : new Date(),
      previousDepartment,
      newDepartment: employee.department,
      newWorkLocation: employee.workLocation,
      notes,
      processedBy: req.user.id
    });

    await employee.save();
    res.status(200).json(employee);
  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).json({ message: "Error transferring employee." });
  }
});

// ==========================================
// 🚀 6.4. PUT: PROMOTE EMPLOYEE
// ==========================================// 📈 PROMOTE EMPLOYEE
router.put('/:id/promote', verifyToken, checkPermission('manage_employees'), async (req, res) => {
  try {
    const { newRole, newSalary, effectiveDate, notes } = req.body;
    const requestorRole = req.user && req.user.role ? req.user.role.toLowerCase() : 'employee';
    if (requestorRole !== 'admin' && requestorRole !== 'hr') {
      return res.status(403).json({ message: "Access Denied." });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const previousRole = employee.positionLevel;
    const previousSalary = employee.salary;

    employee.positionLevel = newRole || employee.positionLevel;
    if (newSalary) {
      employee.salary = newSalary;
      employee.baseSalary = newSalary;
      employee.salaryHistory.push({
        date: effectiveDate ? new Date(effectiveDate) : new Date(),
        previousSalary,
        newSalary,
        reason: 'Promotion',
        processedBy: req.user.id
      });
    }

    employee.jobHistory.push({
      eventType: 'Promotion',
      date: effectiveDate ? new Date(effectiveDate) : new Date(),
      previousRole,
      newRole: employee.positionLevel,
      newSalary: employee.salary,
      notes,
      processedBy: req.user.id
    });

    await employee.save();
    res.status(200).json(employee);
  } catch (err) {
    console.error("Promote error:", err);
    res.status(500).json({ message: "Error promoting employee." });
  }
});

// ==========================================
// 🚀 6.5. PUT: OFFBOARD EMPLOYEE
// ==========================================// ❌ OFFBOARD EMPLOYEE
router.put('/:id/offboard', verifyToken, checkPermission('manage_employees'), async (req, res) => {
  try {
    const { exitDate, exitReason, exitNotes, exitInterviewNotes, initiateFnf } = req.body;
    
    // Prevent unauthorized access
    const requestorRole = req.user && req.user.role ? req.user.role.toLowerCase() : 'employee';
    if (requestorRole !== 'admin' && requestorRole !== 'hr') {
      return res.status(403).json({ message: "Access Denied: Insufficient authorization permissions." });
    }

    const employee = await Employee.findByIdAndUpdate(req.params.id, {
      $set: {
        status: 'Offboarded',
        exitDate: exitDate ? new Date(exitDate) : new Date(),
        exitReason: exitReason,
        exitNotes: exitNotes,
        exitInterviewNotes: exitInterviewNotes,
        fnfSettlementStatus: initiateFnf ? 'Pending' : 'Processed',
        archivedAt: new Date() // Keeping this so TTL index deletes them eventually if desired, or just for record
      }
    }, { new: true });

    if (!employee) return res.status(404).json({ message: "Employee not found." });

    // Send Notification to HR/Admin
    const adminId = req.user.id || req.user.company;
    try {
      await Announcement.create({
        company: req.user.company,
        title: 'Employee Offboarded & Exit Interview Logged',
        message: `${employee.name} (${employee.empId}) has been offboarded. Reason: ${exitReason}. ${initiateFnf ? 'FnF Settlement pending.' : ''}`,
        targetAudience: 'Specific Users',
        targetUsers: [employee._id], // HR can see it via roles
        targetRoles: ['hr'],
        createdBy: adminId
      });
    } catch (announcementErr) {
      console.error('Error creating offboard announcement:', announcementErr);
    }

    res.status(200).json(employee);
  } catch (err) {
    console.error("Offboard error:", err);
    res.status(500).json({ message: "Error offboarding employee." });
  }
});

// ==========================================
// 🔄 7. PATCH / PUT: UPDATE SPECIFIC EMPLOYEE
// ==========================================
// PUT alias — frontend EmployeesTab sends PUT when editing employee details
// PUT /:id — alias for PATCH, used by EmployeesTab// PUT update employee (full update)
router.put('/:id', verifyToken, checkPermission('manage_employees'), async (req, res) => {
  try {
    const requestorRole = req.user && req.user.role ? req.user.role.toLowerCase() : 'employee';
    if (requestorRole !== 'admin' && requestorRole !== 'hr') {
      return res.status(403).json({ message: "Access Denied: Insufficient authorization permissions." });
    }

    const updateData = { ...req.body };

    if (updateData.skills && typeof updateData.skills === 'string') {
      updateData.skills = updateData.skills.split(',').map(s => s.trim()).filter(s => s !== '');
    }
    if (updateData.education && typeof updateData.education === 'string') {
      updateData.education = updateData.education.split('\n').filter(l => l.trim()).map(line => {
        const [degree, institution, year] = line.split('|').map(i => i ? i.trim() : '');
        return { degree, institution, year };
      });
    }
    if (updateData.status === 'Archived') {
      updateData.archivedAt = new Date();
    } else if (updateData.status === 'Active' || updateData.status === 'Inactive') {
      updateData.archivedAt = null;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) return res.status(404).json({ message: "Employee not found." });
    res.status(200).json(updatedEmployee);
  } catch (err) {
    console.error("Error updating employee (PUT):", err);
    res.status(500).json({ message: "Error updating employee record." });
  }
});

router.patch('/:id', verifyToken, checkPermission('manage_employees'), async (req, res) => {
  try {
    const requestorRole = req.user && req.user.role ? req.user.role.toLowerCase() : 'employee';
    if (requestorRole !== 'admin' && requestorRole !== 'hr') {
      return res.status(403).json({
        message: "Access Denied: Insufficient authorization permissions."
      });
    }
    
    const updateData = {
      ...req.body
    };

    // ✅ NEW: Parse Skills for Patch Update
    if (updateData.skills && typeof updateData.skills === 'string') {
        updateData.skills = updateData.skills.split(',').map(s => s.trim()).filter(s => s !== "");
    }

    // ✅ NEW: Parse Education for Patch Update
    if (updateData.education && typeof updateData.education === 'string') {
        updateData.education = updateData.education.split('\n').filter(line => line.trim() !== "").map(line => {
            const [degree, institution, year] = line.split('|').map(item => item ? item.trim() : "");
            return { degree, institution, year };
        });
    }

    if (updateData.status === 'Archived') {
      updateData.archivedAt = new Date();
    } else if (updateData.status === 'Active' || updateData.status === 'Inactive') {
      updateData.archivedAt = null;
    }
    
    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, {
      $set: updateData
    }, {
      new: true,
      runValidators: true
    });

    if (updateData.status === 'Archived') {
      try {
        const adminId = req.user.id || req.user._id || req.user.company; // fallback to company if id missing
        await Announcement.create({
          company: req.user.company,
          title: 'Profile Archived Notice',
          message: `The profile for ${updatedEmployee.name} has been archived and will be permanently deleted in 24 hours.`,
          targetAudience: 'Specific Users',
          targetUsers: [updatedEmployee._id],
          targetRoles: ['hr'],
          createdBy: adminId
        });
      } catch (announcementErr) {
        console.error('Error creating archive announcement:', announcementErr);
      }
    }
    if (!updatedEmployee) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }
    res.status(200).json(updatedEmployee);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({
      message: "Error updating employee record."
    });
  }
});

// ==========================================
// 📥 8. GET: BULK EXPORT EMPLOYEES TO CSV
// ==========================================
router.get('/bulk-export', verifyToken, async (req, res) => {
  try {
    const employees = await Employee.find({
      company: req.user.company
    }, '-password');
    if (employees.length === 0) {
      return res.status(404).json({
        message: "No employees to export"
      });
    }
    const headers = ['empId', 'name', 'email', 'role', 'department', 'status', 'positionLevel', 'baseSalary'];
    const rows = employees.map(emp => {
      return [emp.empId, emp.name, emp.email, emp.role, emp.department, emp.status, emp.positionLevel || '', emp.baseSalary || ''].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employees.csv');
    res.status(200).send(csv);
  } catch (err) {
    console.error("Bulk export error:", err);
    res.status(500).json({
      message: "Error exporting data"
    });
  }
});

// ==========================================
// 📤 9. POST: BULK IMPORT EMPLOYEES FROM CSV
// ==========================================// POST Bulk Import via CSV
router.post('/bulk-import', verifyToken, checkPermission('manage_employees'), async (req, res) => {
  try {
    const {
      employees
    } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({
        message: "Invalid payload format"
      });
    }
    let successCount = 0;
    let errorCount = 0;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('TempPassword123!', salt);
    for (const emp of employees) {
      try {
        if (!emp.email || !emp.name) {
          errorCount++;
          continue;
        }
        const existing = await Employee.findOne({
          company: req.user ? req.user.company : null,
          email: emp.email
        });
        if (existing) {
          errorCount++;
          continue;
        }
        const newEmp = new Employee({
          empId: emp.empId || `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: emp.name,
          email: emp.email,
          role: emp.role || 'employee',
          department: emp.department || 'General',
          status: emp.status || 'Active',
          positionLevel: emp.positionLevel || 'Team Member',
          baseSalary: emp.baseSalary || 0,
          password: hashedPassword,
          age: emp.age || 25,
          gender: emp.gender || 'Not Specified',
          company: req.user ? req.user.company : null
        });
        await newEmp.save();
        successCount++;
      } catch (e) {
        errorCount++;
      }
    }
    res.status(200).json({
      message: `Import complete. Success: ${successCount}, Failed/Skipped: ${errorCount}`
    });
  } catch (err) {
    console.error("Bulk import error:", err);
    res.status(500).json({
      message: "Error importing data"
    });
  }
});

// ==========================================
// 📄 10. POST: GENERATE PDF DOCUMENTS
// ==========================================
router.post('/generate-document', verifyToken, async (req, res) => {
    try {
        const { empId, docType } = req.body;
        const employee = await Employee.findById(empId);
        if (!employee) return res.status(404).json({ message: "Employee not found." });

        const admin = await Admin.findById(employee.company);
        if (!admin) return res.status(404).json({ message: "Company admin details not found." });

        let doc;
        if (docType === 'ID Card') {
            doc = new PDFDocument({ size: [252, 144], margin: 0 });
        } else {
            doc = new PDFDocument({ margin: 50, size: 'A4' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${docType.replace(/\s+/g, '_')}_${employee.empId}.pdf`);

        doc.pipe(res);

        const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
        const currentDate = formatDate(new Date());

        // ─── Reusable: Draw company letterhead (logo + contact info + red divider) ───
        const drawHeader = (pdf, adminObj, showRedBorder = false) => {
            if (showRedBorder) {
                pdf.rect(15, 15, pdf.page.width - 30, pdf.page.height - 30)
                   .lineWidth(10).stroke('#e63946');
            }

            // Company Logo (from DB — base64)
            if (adminObj.companyLogo && adminObj.companyLogo.startsWith('data:image')) {
                try { pdf.image(adminObj.companyLogo, 50, 35, { width: 140, height: 60, fit: [140, 60] }); }
                catch(e) { /* fall through to text fallback */ }
            } else {
                const parts = (adminObj.companyName || 'Company').split(' ');
                pdf.fontSize(22).fillColor('#e63946').font('Helvetica-Bold').text(parts[0] || '', 50, 38);
                if (parts.length > 1) {
                    pdf.fontSize(14).fillColor('#1e1b4b').font('Helvetica').text(parts.slice(1).join(' '), 50, 62);
                }
            }

            // Right-aligned contact info
            pdf.fontSize(9).fillColor('#64748b').font('Helvetica')
               .text(`📞 +91-${adminObj.phone || '0000000000'}`, 0, 38, { align: 'right', width: pdf.page.width - 50 })
               .text(adminObj.website || 'www.company.com', { align: 'right' })
               .text(adminObj.email || 'hr@company.com', { align: 'right' })
               .text(`Office: ${adminObj.branchLocation || 'Headquarters'}`, { align: 'right' })
               .text(`CIN: ${adminObj.registrationNumber || 'N/A'}`, { align: 'right' });

            // Red divider line
            pdf.moveTo(50, 108).lineTo(pdf.page.width - 50, 108).lineWidth(1.5).stroke('#e63946');
        };

        // ─── Reusable: Draw CEO signature block (image from DB + name + title) ───
        const drawSignature = (pdf, adminObj, startY) => {
            const sigX = pdf.page.width - 215;
            const sigW = 165;

            // Signature image (drawn from DB base64)
            if (adminObj.signature && adminObj.signature.startsWith('data:image')) {
                try { pdf.image(adminObj.signature, sigX, startY, { width: sigW, height: 55, fit: [sigW, 55] }); }
                catch(e) {}
            }

            // Signature underline
            const lineY = startY + 60;
            pdf.moveTo(sigX, lineY).lineTo(sigX + sigW, lineY).lineWidth(0.75).stroke('#94a3b8');

            // CEO Name (from DB)
            pdf.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold')
               .text(adminObj.name || 'Authorized Signatory', sigX, lineY + 5, { width: sigW });
            pdf.fontSize(9).fillColor('#64748b').font('Helvetica')
               .text('Director & Founder', sigX, lineY + 19, { width: sigW })
               .text(adminObj.companyName || '', sigX, lineY + 31, { width: sigW });
        };

        // ════════════════════════════════════════
        //  📄  OFFER LETTER
        // ════════════════════════════════════════
        if (docType === 'Offer Letter') {
            drawHeader(doc, admin, true);

            doc.fontSize(11).fillColor('#334155').font('Helvetica')
               .text(`DATE: ${currentDate}`, 0, 125, { align: 'right', width: doc.page.width - 50 });

            doc.font('Helvetica-Oblique').fontSize(12).fillColor('#1e1b4b')
               .text('To Whomsoever It May Concern', 50, 162, { align: 'center', width: doc.page.width - 100 });

            doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a')
               .text(`Dear ${employee.name},`, 50, 202);
            doc.text('Congratulations!!', 50, 224);

            const empType = (employee.employmentType || '').toLowerCase().includes('intern') ? 'internship' : 'employment';

            doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
               .text(`We are delighted to offer you an ${empType} with us as a `, 50, 258, { continued: true, lineGap: 5 })
               .font('Helvetica-Bold').text(`${employee.positionLevel || employee.role || 'Professional'}`, { continued: true })
               .font('Helvetica').text(` in the `, { continued: true })
               .font('Helvetica-Bold').text(`${employee.department || 'department'}`, { continued: true })
               .font('Helvetica').text(` department, and you will be located at our `, { continued: true })
               .font('Helvetica-Bold').text(`${admin.branchLocation || 'Head'}`, { continued: true })
               .font('Helvetica').text(` branch office. Your ${empType} period will start from `, { continued: true })
               .font('Helvetica-Bold').text(`${formatDate(employee.joinDate)}`, { continued: true })
               .font('Helvetica').text(`.`);

            doc.fontSize(11).fillColor('#1e293b').font('Helvetica')
               .text(`All terms and conditions of your ${empType} shall be as per the ${admin.companyName} Employee Policy. You are expected to adhere to the company's Code of Conduct, policies, and procedures as detailed in the Employee Handbook provided at the time of joining.`, 50, 340, { lineGap: 5 });

            doc.text(`We are excited at the prospect of having you join us and look forward to a rewarding and fruitful association.`, 50, 430, { lineGap: 5 });

            doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Warm Regards,', 50, 508);
            drawSignature(doc, admin, 524);

        // ════════════════════════════════════════
        //  📜  EXPERIENCE LETTER
        // ════════════════════════════════════════
        } else if (docType === 'Experience Letter') {
            drawHeader(doc, admin, false);

            doc.fontSize(11).fillColor('#334155').font('Helvetica')
               .text(`DATE: ${currentDate}`, 0, 125, { align: 'right', width: doc.page.width - 50 });

            doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e1b4b')
               .text('TO WHOMSOEVER IT MAY CONCERN', 50, 168, { align: 'center', width: doc.page.width - 100 });

            doc.moveTo(50, 192).lineTo(doc.page.width - 50, 192).lineWidth(0.5).stroke('#cbd5e1');

            doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
               .text(`This is to certify that `, 50, 212, { continued: true, lineGap: 5 })
               .font('Helvetica-Bold').text(`${employee.name}`, { continued: true })
               .font('Helvetica').text(` (Employee ID: `, { continued: true })
               .font('Helvetica-Bold').text(`${employee.empId}`, { continued: true })
               .font('Helvetica').text(`) was employed with `, { continued: true })
               .font('Helvetica-Bold').text(`${admin.companyName}`, { continued: true })
               .font('Helvetica').text(` as a `, { continued: true })
               .font('Helvetica-Bold').text(`${employee.positionLevel || employee.role}`, { continued: true })
               .font('Helvetica').text(` in the `, { continued: true })
               .font('Helvetica-Bold').text(`${employee.department}`, { continued: true })
               .font('Helvetica').text(` department.`);

            doc.text(`Their tenure with the company spanned from ${formatDate(employee.joinDate)} to ${currentDate}. During this period, they consistently demonstrated professionalism, dedication, and commitment to excellence.`, 50, 288, { lineGap: 5 });

            doc.text(`We found ${employee.name} to be a responsible, diligent, and reliable team member who contributed meaningfully to the growth and success of the organization. They maintained excellent professional standards and worked collaboratively with colleagues across departments.`, 50, 358, { lineGap: 5 });

            doc.text(`We wish them all the very best in their future endeavors and professional journey.`, 50, 438);

            drawSignature(doc, admin, 488);

        // ════════════════════════════════════════
        //  🚪  RELIEVING LETTER
        // ════════════════════════════════════════
        } else if (docType === 'Relieving Letter') {
            drawHeader(doc, admin, false);

            doc.fontSize(11).fillColor('#334155').font('Helvetica')
               .text(`DATE: ${currentDate}`, 0, 125, { align: 'right', width: doc.page.width - 50 });

            doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
               .text(`To,`, 50, 162)
               .font('Helvetica-Bold').text(employee.name, 50, 176)
               .font('Helvetica').text(`Emp ID: ${employee.empId}`, 50, 190)
               .text(`${employee.department} Department, ${admin.companyName}`, 50, 204);

            doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e1b4b')
               .text('Subject: Relieving Letter', 50, 240, { align: 'center', width: doc.page.width - 100, underline: true });

            doc.moveTo(50, 264).lineTo(doc.page.width - 50, 264).lineWidth(0.5).stroke('#cbd5e1');

            doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`Dear ${employee.name},`, 50, 280);

            const lastDay = employee.exitDate ? formatDate(employee.exitDate) : currentDate;

            doc.font('Helvetica').fontSize(11).fillColor('#1e293b')
               .text(`With reference to your resignation letter, we wish to inform you that your resignation has been duly accepted. You are officially relieved from your duties as `, 50, 304, { continued: true, lineGap: 5 })
               .font('Helvetica-Bold').text(`${employee.positionLevel || employee.role}`, { continued: true })
               .font('Helvetica').text(` in the `, { continued: true })
               .font('Helvetica-Bold').text(`${employee.department}`, { continued: true })
               .font('Helvetica').text(` department at ${admin.companyName}, effective at the close of working hours on `, { continued: true })
               .font('Helvetica-Bold').text(`${lastDay}`, { continued: true })
               .font('Helvetica').text(`.`);

            doc.text(`We hereby certify that your Full & Final settlement has been processed and all dues owed by the company have been cleared. You are requested to ensure the handover of company assets, access credentials, and pending work documentation before your last working day.`, 50, 400, { lineGap: 5 });

            doc.text(`We thank you for your valuable contributions to the organization during your tenure and wish you the very best in all your future endeavors.`, 50, 488);

            drawSignature(doc, admin, 530);

        // ════════════════════════════════════════
        //  🪪  ID CARD
        // ════════════════════════════════════════
        } else if (docType === 'ID Card') {
            // Background gradient simulation
            doc.rect(0, 0, 252, 144).fill('#1e1b4b');
            doc.rect(0, 0, 72, 144).fill('#16143d');

            // Left strip — company logo
            if (admin.companyLogo && admin.companyLogo.startsWith('data:image')) {
                try { doc.image(admin.companyLogo, 6, 10, { width: 60, height: 30, fit: [60, 30] }); }
                catch(e) {}
            } else {
                doc.fontSize(20).fillColor('#ffffff').font('Helvetica-Bold')
                   .text((admin.companyName || 'C').charAt(0), 20, 14, { width: 36, align: 'center' });
            }

            doc.fontSize(5).fillColor('rgba(255,255,255,0.5)').font('Helvetica')
               .text((admin.companyName || '').substring(0, 8).toUpperCase(), 4, 50, { width: 64, align: 'center', characterSpacing: 1 });

            // ==========================================
            // 📸 NEW: EMPLOYEE AVATAR PROFILE PHOTO LOGIC
            // ==========================================
            let photoDrawn = false;
            
            // Check if user has a profile photo saved in the DB
            if (employee.profilePhoto) {
                try {
                    let imageSource = null;
                    if (employee.profilePhoto.startsWith('data:image')) {
                        const base64Data = employee.profilePhoto.replace(/^data:image\/\w+;base64,/, "");
                        imageSource = Buffer.from(base64Data, 'base64');
                    } else {
                        const photoPath = path.join(__dirname, '../uploads', employee.profilePhoto);
                        if (fs.existsSync(photoPath)) {
                            imageSource = photoPath;
                        }
                    }

                    if (imageSource) {
                        // Draw outer circular border
                        doc.circle(36, 96, 24).lineWidth(1.5).strokeColor('#ffffff').strokeOpacity(0.4).stroke();
                        doc.strokeOpacity(1);

                        // Save state, clip circular region, draw image, and restore state
                        doc.save();
                        doc.circle(36, 96, 24).clip(); // Restricts drawing to inside this circle
                        // Image coordinates are (cx - r), (cy - r), width and height are 2 * r
                        doc.image(imageSource, 12, 72, { width: 48, height: 48 }); 
                        doc.restore();
                        
                        photoDrawn = true;
                    }
                } catch (err) {
                    console.error("Error drawing profile photo on PDF ID card:", err);
                }
            }

            // Fallback: If no photo exists, draw the initials
            if (!photoDrawn) {
                doc.circle(36, 96, 24).fillColor('#ffffff').fillOpacity(0.12).fill();
                doc.circle(36, 96, 24).lineWidth(1.5).strokeColor('#ffffff').strokeOpacity(0.4).stroke();
                doc.fillOpacity(1).strokeOpacity(1); // Reset

                doc.fontSize(18).fillColor('#ffffff').font('Helvetica-Bold')
                   .text((employee.name || '?').charAt(0).toUpperCase(), 27, 88, { width: 20 });
            }

            // ==========================================
            // RIGHT CONTENT DATA
            // ==========================================
            doc.fontSize(7).fillColor('#a5b4fc').font('Helvetica-Bold')
               .text((admin.companyName || '').toUpperCase(), 80, 12, { width: 162, characterSpacing: 0.8 });

            doc.fontSize(13).fillColor('#ffffff').font('Helvetica-Bold')
               .text(employee.name || 'Employee Name', 80, 26, { width: 162 });

            doc.fontSize(8).fillColor('#c7d2fe').font('Helvetica')
               .text(employee.positionLevel || employee.role || 'Designation', 80, 44, { width: 162 });

            doc.moveTo(80, 57).lineTo(242, 57).lineWidth(0.5).stroke('rgba(255,255,255,0.2)');

            // Info grid
            doc.fontSize(6).fillColor('rgba(255,255,255,0.5)').font('Helvetica-Bold').text('EMP ID', 80, 63);
            doc.fontSize(7).fillColor('#fff').font('Helvetica').text(employee.empId || 'N/A', 80, 72);

            doc.fontSize(6).fillColor('rgba(255,255,255,0.5)').font('Helvetica-Bold').text('DEPT', 158, 63);
            doc.fontSize(7).fillColor('#fff').font('Helvetica').text((employee.department || 'N/A').substring(0, 12), 158, 72);

            doc.fontSize(6).fillColor('rgba(255,255,255,0.5)').font('Helvetica-Bold').text('BLOOD GROUP', 80, 85);
            doc.fontSize(8).fillColor('#fca5a5').font('Helvetica-Bold').text(employee.bloodGroup || 'N/A', 80, 94);

            doc.fontSize(6).fillColor('rgba(255,255,255,0.5)').font('Helvetica-Bold').text('PHONE', 158, 85);
            doc.fontSize(7).fillColor('#fff').font('Helvetica').text(employee.phone || 'N/A', 158, 94);

            doc.moveTo(80, 110).lineTo(242, 110).lineWidth(0.5).stroke('rgba(255,255,255,0.12)');
            doc.fontSize(6).fillColor('rgba(255,255,255,0.35)').font('Helvetica-Oblique')
               .text(admin.website || admin.branchLocation || 'Company Headquarters', 80, 116, { width: 162 });

            // ==========================================
            // 📸 NEW: ATTENDANCE QR CODE LOGIC
            // ==========================================
            try {
                // Generates a base64 Data URI for the QR code
                const qrData = JSON.stringify({ empId: employee._id, action: 'attendance_checkin', company: admin._id });
                const qrCodeDataUri = await QRCode.toDataURL(qrData, {
                    errorCorrectionLevel: 'M',
                    margin: 1,
                    color: { dark: '#000000', light: '#ffffff' }
                });
                
                // Convert Data URI to Buffer
                const base64Data = qrCodeDataUri.replace(/^data:image\/\w+;base64,/, "");
                const qrBuffer = Buffer.from(base64Data, 'base64');
                
                // Draw QR Code in the bottom right corner
                doc.image(qrBuffer, 210, 10, { width: 35, height: 35 });
                doc.fontSize(4).fillColor('rgba(255,255,255,0.5)').font('Helvetica').text('SCAN TO CHECK IN', 208, 48, { width: 40, align: 'center' });
            } catch (err) {
                console.error("Error generating QR code for ID card:", err);
            }
        }

        doc.end();

    } catch (err) {
        console.error("PDF Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to generate document: " + err.message });
        }
    }
});

// ==========================================
// 👥 GET: FETCH MY TEAM (DEPARTMENT PEERS) FOR LOGGED EMPLOYEE
// ==========================================
router.get('/my-team', verifyToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    let team = [];

    if (employee.assignedLeader) {
      // 1. Fetch the Team Leader
      const leader = await Employee.findById(employee.assignedLeader, 'name email role positionLevel profilePhoto');
      if (leader) {
        team.push({
          ...leader.toObject(),
          isLeader: true // Flag to show leader status on frontend
        });
      }

      // 2. Fetch peers who report to the same Team Leader
      const peers = await Employee.find({
        company: req.user.company,
        assignedLeader: employee.assignedLeader,
        _id: { $ne: req.user.id },
        status: 'Active'
      }, 'name email role positionLevel profilePhoto');

      team = [...team, ...peers];
    } else {
      // If employee does not have an assigned leader, they might be the leader.
      // Fetch all employees reporting directly to them.
      const reports = await Employee.find({
        company: req.user.company,
        assignedLeader: req.user.id,
        status: 'Active'
      }, 'name email role positionLevel profilePhoto');

      team = reports.map(r => ({
        ...r.toObject(),
        isReport: true
      }));
    }

    res.json(team);
  } catch (err) {
    res.status(500).json({ message: "Error fetching team members", error: err.message });
  }
});


module.exports = router;