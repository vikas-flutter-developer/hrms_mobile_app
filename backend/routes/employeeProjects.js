const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const verifyToken = require('../middleware/auth');
const Employee = require('../models/Employee');

// 1. Fetch Projects & Tasks for Kanban
router.get('/projects/kanban', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const leadProjects = await Project.find({ 
      $or: [{ teamLead: userId }, { projectManager: userId }], 
      company: req.user.company 
    }).populate('projectManager', 'name email').populate('teamLead', 'name email').populate('members', 'name email');
    
    const myProjects = await Project.find({
      $or: [{ members: userId }, { teamLead: userId }, { projectManager: userId }],
      company: req.user.company
    }).populate('projectManager', 'name email').populate('teamLead', 'name email').populate('members', 'name email');

    let rawTasks = await Task.find({
      company: req.user.company,
      $or: [
        { assignedTo: userId },
        { project: { $in: leadProjects.map(p => p._id) } } // Leaders see all tasks in their projects
      ]
    }).populate('project');

    const tasks = rawTasks.map(t => ({
      _id: t._id,
      projectId: t.project,
      taskName: t.title,
      description: t.description,
      assignedTo: t.assignedTo,
      assignedBy: t.createdBy,
      deadline: t.deadline,
      status: t.status === 'Todo' ? 'Pending' : t.status
    }));

    const employees = await Employee.find({ 
      company: req.user.company, 
      status: 'Active',
      assignedLeader: userId
    }).select('name positionLevel department');

    res.json({ success: true, myProjects, leadProjects, tasks, employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Assign New Task (TL Only)
router.post('/tasks/assign', verifyToken, async (req, res) => {
  try {
    const { projectId, taskName, description, assignedTo, deadline } = req.body;
    const userId = req.user.id;

    const newTask = new Task({
      company: req.user.company,
      project: projectId,
      title: taskName,
      description,
      assignedTo,
      createdBy: userId,
      deadline,
      status: 'Todo'
    });

    await newTask.save();
    res.json({ success: true, message: "Task added to Kanban!", task: newTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Update Task Status
router.patch('/tasks/update-status/:id', verifyToken, async (req, res) => {
  try {
    let { status } = req.body;
    if (status === 'Pending') status = 'Todo';

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { status },
      { new: true }
    );
    res.json({ success: true, task: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
