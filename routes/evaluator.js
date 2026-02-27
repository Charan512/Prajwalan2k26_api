const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Team = require('../models/Team');
const { protect, requireEvaluator } = require('../middleware/auth');

const router = express.Router();

// All routes require evaluator authentication
router.use(protect, requireEvaluator);

// @route   GET /api/evaluator/profile
// @desc    Get evaluator profile with domain
// @access  Evaluator
router.get('/profile', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                domain: req.user.domain
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/evaluator/teams
// @desc    Get all teams for evaluation (filtered by evaluator's domain)
// @access  Evaluator
router.get('/teams', async (req, res) => {
    try {
        // Filter teams by evaluator's domain
        const query = req.user.domain ? { domain: req.user.domain } : {};

        const teams = await Team.find(query)
            .select('teamName teamNumber domain scores isFlashRoundSelected totalScore')
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

// @route   GET /api/evaluator/search/:teamNumber
// @desc    Search team by team number (1-80)
// @access  Evaluator
router.get('/search/:teamNumber', async (req, res) => {
    try {
        const teamNumber = parseInt(req.params.teamNumber);

        if (isNaN(teamNumber) || teamNumber < 1 || teamNumber > 80) {
            return res.status(400).json({
                success: false,
                message: 'Team number must be between 1 and 80'
            });
        }

        const team = await Team.findOne({ teamNumber })
            .select('teamName teamNumber domain members tasks scores isFlashRoundSelected totalScore');

        if (!team) {
            return res.status(404).json({ success: false, message: `Team ${teamNumber} not found` });
        }

        // Validate that the team is in the evaluator's domain
        if (req.user.domain && team.domain !== req.user.domain) {
            return res.status(403).json({
                success: false,
                message: `Team ${teamNumber} is not in your assigned domain (${req.user.domain})`
            });
        }

        res.json({
            success: true,
            data: team
        });
    } catch (error) {
        console.error('Search team error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/evaluator/teams/:teamId
// @desc    Get team details with scores
// @access  Evaluator
router.get('/teams/:teamId', async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId)
            .select('teamName teamNumber domain members tasks scores isFlashRoundSelected totalScore');

        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Validate that the team is in the evaluator's domain
        if (req.user.domain && team.domain !== req.user.domain) {
            return res.status(403).json({
                success: false,
                message: 'This team is not in your assigned domain'
            });
        }

        res.json({
            success: true,
            data: team
        });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/evaluator/teams/:teamId/score/:round
// @desc    Submit or update score for a round
// @access  Evaluator
router.post('/teams/:teamId/score/:round',
    [
        param('teamId').isMongoId().withMessage('Invalid team ID'),
        param('round').isIn(['round1', 'round2', 'round3', 'round4']).withMessage('Invalid round'),
        body('score').isNumeric().withMessage('Score must be a number')
            .isFloat({ min: 0 }).withMessage('Score cannot be negative'),
        body('feedback').optional().isString().trim().isLength({ max: 500 })
            .withMessage('Feedback must be a string with max 500 characters')
    ],
    async (req, res) => {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        try {
            const { teamId, round } = req.params;
            const { score, feedback } = req.body;

            const validRounds = ['round1', 'round2', 'round3', 'round4'];
            if (!validRounds.includes(round)) {
                return res.status(400).json({ success: false, message: 'Invalid round' });
            }

            const team = await Team.findById(teamId);
            if (!team) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }

            // Check if Flash Round is selected for round4
            if (round === 'round4' && !team.isFlashRoundSelected) {
                return res.status(400).json({
                    success: false,
                    message: 'This team is not selected for Flash Round'
                });
            }

            const maxScore = team.scores[round].maxScore;

            // Validate score
            if (score < 0 || score > maxScore) {
                return res.status(400).json({
                    success: false,
                    message: `Score must be between 0 and ${maxScore}`
                });
            }

            // Check if this evaluator has already scored this round
            const existingEvaluationIndex = team.scores[round].evaluations.findIndex(
                e => e.evaluatorId.toString() === req.user._id.toString()
            );

            const newEvaluation = {
                evaluatorId: req.user._id,
                evaluatorName: req.user.name,
                evaluatorType: req.user.evaluatorType || 'staff',
                score: score,
                parameters: req.body.parameters || {},
                feedback: feedback || '',
                evaluatedAt: new Date()
            };

            if (existingEvaluationIndex !== -1) {
                // Reject update if already evaluated
                return res.status(400).json({
                    success: false,
                    message: 'You have already submitted an evaluation for this round. Modifying submitted scores is not allowed.'
                });
            } else {
                // Add new evaluation
                team.scores[round].evaluations.push(newEvaluation);
            }

            // Save will trigger automatic weighted score calculation
            await team.save();

            res.json({
                success: true,
                message: `Score ${existingEvaluationIndex !== -1 ? 'updated' : 'submitted'} for ${round}`,
                data: {
                    teamName: team.teamName,
                    round: round,
                    yourScore: score,
                    maxScore: maxScore,
                    finalScore: team.scores[round].finalScore,
                    totalEvaluations: team.scores[round].evaluations.length,
                    totalScore: team.totalScore
                }
            });
        } catch (error) {
            console.error('Submit score error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

// @route   GET /api/evaluator/flash-round-teams
// @desc    Get Flash Round teams only (filtered by evaluator's domain)
// @access  Evaluator
router.get('/flash-round-teams', async (req, res) => {
    try {
        const query = { isFlashRoundSelected: true };
        if (req.user.domain) {
            query.domain = req.user.domain;
        }

        const teams = await Team.find(query)
            .select('teamName teamNumber domain scores totalScore')
            .sort({ teamNumber: 1 });

        res.json({
            success: true,
            count: teams.length,
            data: teams
        });
    } catch (error) {
        console.error('Get flash round teams error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/evaluator/teams/:teamId/tasks/:round
// @desc    Update tasks for a team's round (Student Evaluators only)
// @access  Evaluator (Student)
router.put('/teams/:teamId/tasks/:round', async (req, res) => {
    try {
        if (req.user.evaluatorType !== 'student') {
            return res.status(403).json({ success: false, message: 'Only student evaluators can manage tasks' });
        }

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

        if (req.user.domain && team.domain !== req.user.domain) {
            return res.status(403).json({ success: false, message: 'This team is not in your assigned domain' });
        }

        if (!team.tasks) team.tasks = {};

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
            data: team.tasks[round]
        });
    } catch (error) {
        console.error('Update tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/evaluator/teams/:teamId/publish/:round
// @desc    Publish tasks to make them visible to team lead (Student Evaluators only)
// @access  Evaluator (Student)
router.post('/teams/:teamId/publish/:round', async (req, res) => {
    try {
        if (req.user.evaluatorType !== 'student') {
            return res.status(403).json({ success: false, message: 'Only student evaluators can publish tasks' });
        }

        const { teamId, round } = req.params;

        const validRounds = ['round1', 'round2', 'round3', 'round4'];
        if (!validRounds.includes(round)) {
            return res.status(400).json({ success: false, message: 'Invalid round' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        if (req.user.domain && team.domain !== req.user.domain) {
            return res.status(403).json({ success: false, message: 'This team is not in your assigned domain' });
        }

        if (!team.tasks?.[round] || team.tasks[round].length === 0) {
            return res.status(400).json({ success: false, message: 'No tasks found for this round to publish' });
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
            data: team.tasks[round]
        });
    } catch (error) {
        console.error('Publish tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
