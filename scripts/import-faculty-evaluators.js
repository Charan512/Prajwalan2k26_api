const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const updateEvaluators = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // First, delete all existing staff evaluators to ensure a clean slate
        const deleteResult = await User.deleteMany({ role: 'evaluator', evaluatorType: 'staff' });
        console.log(`Cleared ${deleteResult.deletedCount} existing faculty evaluators.`);

        const csvContent = fs.readFileSync(path.join(__dirname, '../../facultyEvaluators.csv'), 'utf-8');
        const rows = csvContent.trim().split('\n').filter(row => row.trim());

        // Skip header row
        rows.shift();

        const insertedUsers = [];

        for (const row of rows) {
            const [name, email, password, domain] = row.split(',').map(s => s.trim());

            // Map the CSV domain to the exact enum expected by the database, just in case of slight mismatches
            let exactDomain = domain;
            if (domain.toLowerCase().includes('iot')) exactDomain = 'IoT Systems';
            if (domain.toLowerCase().includes('ml') || domain.toLowerCase().includes('machine')) exactDomain = 'Machine Learning';
            if (domain.toLowerCase().includes('web dev')) exactDomain = 'Web Development';
            if (domain.toLowerCase().includes('cyber')) exactDomain = 'Cyber Security';
            if (domain.toLowerCase().includes('app')) exactDomain = 'App Development';

            const user = new User({
                name,
                email,
                password,
                role: 'evaluator',
                evaluatorType: 'staff',
                domain: exactDomain
            });
            await user.save();
            insertedUsers.push({ name, email, domain: exactDomain });
        }

        console.log(`Successfully created ${insertedUsers.length} faculty evaluators:`);
        console.table(insertedUsers);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB Disconnected');
    }
};

updateEvaluators();
