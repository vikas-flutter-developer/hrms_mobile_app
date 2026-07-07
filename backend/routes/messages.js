const express = require('express');
const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

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
    const { content, attachmentUrl, attachmentType } = req.body;
    const senderModel = req.user.role === 'admin' ? 'Admin' : 'Employee';
    const newMessage = new Message({
      company: req.user.company,
      sender: req.user.id,
      senderModel,
      content,
      attachmentUrl,
      attachmentType,
      isGlobal: true
    });
    const savedMessage = await newMessage.save();
    await savedMessage.populate({ path: 'sender', select: 'name companyName' });
    
    // Normalize admin sender name
    const obj = savedMessage.toObject();
    if (obj.sender && !obj.sender.name && obj.sender.companyName) {
      obj.sender.name = obj.sender.companyName;
    }

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('receiveMessage', obj);
      console.log(`🔌 [Socket]: Broadcasted global message from ${obj.sender?.name || 'User'}`);
    }

    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST upload attachment
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;