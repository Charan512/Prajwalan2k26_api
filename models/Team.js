const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    visible: {
        type: Boolean,
        default: false
    }
}, { _id: true });

// Individual evaluation by a single evaluator
const evaluationSchema = new mongoose.Schema({
    evaluatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    evaluatorName: {
        type: String,
        required: true
    },
    evaluatorType: {
        type: String,
        enum: ['student', 'staff'],
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0
    },
    feedback: {
        type: String,
        default: ''
    },
    evaluatedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

// Score schema for each round supporting multiple evaluators
const scoreSchema = new mongoose.Schema({
    evaluations: {
        type: [evaluationSchema],
        default: []
    },
    finalScore: {
        type: Number,
        default: null
    },
    maxScore: {
        type: Number,
        required: true
    },
    lastCalculatedAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        default: ''
    }
}, { _id: false });

const teamSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true
    },
    teamNumber: {
        type: Number,
        required: true,
        unique: true,
        min: 1,
        max: 100
    },
    domain: {
        type: String,
        required: true,
        enum: [
            'Web Development',
            'Web3 & Blockchain',
            'IoT Systems',
            'Quantum Computing',
            'Cyber Security',
            'Machine Learning',
            'Agentic AI',
            'App Development'
        ]
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    members: [memberSchema],
    isFlashRoundSelected: {
        type: Boolean,
        default: false
    },
    tasks: {
        round1: [taskSchema],
        round2: [taskSchema],
        round3: [taskSchema],
        round4: [taskSchema]
    },
    scores: {
        round1: {
            type: scoreSchema,
            default: { evaluations: [], finalScore: null, maxScore: 30 }
        },
        round2: {
            type: scoreSchema,
            default: { evaluations: [], finalScore: null, maxScore: 20 }
        },
        round3: {
            type: scoreSchema,
            default: { evaluations: [], finalScore: null, maxScore: 50 }
        },
        round4: {
            type: scoreSchema,
            default: { evaluations: [], finalScore: null, maxScore: 0 }
        }
    },
    totalScore: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Method to calculate weighted score for a specific round
teamSchema.methods.calculateWeightedScore = function (round) {
    const roundScore = this.scores[round];

    if (!roundScore || !roundScore.evaluations || roundScore.evaluations.length === 0) {
        roundScore.finalScore = null;
        roundScore.lastCalculatedAt = null;
        return null;
    }

    // Separate student and staff evaluators
    const studentEvaluations = roundScore.evaluations.filter(e => e.evaluatorType === 'student');
    const staffEvaluations = roundScore.evaluations.filter(e => e.evaluatorType === 'staff');

    let finalScore = 0;

    // Calculate student evaluator contribution (60%)
    if (studentEvaluations.length > 0) {
        // Take the first student evaluator's score (should only be one)
        const studentScore = studentEvaluations[0].score;
        finalScore += studentScore * 0.6;
    }

    // Calculate staff evaluators contribution (40%)
    if (staffEvaluations.length > 0) {
        const averageStaffScore = staffEvaluations.reduce((sum, e) => sum + e.score, 0) / staffEvaluations.length;
        finalScore += averageStaffScore * 0.4;
    } else if (studentEvaluations.length === 0) {
        // If no student evaluator, just average all scores
        const averageScore = roundScore.evaluations.reduce((sum, e) => sum + e.score, 0) / roundScore.evaluations.length;
        finalScore = averageScore;
    }

    // Round to 2 decimal places
    roundScore.finalScore = Math.round(finalScore * 100) / 100;
    roundScore.lastCalculatedAt = new Date();

    return roundScore.finalScore;
};

// Calculate weighted scores and total score before saving
teamSchema.pre('save', function (next) {
    // Recalculate weighted scores for all rounds
    ['round1', 'round2', 'round3', 'round4'].forEach(round => {
        if (this.scores[round] && this.scores[round].evaluations && this.scores[round].evaluations.length > 0) {
            this.calculateWeightedScore(round);
        }
    });

    // Calculate total score from finalScores
    const scores = this.scores;
    let total = 0;
    if (scores.round1?.finalScore !== null && scores.round1?.finalScore !== undefined) {
        total += scores.round1.finalScore;
    }
    if (scores.round2?.finalScore !== null && scores.round2?.finalScore !== undefined) {
        total += scores.round2.finalScore;
    }
    if (scores.round3?.finalScore !== null && scores.round3?.finalScore !== undefined) {
        total += scores.round3.finalScore;
    }
    if (scores.round4?.finalScore !== null && scores.round4?.finalScore !== undefined) {
        total += scores.round4.finalScore;
    }

    this.totalScore = Math.round(total * 100) / 100;
    next();
});

// Indexes for performance optimization
teamSchema.index({ teamNumber: 1 }); // For quick team number lookups
teamSchema.index({ domain: 1 }); // For domain-based filtering
teamSchema.index({ totalScore: -1 }); // For leaderboard sorting
teamSchema.index({ isFlashRoundSelected: 1 }); // For Flash Round queries

module.exports = mongoose.model('Team', teamSchema);
