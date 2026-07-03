const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "HRMS_SUPER_SECRET_KEY@_123";

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ message: "Access Denied: Missing Authentication Bearer Token" });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;

        // 🏢 MULTI-TENANCY: Attach company scope to every request
        // Admin: company = their own Admin _id
        // Employee/HR: company is embedded in token at login time
        if (verified.role === 'admin') {
            req.user.company = verified.id;
        } else if (verified.company) {
            req.user.company = verified.company;
        }

        next();
    } catch (err) {
        const fs = require('fs');
        fs.appendFileSync('auth_error.log', `[AUTH] Token Verification Failed: ${err.message}\n`);
        return res.status(401).json({ message: "Invalid or expired session token key" });
    }
};

module.exports = verifyToken;