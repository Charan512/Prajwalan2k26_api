const express = require('express');
const router = express.Router();
const GameScore = require('../models/GameScore');
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');

// Get game leaderboard (public - no auth required)
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await GameScore.find()
            .sort({ highScore: -1, score: -1 })
            .select('teamName teamNumber score highScore gamesPlayed lastPlayedAt')
            .limit(50); // Top 50 teams

        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching game leaderboard:', error);
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
});

// Get team's game score
router.get('/score/:teamId', protect, async (req, res) => {
    try {
        const { teamId } = req.params;

        let gameScore = await GameScore.findOne({ teamId });

        // If no score exists, create one
        if (!gameScore) {
            const team = await Team.findById(teamId);
            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }

            gameScore = new GameScore({
                teamId: team._id,
                teamName: team.teamName,
                teamNumber: team.teamNumber
            });
            await gameScore.save();
        }

        res.json(gameScore);
    } catch (error) {
        console.error('Error fetching game score:', error);
        res.status(500).json({ message: 'Server error fetching score' });
    }
});

// Update team's game score
router.post('/score', protect, async (req, res) => {
    try {
        let { teamId, score } = req.body;

        // Security Patch 1: Cap the maximum score to 50000 to prevent 9999999 exploits
        if (score > 50000) {
            score = 50000;
        }

        // Security Patch 2: Prevent IDOR (Insecure Direct Object Reference)
        // If the user is NOT an admin, forcefully assign teamId to their own team,
        // completely ignoring any malicious teamId they might have tried to pass in the body.
        if (req.user && req.user.role !== 'admin') {
            teamId = req.user.teamId;
        } else if (!teamId && req.user && req.user.teamId) {
            teamId = req.user.teamId;
        }

        if (!teamId || score === undefined) {
            return res.status(400).json({ message: 'Team ID (or valid Team Lead login) and score are required' });
        }

        // Verify team exists
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Find or create game score
        let gameScore = await GameScore.findOne({ teamId });

        if (!gameScore) {
            gameScore = new GameScore({
                teamId: team._id,
                teamName: team.teamName,
                teamNumber: team.teamNumber,
                score: score,
                highScore: score,
                gamesPlayed: 1,
                lastPlayedAt: new Date()
            });
        } else {
            gameScore.score = score;
            gameScore.gamesPlayed += 1;
            gameScore.lastPlayedAt = new Date();

            // Update high score if current score is higher
            if (score > gameScore.highScore) {
                gameScore.highScore = score;
            }
        }

        await gameScore.save();

        res.json({
            message: 'Score updated successfully',
            gameScore
        });
    } catch (error) {
        console.error('Error updating game score:', error);
        res.status(500).json({ message: 'Server error updating score' });
    }
});

// Reset team's game score (admin only)
router.delete('/score/:teamId', protect, async (req, res) => {
    try {
        const { teamId } = req.params;

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const gameScore = await GameScore.findOneAndDelete({ teamId });

        if (!gameScore) {
            return res.status(404).json({ message: 'Game score not found' });
        }

        res.json({ message: 'Game score reset successfully' });
    } catch (error) {
        console.error('Error resetting game score:', error);
        res.status(500).json({ message: 'Server error resetting score' });
    }
});

module.exports = router;
