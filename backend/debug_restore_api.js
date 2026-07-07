const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const mongoose = require('mongoose');

const QUANTUM_ID = '6a4b5e6d00b07c1dfa2c3789';

async function run() {
    try {
        // Read backup file and inspect keys
        const backupPath = path.join(__dirname, 'backups', 'Quantum_Analytics_Corp_Backup.json');
        const rawJsonStr = fs.readFileSync(backupPath, 'utf-8');
        const parsedData = JSON.parse(rawJsonStr);

        console.log("Keys in backup JSON file:");
        for (const [key, value] of Object.entries(parsedData)) {
            if (Array.isArray(value)) {
                console.log(`- ${key}: ${value.length} records`);
            } else if (typeof value === 'object') {
                console.log(`- ${key}: [Object]`);
            } else {
                console.log(`- ${key}: ${value}`);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error("Error inspecting backup file:", e.message);
        process.exit(1);
    }
}
run();
