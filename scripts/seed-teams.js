const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Team = require('../models/Team');

const CSV_PATH = '../credentials.csv';

const VALID_DOMAINS = [
    'Web Development', 'Web3 & Blockchain', 'IoT Systems',
    'Quantum Computing', 'Cyber Security', 'Machine Learning',
    'Agentic AI', 'App Development'
];

async function seedTeams() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected');

        const raw = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n');

        let successCount = 0;
        let skipCount = 0;

        // Auto increment team number
        let teamNumber = 1;

        for (let i = 1; i < raw.length; i++) {
            // Basic parsing handles quoted parts properly
            const cols = [];
            let cur = '', inQ = false;
            for (let c of raw[i]) {
                if (c === '"') { inQ = !inQ; }
                else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
                else cur += c;
            }
            cols.push(cur.trim());

            const [email, password, teamName, teamSize, leadName, m1, m2, m3, m4, m5, domainRaw] = cols;

            if (!email || !password || !teamName) continue;

            // Correct domain to exactly match schema
            const domainClean = domainRaw.replace(/[.,]/g, '').trim();
            let domain = VALID_DOMAINS.find(d => d.toLowerCase() === domainClean.toLowerCase());
            if (!domain) {
                // Fuzzy match for typo case, eg: Web development
                domain = VALID_DOMAINS.find(d => domainClean.toLowerCase().includes(d.toLowerCase())) || VALID_DOMAINS[0];
            }

            // Prepare members array
            const members = [];
            [m1, m2, m3, m4, m5].forEach(m => {
                if (m && m.trim() !== '') {
                    members.push({ name: m.trim(), email: '' });
                }
            });

            // 1. Create or Find User (Team Lead)
            let user = await User.findOne({ email: email.toLowerCase() });

            if (!user) {
                user = await User.create({
                    name: leadName.trim(),
                    email: email.toLowerCase(),
                    password: password.trim(),
                    role: 'team_lead',
                    domain: domain
                });
            } else {
                console.log(`⚠️ User ${email} already exists, skipping team creation.`);
                skipCount++;
                continue;
            }

            // 2. Create Team
            const team = await Team.create({
                teamName: teamName.trim(),
                teamNumber: teamNumber++,
                domain: domain,
                leadId: user._id,
                members: members
            });

            // 3. Link Team to User
            user.teamId = team._id;
            await user.save();

            successCount++;
            console.log(`✅ Seeded Team: ${teamName} (${domain})`);
        }

        console.log(`\n🎉 Seeding Complete!`);
        console.log(`- Successfully added: ${successCount} teams`);
        console.log(`- Skipped (already exist): ${skipCount}`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seedTeams();
