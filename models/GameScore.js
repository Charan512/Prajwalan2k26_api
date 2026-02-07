const mongoose = require('mongoose');

const gameScoreSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    teamName: {
        type: String,
        required: true
    },
    teamNumber: {
        type: Number,
        required: true
    },
    score: {
        type: Number,
        default: 0,
        min: 0
    },
    highScore: {
        type: Number,
        default: 0,
        min: 0
    },
    gamesPlayed: {
        type: Number,
        default: 0,
        min: 0
    },
    lastPlayedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster leaderboard queries
gameScoreSchema.index({ highScore: -1, score: -1 });
gameScoreSchema.index({ teamId: 1 }, { unique: true });

const GameScore = mongoose.model('GameScore', gameScoreSchema);

module.exports = GameScore;
