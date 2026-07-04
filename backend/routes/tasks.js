const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const verifyToken = require('../middleware/auth');

// ==========================================
// 🚀 GET TASKS FOR A PROJECT
// ==========================================
router.get('/project/:projectId', verifyToken, async (req, res) => {
  try {
    let filter = {
      company: req.user.company,
      project: req.params.projectId
    };

    if (req.user.role === 'employee') {
      const projectObj = await Project.findById(req.params.projectId);
      if (projectObj) {
        const isLeader = (projectObj.projectManager && projectObj.projectManager.toString() === req.user.id) || 
                         (projectObj.teamLead && projectObj.teamLead.toString() === req.user.id);
        if (!isLeader) {
          // Normal team members only see tasks explicitly assigned to them
          filter.assignedTo = req.user.id;
        }
      }
    }
    const tasks = await Task.find({
      ...filter,
      company: req.user.company
    }).populate('assignedTo', 'name email positionLevel profilePhoto').sort({
      createdAt: -1
    });
    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error retrieving tasks."
    });
  }
});

// ==========================================
// ➕ CREATE TASK
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    // Ensure user is authorized to create tasks for this project (Admin, HR, Project Manager, Team Leader)
    if (req.user.role === 'employee') {
      const projectObj = await Project.findById(req.body.project);
      if (!projectObj) return res.status(404).json({ message: "Project not found." });
      
      const isLeader = (projectObj.projectManager && projectObj.projectManager.toString() === req.user.id) || 
                       (projectObj.teamLead && projectObj.teamLead.toString() === req.user.id);
      if (!isLeader) {
        return res.status(403).json({ message: "Only Project Managers and Team Leads can create tasks." });
      }
    }
    const newTask = new Task({
      ...req.body,
      company: req.user.company,
      createdBy: req.user.id
    });
    await newTask.save();

    // 🔔 NOTIFICATION: Announce Task Assignment
    try {
      if (newTask.assignedTo) {
        const Announcement = require('../models/Announcement');
        const newAnnouncement = new Announcement({
          company: req.user.company,
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${newTask.title}`,
          targetAudience: 'Specific Users',
          targetUsers: [newTask.assignedTo],
          createdBy: req.user.id
        });
        await newAnnouncement.save();
      }
    } catch (announcementErr) {
      console.error("Failed to push task assignment announcement:", announcementErr);
    }

    // Populate for immediate frontend rendering
    await newTask.populate('assignedTo', 'name email positionLevel profilePhoto');
    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating task."
    });
  }
});

// ==========================================
// 🚦 UPDATE TASK STATUS
// ==========================================
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const {
      status
    } = req.body;

    // Find task first to verify ownership if needed
    const task = await Task.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    if (!task) return res.status(404).json({
      message: "Task not found."
    });
    const projectObj = await Project.findById(task.project);
    
    if (req.user.role === 'employee') {
      const isLeader = projectObj && ((projectObj.projectManager && projectObj.projectManager.toString() === req.user.id) || 
                                      (projectObj.teamLead && projectObj.teamLead.toString() === req.user.id));
      if (!isLeader) {
        // Members can only update their own tasks
        if (!task.assignedTo || task.assignedTo.toString() !== req.user.id) {
          return res.status(403).json({ message: "You can only update your own tasks." });
        }
        // Members cannot mark as Completed directly (only Review)
        if (status === 'Completed') {
          return res.status(403).json({ message: "Only Leaders/Managers can mark tasks as Completed. Please move it to Review." });
        }
      }
    }
    task.status = status;
    await task.save();
    await task.populate('assignedTo', 'name email positionLevel profilePhoto');
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({
      message: "Error updating task status."
    });
  }
});

// ==========================================
// 🗑️ DELETE TASK
// ==========================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      const taskObj = await Task.findById(req.params.id);
      if (!taskObj) return res.status(404).json({ message: "Task not found." });
      const projectObj = await Project.findById(taskObj.project);
      
      const isLeader = projectObj && ((projectObj.projectManager && projectObj.projectManager.toString() === req.user.id) || 
                                      (projectObj.teamLead && projectObj.teamLead.toString() === req.user.id));
      if (!isLeader) {
        return res.status(403).json({ message: "Only Leaders/Managers can delete tasks." });
      }
    }
    await Task.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company
    });
    res.status(200).json({
      message: "Task deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting task."
    });
  }
});
// GET: Employee fetches their own tasks; Admin/HR fetches all active company tasks
router.get('/my-tasks', verifyToken, async (req, res) => {
  try {
    let query = {
      company: req.user.company
    };

    // Filter by assignedTo only for normal employees
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      query.assignedTo = req.user.id;
      query.status = { $ne: 'Completed' };
    }

    const tasks = await Task.find(query)
      .populate('project', 'name title')
      .populate('assignedTo', 'name email positionLevel')
      .sort({ deadline: 1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error retrieving tasks for board:", error);
    res.status(500).json({ message: "Error retrieving task list." });
  }
});

// UPDATE task details
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, assignedTo, priority, deadline, status, project } = req.body;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { title, description, assignedTo, priority, deadline, status, project },
      { new: true }
    )
      .populate('project', 'name title')
      .populate('assignedTo', 'name email positionLevel');

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Error updating task." });
  }
});

module.exports = router;