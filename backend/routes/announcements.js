const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Announcement = require('../models/Announcement');

// GET all announcements — auto-filtered to only active (non-expired) ones
router.get('/', verifyToken, async (req, res) => {
  try {
    const now = new Date();

    // Expiry filter: include docs where expiresAt is null OR expiresAt > now
    const expiryFilter = {
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    };

    let query = {};
    if (req.user && req.user.role !== 'admin') {
      const dept = req.user.department;
      const userId = req.user.id;
      query = {
        $or: [
          { targetAudience: 'All' },
          { targetAudience: 'Specific Department', targetDepartments: dept },
          { targetAudience: 'Specific Users', targetUsers: userId }
        ]
      };
    }

    let announcements = await Announcement.find({
      ...query,
      ...expiryFilter,
      company: req.user.company,
      title: { $not: /^Leave Request/i }
    }).populate('createdBy', 'name').sort({ createdAt: -1 });

    res.status(200).json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE new announcement with optional expiry duration
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      message,
      targetAudience,
      targetDepartments,
      targetUsers,
      visibleForHours  // NEW: e.g. 24, 48, 72, 168, or null = permanent
    } = req.body;

    const createdByModel = req.user.role === 'admin' ? 'Admin' : 'Employee';

    let expiresAt = null;
    if (visibleForHours && !isNaN(Number(visibleForHours))) {
      expiresAt = new Date(Date.now() + Number(visibleForHours) * 60 * 60 * 1000);
    }

    const newAnnouncement = new Announcement({
      company: req.user.company,
      title,
      message,
      targetAudience: targetAudience || 'All',
      targetDepartments: Array.isArray(targetDepartments) ? targetDepartments : [],
      targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
      createdBy: req.user.id,
      createdByModel,
      visibleForHours: visibleForHours || null,
      expiresAt
    });

    const savedAnnouncement = await newAnnouncement.save();
    await savedAnnouncement.populate('createdBy', 'name');
    res.status(201).json(savedAnnouncement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE announcement
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, message, targetAudience, targetDepartments, targetUsers, visibleForHours } = req.body;
    let expiresAt = undefined;
    if (visibleForHours !== undefined) {
      if (visibleForHours && !isNaN(Number(visibleForHours))) {
        expiresAt = new Date(Date.now() + Number(visibleForHours) * 60 * 60 * 1000);
      } else {
        expiresAt = null;
      }
    }

    const updateData = {
      title,
      message,
      targetAudience,
      targetDepartments: Array.isArray(targetDepartments) ? targetDepartments : [],
      targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
    };

    if (visibleForHours !== undefined) {
      updateData.visibleForHours = visibleForHours || null;
      updateData.expiresAt = expiresAt;
    }

    const updatedAnnouncement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      updateData,
      { new: true }
    ).populate('createdBy', 'name');

    if (!updatedAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.status(200).json(updatedAnnouncement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE announcement
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Announcement.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company
    });
    res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;