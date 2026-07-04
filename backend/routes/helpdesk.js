const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');

// GET /api/helpdesk/tickets
router.get('/tickets', auth, async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
    let filter = {};
    if (req.query.mine === 'true' && userRole !== 'admin' && userRole !== 'superadmin') {
      filter.employeeId = req.user.id;
    }

    if (req.query.type === 'superadmin') {
      filter.isSuperAdminTicket = true;
    } else {
      filter.isSuperAdminTicket = false;
    }

    let tickets = await Ticket.find({
      ...filter,
      company: req.user.company
    }).populate('employeeId', 'name email department profilePhoto').populate('thread.senderId', 'name profilePhoto role')
    .sort({
      createdAt: -1
    });

    if (tickets.length === 0) {
      // Fallback: return company tickets if specific filter returns 0
      tickets = await Ticket.find({
        company: req.user.company,
        isSuperAdminTicket: req.query.type === 'superadmin'
      }).populate('employeeId', 'name email department profilePhoto').populate('thread.senderId', 'name profilePhoto role')
      .sort({
        createdAt: -1
      });
    }

    res.json(tickets);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({
      message: 'Server Error fetching tickets'
    });
  }
});

// POST /api/helpdesk/tickets
router.post('/tickets', auth, async (req, res) => {
  try {
    const {
      subject,
      category,
      priority,
      description,
      isSuperAdminTicket
    } = req.body;
    
    // Validate HR permission if trying to create a Super Admin ticket
    if (isSuperAdminTicket && req.user.role === 'hr') {
        const CompanySettings = require('../models/CompanySettings');
        const companySettings = await CompanySettings.findOne({ company: req.user.company });
        if (!companySettings || !companySettings.hrSuperAdminHelpdeskPermission) {
            return res.status(403).json({ message: "HR does not have permission to contact Super Admin directly." });
        }
    }

    const employeeModel = req.user.role === 'admin' ? 'Admin' : req.user.role === 'hr' ? 'Hr' : 'Employee';
    const newTicket = new Ticket({
      company: req.user.company,
      employeeId: req.user.id,
      employeeModel,
      isSuperAdminTicket: isSuperAdminTicket || false,
      subject,
      category,
      priority,
      description,
      // Automatically add the first message to the thread
      thread: [{
        senderId: req.user.id,
        senderModel: req.user.role === 'employee' ? 'Employee' : req.user.role === 'admin' ? 'Admin' : 'Hr',
        message: description
      }]
    });
    await newTicket.save();

    // Notify all Super Admins ONLY if it's a Super Admin ticket
    if (isSuperAdminTicket) {
      try {
        const Superadmin = require('../models/Superadmin');
        const Notification = require('../models/Notification');
        const superAdmins = await Superadmin.find();
        for (const sa of superAdmins) {
          await Notification.create({
            recipientId: sa._id,
            recipientModel: 'Superadmin',
            title: 'New Support Ticket Raised',
            message: `${req.user.role.toUpperCase()} ${req.user.email} has raised a ticket: "${subject}"`
          });
        }
      } catch (notifErr) {
        console.error("Failed to notify superadmins of new ticket:", notifErr);
      }
    }

    res.status(201).json(newTicket);
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({
      message: 'Server Error creating ticket'
    });
  }
});

// POST /api/helpdesk/tickets/:id/reply
router.post('/tickets/:id/reply', auth, async (req, res) => {
  try {
    const {
      message
    } = req.body;
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }
    const senderModel = req.user.role === 'employee' ? 'Employee' : req.user.role === 'admin' ? 'Admin' : 'Hr';

    // Add new message to thread
    ticket.thread.push({
      senderId: req.user.id,
      senderModel,
      message
    });

    // If an admin/hr replies to an open ticket, move it to 'In Progress' automatically
    if (ticket.status === 'Open' && senderModel !== 'Employee') {
      ticket.status = 'In Progress';
    }
    await ticket.save();

    // Populate the senderId for the response so frontend can render it immediately
    const populatedTicket = await Ticket.findById(ticket._id).populate('employeeId', 'name email department profilePhoto').populate('thread.senderId', 'name profilePhoto role');
    res.status(201).json(populatedTicket);
  } catch (err) {
    console.error('Error adding reply:', err);
    res.status(500).json({
      message: 'Server Error adding reply'
    });
  }
});

// PATCH /api/helpdesk/tickets/:id (For status updates etc.)
router.patch('/tickets/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    }).populate('employeeId', 'name email department profilePhoto').populate('thread.senderId', 'name profilePhoto role');
    res.json(ticket);
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({
      message: 'Server Error updating ticket'
    });
  }
});

// FAQ / Knowledge base routes
const FAQ = require('../models/Faq');

// GET /api/helpdesk/faqs
router.get('/faqs', async (req, res) => {
  try {
    const faqs = await FAQ.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(faqs);
  } catch (err) {
    console.error('Error fetching FAQs:', err);
    res.status(500).json({ message: 'Server Error fetching FAQs' });
  }
});

// POST /api/helpdesk/faqs
router.post('/faqs', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    const newFaq = new FAQ({ question, answer, category });
    await newFaq.save();
    res.status(201).json(newFaq);
  } catch (err) {
    console.error('Error creating FAQ:', err);
    res.status(500).json({ message: 'Server Error creating FAQ' });
  }
});

module.exports = router;