const mongoose = require('mongoose');

const timerSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true,
        default: 'timer_started'
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    duration: {
        type: Number,
        required: true,
        default: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    },
    endTime: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    message: {
        type: String,
        default: 'Prajwalan 2k26 timer has been ignited!'
    }
}, {
    timestamps: true
});

// Calculate end time before saving
timerSchema.pre('save', function (next) {
    if (this.isNew) {
        this.endTime = new Date(this.startTime.getTime() + this.duration);
    }
    next();
});

// Method to check if timer is expired
timerSchema.methods.isExpired = function () {
    return Date.now() > this.endTime.getTime();
};

// Method to get remaining time in milliseconds
timerSchema.methods.getRemainingTime = function () {
    const remaining = this.endTime.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
};

module.exports = mongoose.model('Timer', timerSchema);
