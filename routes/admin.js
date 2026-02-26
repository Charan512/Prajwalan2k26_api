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

// @route   PUT /api/admin/teams/:teamId/faculty-score/:round
// @desc    Update faculty average score for a round (admin override)
// @access  Admin
router.put('/teams/:teamId/faculty-score/:round',
    [
        param('teamId').isMongoId().withMessage('Invalid team ID'),
        param('round').isIn(['round1', 'round2', 'round3', 'round4']).withMessage('Invalid round'),
        body('facultyScore').isFloat({ min: 0 }).withMessage('Faculty score must be a positive number')
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
            const { teamId, round } = req.params;
            const { facultyScore } = req.body;

            const team = await Team.findById(teamId);
            if (!team) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }

            const roundScore = team.scores[round];
            const maxScore = roundScore.maxScore;

            // Validate faculty score doesn't exceed max
            if (facultyScore > maxScore) {
                return res.status(400).json({
                    success: false,
                    message: `Faculty score cannot exceed ${maxScore}`
                });
            }

            // Get all staff evaluations
            const staffEvaluations = roundScore.evaluations.filter(e => e.evaluatorType === 'staff');

            if (staffEvaluations.length === 0) {
                // Create a synthetic staff evaluation if none exist
                roundScore.evaluations.push({
                    evaluatorId: req.user._id,
                    evaluatorName: 'Admin Override',
                    evaluatorType: 'staff',
                    score: facultyScore,
                    parameters: {},
                    feedback: 'Admin adjusted faculty score',
                    evaluatedAt: new Date()
                });
            } else {
                // Update all staff evaluations to have the same score (to maintain average)
                staffEvaluations.forEach(evaluation => {
                    const index = roundScore.evaluations.findIndex(
                        e => e.evaluatorId.toString() === evaluation.evaluatorId.toString()
                    );
                    if (index !== -1) {
                        roundScore.evaluations[index].score = facultyScore;
                        roundScore.evaluations[index].feedback = (roundScore.evaluations[index].feedback || '') + ' [Admin adjusted]';
                    }
                });
            }

            // Save will trigger automatic weighted score recalculation
            await team.save();

            res.json({
                success: true,
                message: `Faculty score updated for ${round}`,
                data: {
                    teamName: team.teamName,
                    round: round,
                    facultyScore: facultyScore,
                    finalScore: team.scores[round].finalScore,
                    totalScore: team.totalScore
                }
            });
        } catch (error) {
            console.error('Update faculty score error:', error);
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

// Helper function to format CSV field safely
const escapeCsvField = (field) => {
    if (field === null || field === undefined) return 'N/A';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

// @route   GET /api/admin/export/:type
// @desc    Export team scores to CSV
// @access  Admin
router.get('/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['round1', 'round2', 'round3', 'round4', 'final'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid export type' });
        }

        const teams = await Team.find()
            .populate('leadId', 'name email')
            .sort({ totalScore: -1 });

        let csvContent = '';

        if (type === 'final') {
            csvContent += 'S.No,Team Name,Domain,Round 1 Score,Round 2 Score,Round 3 Score,Round 4 Score,Total Score\n';
            teams.forEach((team, index) => {
                const sNo = index + 1;
                const r1 = team.scores?.round1?.finalScore ?? '0';
                const r2 = team.scores?.round2?.finalScore ?? '0';
                const r3 = team.scores?.round3?.finalScore ?? '0';
                const r4 = team.scores?.round4?.finalScore ?? '0';
                csvContent += `${sNo},${escapeCsvField(team.teamName)},${escapeCsvField(team.domain)},${r1},${r2},${r3},${r4},${team.totalScore}\n`;
            });
        } else {
            // Parameter definitions per round (must match frontend)
            const roundParameters = {
                round1: ['Idea', 'Product Potential', 'Innovation', 'Social Significance', 'Sustainability'],
                round2: ['Implementation', 'Task Completion', 'Presentation', 'Tech Stack', 'Team Work'],
                round3: ['Amount of Completion', 'Presentation', 'Working', 'Tasks', 'UI/UX', 'Future Scope'],
                round4: [] // Flash round – no parameters
            };

            const params = roundParameters[type] || [];

            // Build CSV header
            const facultyParamHeaders = params.map(p => `faculty_${p}`);
            const studentParamHeaders = params.map(p => `student_${p}`);

            if (params.length > 0) {
                csvContent += [
                    'S.No', 'Team Name', 'Domain',
                    'Faculty Total (avg)', ...facultyParamHeaders,
                    'Student Total', ...studentParamHeaders,
                    'Cumulative Score'
                ].join(',') + '\n';
            } else {
                // Flash round – no parameters
                csvContent += 'S.No,Team Name,Domain,Faculty Score,Student Score,Cumulative Score\n';
            }

            teams.forEach((team, index) => {
                const sNo = index + 1;
                const roundData = team.scores?.[type];
                const evaluations = roundData?.evaluations || [];
                const cumulativeScore = roundData?.finalScore ?? 'N/A';

                const staffEvals = evaluations.filter(e => e.evaluatorType === 'staff');
                const studentEval = evaluations.find(e => e.evaluatorType === 'student');

                if (params.length > 0) {
                    // --- Per-parameter averages for faculty ---
                    const facultyTotals = {};
                    params.forEach(p => { facultyTotals[p] = 0; });

                    if (staffEvals.length > 0) {
                        staffEvals.forEach(ev => {
                            const paramMap = ev.parameters instanceof Map
                                ? Object.fromEntries(ev.parameters)
                                : (ev.parameters || {});
                            params.forEach(p => {
                                facultyTotals[p] += Number(paramMap[p] || 0);
                            });
                        });
                        params.forEach(p => {
                            facultyTotals[p] = parseFloat((facultyTotals[p] / staffEvals.length).toFixed(2));
                        });
                    }

                    const facultyTotal = staffEvals.length > 0
                        ? parseFloat((staffEvals.reduce((s, e) => s + e.score, 0) / staffEvals.length).toFixed(2))
                        : 'N/A';

                    // --- Per-parameter values for student ---
                    const studentParamValues = {};
                    params.forEach(p => { studentParamValues[p] = 'N/A'; });
                    const studentTotal = studentEval ? studentEval.score : 'N/A';

                    if (studentEval) {
                        const paramMap = studentEval.parameters instanceof Map
                            ? Object.fromEntries(studentEval.parameters)
                            : (studentEval.parameters || {});
                        params.forEach(p => {
                            studentParamValues[p] = paramMap[p] !== undefined ? paramMap[p] : 'N/A';
                        });
                    }

                    const facultyParamValues = params.map(p =>
                        staffEvals.length > 0 ? facultyTotals[p] : 'N/A'
                    );
                    const studentParamCols = params.map(p => studentParamValues[p]);

                    csvContent += [
                        sNo,
                        escapeCsvField(team.teamName),
                        escapeCsvField(team.domain),
                        facultyTotal,
                        ...facultyParamValues,
                        studentTotal,
                        ...studentParamCols,
                        cumulativeScore
                    ].join(',') + '\n';

                } else {
                    // Flash round
                    const facultyScore = staffEvals.length > 0
                        ? parseFloat((staffEvals.reduce((s, e) => s + e.score, 0) / staffEvals.length).toFixed(2))
                        : 'N/A';
                    const studentScore = studentEval ? studentEval.score : 'N/A';

                    csvContent += `${sNo},${escapeCsvField(team.teamName)},${escapeCsvField(team.domain)},${facultyScore},${studentScore},${cumulativeScore}\n`;
                }
            });
        }

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=prajwalan_${type}_results.csv`);

        res.status(200).send(csvContent);

    } catch (error) {
        console.error('CSV Export error:', error);
        res.status(500).json({ success: false, message: 'Server error during export' });
    }
});

module.exports = router;
