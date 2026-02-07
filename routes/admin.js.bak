const express = require('express');
const { param, body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(protect, requireAdmin);

// @route   GET /api/admin/teams
// @desc    Get all teams with scores
// @access  Admin
router.get('/teams', async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('leadId', 'name email')
            .sort({ teamNumber: 1 });

        res.json({
            success: true,
            count: teams.length,
            data: teams
        });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/admin/teams/:teamId
// @desc    Get single team details
// @access  Admin
router.get('/teams/:teamId', async (req, res) => {
    try {
        console.log('Fetching team with ID:', req.params.teamId);

        const team = await Team.findById(req.params.teamId)
            .populate('leadId', 'name email')
            .populate('scores.round1.evaluations.evaluatorId', 'name email')
            .populate('scores.round2.evaluations.evaluatorId', 'name email')
            .populate('scores.round3.evaluations.evaluatorId', 'name email')
            .populate('scores.round4.evaluations.evaluatorId', 'name email')
            .lean(); // Convert to plain JavaScript object for better performance

        if (!team) {
            console.log('Team not found:', req.params.teamId);
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        console.log('Team found:', team.teamName);
        res.json({
            success: true,
            data: team
        });
    } catch (error) {
        console.error('Get team error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);

        // Check if it's a MongoDB CastError (invalid ObjectId format)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid team ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   PUT /api/admin/teams/:teamId/tasks/:round
// @desc    Update tasks for a team's round
// @access  Admin
router.put('/teams/:teamId/tasks/:round', async (req, res) => {
    try {
        const { teamId, round } = req.params;
        const { tasks } = req.body;

        const validRounds = ['round1', 'round2', 'round3', 'round4'];
        if (!validRounds.includes(round)) {
            return res.status(400).json({ success: false, message: 'Invalid round' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Update tasks for the specified round
        team.tasks[round] = tasks.map(task => ({
            title: task.title,
            description: task.description || '',
            visible: task.visible || false
        }));

        await team.save();

        res.json({
            success: true,
            message: `Tasks updated for ${round}`,
            data: team
        });
    } catch (error) {
        console.error('Update tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/admin/teams/:teamId/publish/:round
// @desc    Publish tasks to make them visible to team lead
// @access  Admin
router.post('/teams/:teamId/publish/:round', async (req, res) => {
    try {
        const { teamId, round } = req.params;

        const validRounds = ['round1', 'round2', 'round3', 'round4'];
        if (!validRounds.includes(round)) {
            return res.status(400).json({ success: false, message: 'Invalid round' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Make all tasks in the round visible
        team.tasks[round] = team.tasks[round].map(task => ({
            ...task.toObject(),
            visible: true
        }));

        await team.save();

        res.json({
            success: true,
            message: `${round} tasks published for team ${team.teamName}`,
            data: team
        });
    } catch (error) {
        console.error('Publish tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/admin/publish-all
// @desc    Publish all tasks for all teams
// @access  Admin
router.post('/publish-all', async (req, res) => {
    try {
        const { round } = req.body;

        const validRounds = ['round1', 'round2', 'round3', 'round4'];
        if (round && !validRounds.includes(round)) {
            return res.status(400).json({ success: false, message: 'Invalid round' });
        }

        const teams = await Team.find();

        for (const team of teams) {
            if (round) {
                // Publish specific round
                team.tasks[round] = team.tasks[round].map(task => ({
                    ...task.toObject(),
                    visible: true
                }));
            } else {
                // Publish all rounds
                for (const r of validRounds) {
                    team.tasks[r] = team.tasks[r].map(task => ({
                        ...task.toObject(),
                        visible: true
                    }));
                }
            }
            await team.save();
        }

        res.json({
            success: true,
            message: round ? `${round} tasks published for all teams` : 'All tasks published for all teams',
            count: teams.length
        });
    } catch (error) {
        console.error('Publish all tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/admin/teams/:teamId/flash-round
// @desc    Select team for Flash Round
// @access  Admin
router.post('/teams/:teamId/flash-round',
    [
        param('teamId').isMongoId().withMessage('Invalid team ID'),
        body('maxScore').optional().isInt({ min: 0, max: 100 })
            .withMessage('Max score must be between 0 and 100')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        try {
            const team = await Team.findById(req.params.teamId);
            if (!team) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }

            team.isFlashRoundSelected = true;

            // Optionally set max score for flash round
            if (req.body.maxScore) {
                team.scores.round4.maxScore = req.body.maxScore;
            }

            await team.save();

            res.json({
                success: true,
                message: `${team.teamName} selected for Flash Round`,
                data: team
            });
        } catch (error) {
            console.error('Flash round selection error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

// @route   DELETE /api/admin/teams/:teamId/flash-round
// @desc    Remove team from Flash Round
// @access  Admin
router.delete('/teams/:teamId/flash-round', async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        team.isFlashRoundSelected = false;
        team.scores.round4 = { score: null, maxScore: 0 };
        await team.save();

        res.json({
            success: true,
            message: `${team.teamName} removed from Flash Round`,
            data: team
        });
    } catch (error) {
        console.error('Flash round removal error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/admin/leaderboard
// @desc    Get teams ranked by total score
// @access  Admin
router.get('/leaderboard', async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('leadId', 'name email')
            .sort({ totalScore: -1 });

        res.json({
            success: true,
            data: teams.map((team, index) => ({
                _id: team._id,
                rank: index + 1,
                teamName: team.teamName,
                teamNumber: team.teamNumber,
                domain: team.domain,
                totalScore: team.totalScore,
                scores: team.scores,
                isFlashRoundSelected: team.isFlashRoundSelected
            }))
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
