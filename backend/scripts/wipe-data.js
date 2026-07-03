/**
 * HRMS Multi-Tenancy Data Reset Script
 * Wipes all collections EXCEPT Admin and Superadmin
 * Run with: node scripts/wipe-data.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';

const COLLECTIONS_TO_WIPE = [
  'employees',
  'departments',
  'leaves',
  'leavepolicies',
  'attendances',
  'attendanceregularizations',
  'payslips',
  'loans',
  'assets',
  'expenses',
  'pettycashes',
  'vacancies',
  'candidates',
  'interviews',
  'jobs',
  'performancecycles',
  'performancereviews',
  'kpis',
  'pips',
  'feedbacks',
  'trainingprograms',
  'trainingassignments',
  'compliancerecords',
  'labourcompliances',
  'compliancedocuments',
  'announcements',
  'events',
  'messages',
  'shifts',
  'holidays',
  'companydocuments',
  'employeedocuments',
  'appraisalhistories',
  'certifications',
  'customroles',
  'employeeskills',
  'tickets',
];

async function wipeData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;

    for (const collName of COLLECTIONS_TO_WIPE) {
      try {
        const result = await db.collection(collName).deleteMany({});
        console.log(`🗑️  Wiped [${collName}]: ${result.deletedCount} documents deleted`);
      } catch (err) {
        // Collection might not exist yet
        console.log(`⚠️  Skipped [${collName}]: ${err.message}`);
      }
    }

    console.log('\n✅ Data wipe complete!');
    console.log('✅ Admin and Superadmin accounts preserved.');
    console.log('✅ You can now use the app with full multi-tenant isolation.\n');
  } catch (err) {
    console.error('❌ Wipe failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

wipeData();
