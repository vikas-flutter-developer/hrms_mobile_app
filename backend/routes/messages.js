const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Message = require('../models/Message');

// GET global messages (polling)
router.get('/global', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      company: req.user.company,
      isGlobal: true
    })
    .populate({ path: 'sender', select: 'name companyName' })
    .sort({ createdAt: -1 })
    .limit(50);
    
    // Normalize: admin docs may store name differently
    const normalized = messages.reverse().map(msg => {
      const obj = msg.toObject();
      if (obj.sender && !obj.sender.name && obj.sender.companyName) {
        obj.sender.name = obj.sender.companyName;
      }
      return obj;
    });
    res.status(200).json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST global message
router.post('/global', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const senderModel = req.user.role === 'admin' ? 'Admin' : 'Employee';
    const newMessage = new Message({
      company: req.user.company,
      sender: req.user.id,
      senderModel,
      content,
      isGlobal: true
    });
    const savedMessage = await newMessage.save();
    await savedMessage.populate({ path: 'sender', select: 'name companyName' });
    
    // Normalize admin sender name
    const obj = savedMessage.toObject();
    if (obj.sender && !obj.sender.name && obj.sender.companyName) {
      obj.sender.name = obj.sender.companyName;
    }
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;