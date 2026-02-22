const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Hardcoded admin ID — admin is stateless, no DB record needed
const ADMIN_ID = 'env-admin-only';

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Please provide email and password' });
            }

            // Admin login — stateless, credentials from .env only
            if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
                return res.json({
                    success: true,
                    data: {
                        _id: ADMIN_ID,
                        name: 'Admin',
                        email: process.env.ADMIN_EMAIL,
                        role: 'admin',
                        token: generateToken(ADMIN_ID)
                    }
                });
            }

            // Regular user login (evaluator or team lead)
            const user = await User.findOne({ email }).select('+password');

            if (!user) {
                return res.status(401).json({ success: false, message: 'Email not found. Please check your email address.' });
            }

            const isMatch = await user.matchPassword(password);

            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
            }

            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    teamId: user.teamId,
                    token: generateToken(user._id)
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('teamId');
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
