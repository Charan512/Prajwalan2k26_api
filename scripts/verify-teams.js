const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');
const Team = require('../models/Team');

const verifyTeams = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected\n');

        const csvContent = fs.readFileSync(path.join(__dirname, '../../credentials.csv'), 'utf-8');
        const rows = csvContent.trim().split('\n').filter(row => row.trim());

        // Skip header row
        rows.shift();

        let missingTeams = [];
        let matchingTeams = 0;

        console.log(`Checking ${rows.length} teams from credentials.csv...\n`);

        for (const row of rows) {
            // Some CSVs use commas inside quotes, but this simple one doesn't seem to.
            // Just split by comma.
            const cols = row.split(',');
            const email = cols[0].trim().toLowerCase();
            const teamName = cols[2].trim();
            const originalDomain = cols[cols.length - 1].trim();

            // Try to find the team lead user
            const leadUser = await User.findOne({ email, role: 'team_lead' });

            if (!leadUser) {
                missingTeams.push({ teamName, email, reason: 'No Team Lead User found' });
                continue;
            }

            // check if the team document exists
            const team = await Team.findOne({ leadId: leadUser._id });

            if (!team) {
                missingTeams.push({ teamName, email, reason: 'Team Lead exists, but Team document is missing' });
            } else {
                matchingTeams++;
            }
        }

        console.log(`✅ Found ${matchingTeams} matching teams in the database.`);

        if (missingTeams.length > 0) {
            console.log(`\n❌ Found ${missingTeams.length} missing or incomplete teams:`);
            console.table(missingTeams);
        } else {
            console.log('\n🎉 ALL TEAMS ARE ACCOUNTED FOR IN THE DATABASE!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nMongoDB Disconnected');
    }
};

verifyTeams();
