const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Event = require('../models/Event');
router.get('/', verifyToken, async (req, res) => {
  try {
    const events = await Event.find({
      company: req.user.company
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
      status
    });
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Event.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company
    });
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