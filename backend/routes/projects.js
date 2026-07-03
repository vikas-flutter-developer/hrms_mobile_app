const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Employee = require('../models/Employee');
const verifyToken = require('../middleware/auth');

// ==========================================
// 🚀 GET PROJECTS
// ==========================================
router.get('/', verifyToken, async (req, res) => {
  try {
    let filter = {
      company: req.user.company
    };

    // Role-based filtering
    if (req.user.role === 'employee') {
      const empId = req.user.id;
      const emp = await Employee.findById(empId);
      
      if (emp.positionLevel === 'Department Manager') {
        filter.$or = [
          { department: emp.department },
          { projectManager: empId },
          { teamLead: empId },
          { members: empId }
        ];
      } else {
        filter.$or = [
          { projectManager: empId },
          { teamLead: empId },
          { members: empId }
        ];
      }
    }
    // Admin and HR can see all projects in the company

    const projects = await Project.find({
      ...filter,
      company: req.user.company
    }).populate('projectManager', 'name email positionLevel').populate('teamLead', 'name email positionLevel').populate('members', 'name email positionLevel').sort({
      createdAt: -1
    });
    res.status(200).json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error retrieving projects."
    });
  }
});

// ==========================================
// ➕ CREATE PROJECT
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const newProject = new Project({
      ...req.body,
      company: req.user.company,
      createdBy: req.user.id
    });
    await newProject.save();

    // 🔔 NOTIFICATION: Announce Project Assignment
    try {
      const Announcement = require('../models/Announcement');
      const targetUsers = [];
      if (newProject.projectManager) targetUsers.push(newProject.projectManager);
      if (newProject.teamLead) targetUsers.push(newProject.teamLead);
      if (newProject.members && newProject.members.length > 0) targetUsers.push(...newProject.members);
      if (targetUsers.length > 0) {
        const newAnnouncement = new Announcement({
          company: req.user.company,
          title: 'New Project Assigned',
          message: `You have been assigned to a new project: ${newProject.name}`,
          targetAudience: 'Specific Users',
          targetUsers: targetUsers,
          createdBy: req.user.id
        });
        await newAnnouncement.save();
      }
    } catch (announcementErr) {
      console.error("Failed to push project assignment announcement:", announcementErr);
    }
    res.status(201).json(newProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating project."
    });
  }
});

// ==========================================
// ✏️ UPDATE PROJECT
// ==========================================
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({
      message: "Error updating project."
    });
  }
});

// ==========================================
// 🚦 UPDATE PROJECT STATUS (Special Patch for Members/Leads)
// ==========================================
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const {
      status
    } = req.body;
    const project = await Project.findByIdAndUpdate(req.params.id, {
      status
    }, {
      new: true
    });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({
      message: "Error updating project status."
    });
  }
});

// ==========================================
// 🗑️ DELETE PROJECT
// ==========================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: "Project deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting project."
    });
  }
});

// ==========================================
// 👥 GET POTENTIAL TEAM MEMBERS (Helper for Assigning)
// ==========================================
router.get('/employees', verifyToken, async (req, res) => {
  try {
    const employees = await Employee.find({
      company: req.user.company,
      status: 'Active'
    }).select('name positionLevel department email');
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching employees for assignment."
    });
  }
});
module.exports = router;