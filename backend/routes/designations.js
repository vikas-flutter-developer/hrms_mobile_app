const express = require('express');
const router = express.Router();
const Designation = require('../models/Designation');
const verifyToken = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await Designation.find({ company: req.user.company }).sort({ title: 1 });
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, id } = req.body;
    const target = title?.trim();
    if (!target) return res.status(400).json({ message: 'Missing Designation Title parameter' });

    const updateData = { title: target, company: req.user.company };
    
    const query = id ? { _id: id, company: req.user.company } : { title: target, company: req.user.company };
    
    const added = await Designation.findOneAndUpdate(query, updateData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });
    res.status(201).json(added);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/', verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required to delete designation' });
    
    await Designation.deleteOne({ title: title.trim(), company: req.user.company });
    res.status(200).json({ message: "Designation removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
