const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);

            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

// Require Admin role
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Require Evaluator role
const requireEvaluator = (req, res, next) => {
    if (req.user && req.user.role === 'evaluator') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Evaluator access required' });
    }
};

// Require Team Lead role
const requireTeamLead = (req, res, next) => {
    if (req.user && req.user.role === 'team_lead') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Team Lead access required' });
    }
};

module.exports = { protect, requireAdmin, requireEvaluator, requireTeamLead };
