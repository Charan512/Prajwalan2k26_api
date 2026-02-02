const express = require('express');
const router = express.Router();
const Timer = require('../models/Timer');

// @route   POST /api/timer/start
// @desc    Start a new 24-hour countdown timer
// @access  Public (called from external timer website)
router.post('/start', async (req, res) => {
    try {
        const { event, timestamp, message } = req.body;

        // Deactivate any existing active timers
        await Timer.updateMany({ isActive: true }, { isActive: false });

        // Create new timer
        const timer = await Timer.create({
            event: event || 'timer_started',
            startTime: timestamp ? new Date(timestamp) : new Date(),
            message: message || 'Prajwalan 2k26 timer has been ignited!',
            isActive: true
        });

        console.log('🔥 Timer started:', {
            id: timer._id,
            startTime: timer.startTime,
            endTime: timer.endTime,
            message: timer.message
        });

        res.status(201).json({
            success: true,
            message: 'Timer started successfully',
            data: {
                id: timer._id,
                startTime: timer.startTime,
                endTime: timer.endTime,
                duration: timer.duration,
                remainingTime: timer.getRemainingTime(),
                message: timer.message
            }
        });
    } catch (error) {
        console.error('❌ Timer start error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start timer',
            error: error.message
        });
    }
});

// @route   GET /api/timer/active
// @desc    Get the currently active timer
// @access  Public
router.get('/active', async (req, res) => {
    try {
        const timer = await Timer.findOne({ isActive: true }).sort({ createdAt: -1 });

        if (!timer) {
            return res.json({
                success: true,
                data: null,
                message: 'No active timer'
            });
        }

        // Check if timer has expired
        if (timer.isExpired()) {
            timer.isActive = false;
            await timer.save();

            return res.json({
                success: true,
                data: null,
                message: 'Timer has expired'
            });
        }

        res.json({
            success: true,
            data: {
                id: timer._id,
                startTime: timer.startTime,
                endTime: timer.endTime,
                duration: timer.duration,
                remainingTime: timer.getRemainingTime(),
                message: timer.message,
                isActive: timer.isActive
            }
        });
    } catch (error) {
        console.error('❌ Get active timer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active timer',
            error: error.message
        });
    }
});

// @route   POST /api/timer/stop
// @desc    Stop the currently active timer
// @access  Public (or you can add auth middleware)
router.post('/stop', async (req, res) => {
    try {
        const timer = await Timer.findOne({ isActive: true }).sort({ createdAt: -1 });

        if (!timer) {
            return res.status(404).json({
                success: false,
                message: 'No active timer to stop'
            });
        }

        timer.isActive = false;
        await timer.save();

        console.log('⏹️  Timer stopped:', timer._id);

        res.json({
            success: true,
            message: 'Timer stopped successfully',
            data: {
                id: timer._id,
                stoppedAt: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Timer stop error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop timer',
            error: error.message
        });
    }
});

// @route   GET /api/timer/history
// @desc    Get timer history
// @access  Public (or add auth middleware)
router.get('/history', async (req, res) => {
    try {
        const timers = await Timer.find()
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            count: timers.length,
            data: timers
        });
    } catch (error) {
        console.error('❌ Get timer history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get timer history',
            error: error.message
        });
    }
});

module.exports = router;
