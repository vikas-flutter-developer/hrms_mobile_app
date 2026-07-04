const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Event = require('../models/Event');

// GET all upcoming events
router.get('/', verifyToken, async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const events = await Event.find({
      company: req.user.company,
      date: { $gte: startOfToday } // Filter out past events so they don't pile up
    }).sort({
      date: 1
    });
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// CREATE new event
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      status
    } = req.body;
    const newEvent = new Event({
      company: req.user.company,
      title,
      description,
      date,
      location,
      status: status || 'Upcoming'
    });
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// UPDATE event
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, date, location, status } = req.body;
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { title, description, date, location, status },
      { new: true }
    );
    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(updatedEvent);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// DELETE event
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deletedEvent = await Event.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company
    });
    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json({
      message: 'Event deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

module.exports = router;