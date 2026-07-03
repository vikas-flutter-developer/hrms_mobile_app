const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/auth');

// 1. GET active notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch notifications where:
        // - isSeen is false, OR
        // - isSeen is true and seenAt is within the last 24 hours
        const list = await Notification.find({
            recipientId: req.user.id,
            $or: [
                { isSeen: false },
                { isSeen: true, seenAt: { $gte: oneDayAgo } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
    }
});

// 2. PUT mark a notification as seen
router.put('/:id/seen', verifyToken, async (req, res) => {
    try {
        const updated = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipientId: req.user.id },
            { isSeen: true, seenAt: new Date() },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: "Notification not found or unauthorized" });
        }
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: "Failed to update notification status", error: err.message });
    }
});

// 3. PUT mark all notifications as seen
router.put('/seen-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipientId: req.user.id, isSeen: false },
            { isSeen: true, seenAt: new Date() }
        );
        res.status(200).json({ message: "All notifications marked as seen" });
    } catch (err) {
        res.status(500).json({ message: "Failed to update notifications", error: err.message });
    }
});

module.exports = router;
