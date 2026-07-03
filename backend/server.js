// ============================================================
// server.js — HRMS Backend Entry Point
// ============================================================
// This file is the conventional "server.js" entry point for the
// HRMS MERN application. It delegates to index.js which contains
// the complete Express + MongoDB + Socket.IO setup.
//
// Start commands:
//   npm run dev    → nodemon server.js (hot-reload)
//   npm start      → node server.js    (production)
//
// Environment variables (backend/.env):
//   PORT=5000
//   MONGO_URI=mongodb+srv://...
//   JWT_SECRET=...
//   CORS_ORIGIN=http://localhost:5173
// ============================================================

require('./index');
