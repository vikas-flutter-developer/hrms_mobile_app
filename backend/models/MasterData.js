const mongoose = require('mongoose');

const masterDataSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        // Yeh 11 categories aapki list ke hisaab se hain
        enum: [
            'Department', 'Designation', 'Skill', 'Holiday', 'LeaveType',
            'SalaryComponent', 'DocumentType', 'KPI', 'Training', 'ExpenseCategory', 'AssetCategory'
        ]
    },
    name: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    // Null ka matlab yeh SuperAdmin ka "Global Template" hai, kisi ek company ka nahi
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        default: null 
    },
    // Category-specific fields for template configuration
    code: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    gratuityPercentage: { type: Number, default: 0 },
    salaryGrade: { type: String, default: '' },
    level: { type: Number, default: 5 },
    annualQuota: { type: Number, default: 0 },
    holidayDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('MasterData', masterDataSchema);