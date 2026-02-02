const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'team_lead', 'evaluator'],
        required: true
    },
    domain: {
        type: String,
        enum: [
            'Web Development',
            'Web3 & Blockchain',
            'IoT Systems',
            'Quantum Computing',
            'Cyber Security',
            'Machine Learning',
            'Agentic AI',
            'App Development'
        ],
        default: null
    },
    evaluatorType: {
        type: String,
        enum: ['student', 'staff'],
        default: null
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes for performance optimization
// Note: email index is created automatically by unique: true
userSchema.index({ role: 1, domain: 1 }); // For role and domain filtering

module.exports = mongoose.model('User', userSchema);
