const express = require('express');
const Team = require('../models/Team');
const { protect, requireTeamLead } = require('../middleware/auth');

const router = express.Router();

// All routes require team lead authentication
router.use(protect, requireTeamLead);

// @route   GET /api/teamlead/dashboard
// @desc    Get team info and visible tasks
// @access  Team Lead
router.get('/dashboard', async (req, res) => {
    try {
        const team = await Team.findOne({ leadId: req.user._id });

        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Filter only visible tasks
        const visibleTasks = {
            round1: team.tasks.round1.filter(t => t.visible),
            round2: team.tasks.round2.filter(t => t.visible),
            round3: team.tasks.round3.filter(t => t.visible),
            round4: team.tasks.round4.filter(t => t.visible)
        };

        res.json({
            success: true,
            data: {
                teamName: team.teamName,
                teamNumber: team.teamNumber,
                members: team.members,
                tasks: visibleTasks,
                isFlashRoundSelected: team.isFlashRoundSelected
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/teamlead/tasks
// @desc    Get all visible tasks for the team
// @access  Team Lead
router.get('/tasks', async (req, res) => {
    try {
        const team = await Team.findOne({ leadId: req.user._id });

        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Combine all visible tasks into a single response
        const allTasks = [];

        ['round1', 'round2', 'round3', 'round4'].forEach(round => {
            const roundName = {
                round1: 'Project Explanation',
                round2: 'Progress Demo',
                round3: 'Final Presentation',
                round4: 'Flash Round'
            }[round];

            team.tasks[round].forEach(task => {
                if (task.visible) {
                    allTasks.push({
                        round: round,
                        roundName: roundName,
                        title: task.title,
                        description: task.description
                    });
                }
            });
        });

        res.json({
            success: true,
            data: {
                teamName: team.teamName,
                tasks: allTasks
            }
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
