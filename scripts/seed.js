const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env
dotenv.config();

// Import models
const User = require('../models/User');
const Team = require('../models/Team');

const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Team.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Define domains
        const domains = [
            'Web Development',
            'Web3 & Blockchain',
            'IoT Systems',
            'Quantum Computing',
            'Cyber Security',
            'Machine Learning',
            'Agentic AI',
            'App Development'
        ];

        // Create Admin
        const admin = await User.create({
            email: process.env.ADMIN_EMAIL || 'admin@prajwalan.com',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            name: 'Admin',
            role: 'admin'
        });
        console.log('👤 Admin created:', admin.email);

        // Create sample Evaluators with domains (including student evaluators)
        // For each domain: 1 student evaluator + 2 regular evaluators
        const evaluators = [];
        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];

            // Student evaluator for this domain
            evaluators.push({
                email: `student.eval.${i + 1}@prajwalan.com`,
                password: 'eval123',
                name: `Student Evaluator ${i + 1}`,
                role: 'evaluator',
                domain: domain,
                evaluatorType: 'student'
            });

            // Staff evaluator 1 for this domain
            evaluators.push({
                email: `evaluator.${i * 2 + 1}@prajwalan.com`,
                password: 'eval123',
                name: `Evaluator ${i * 2 + 1}`,
                role: 'evaluator',
                domain: domain,
                evaluatorType: 'staff'
            });

            // Staff evaluator 2 for this domain
            evaluators.push({
                email: `evaluator.${i * 2 + 2}@prajwalan.com`,
                password: 'eval123',
                name: `Evaluator ${i * 2 + 2}`,
                role: 'evaluator',
                domain: domain,
                evaluatorType: 'staff'
            });
        }

        const createdEvaluators = await User.create(evaluators);
        console.log(`👥 Created ${createdEvaluators.length} evaluators (${domains.length} student + ${domains.length * 2} staff) across ${domains.length} domains`);

        // Create sample Teams and Team Leads
        const teamData = [];
        for (let i = 1; i <= 10; i++) {
            // Create team lead
            const teamLead = await User.create({
                email: `team${i}@prajwalan.com`,
                password: 'team123',
                name: `Team Lead ${i}`,
                role: 'team_lead'
            });

            // Create team with domain (distribute evenly)
            const team = await Team.create({
                teamName: `Team ${String.fromCharCode(64 + i)}`, // Team A, B, C, etc.
                teamNumber: i,
                domain: domains[(i - 1) % domains.length], // Cycle through domains
                leadId: teamLead._id,
                members: [
                    { name: `Member 1 of Team ${i}`, email: `member1.team${i}@email.com` },
                    { name: `Member 2 of Team ${i}`, email: `member2.team${i}@email.com` },
                    { name: `Member 3 of Team ${i}`, email: `member3.team${i}@email.com` },
                    { name: `Member 4 of Team ${i}`, email: `member4.team${i}@email.com` },
                    { name: `Member 5 of Team ${i}`, email: `member5.team${i}@email.com` }
                ],
                tasks: {
                    round1: [
                        { title: 'Project Initialization', description: 'Set up the project repository and initialize the codebase.', visible: true },
                        { title: 'Requirement Analysis', description: 'Document the core requirements and features.', visible: true },
                        { title: 'Database Schema Design', description: 'Create the initial ER diagram and schema.', visible: true }
                    ],
                    round2: [
                        { title: 'API Implementation', description: 'Implement the core API endpoints.', visible: true },
                        { title: 'Frontend Prototype', description: 'Build the initial UI prototype.', visible: true }
                    ],
                    round3: [
                        { title: 'Integration Testing', description: 'Verify that all components work together.', visible: true },
                        { title: 'Performance Optimization', description: 'Optimize the application for speed and scale.', visible: true },
                        { title: 'Final Presentation Prep', description: 'Prepare slides and demo video.', visible: true }
                    ],
                    round4: [
                        { title: 'Surprise Challenge', description: 'Solve the flash round algorithmic challenge.', visible: false }
                    ]
                }
            });

            // Update team lead with team reference
            teamLead.teamId = team._id;
            await teamLead.save();

            teamData.push(team);
        }
        console.log(`🏆 Created ${teamData.length} sample teams with team leads`);

        // Select first 2 teams for Flash Round (for testing)
        await Team.updateOne({ teamNumber: 1 }, { isFlashRoundSelected: true, 'scores.round4.maxScore': 20 });
        await Team.updateOne({ teamNumber: 2 }, { isFlashRoundSelected: true, 'scores.round4.maxScore': 20 });
        console.log('⚡ Selected Team 1 and Team 2 for Flash Round');

        console.log('\n✅ Seed completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('─────────────────────────────────');
        console.log('Admin:            admin@prajwalan.com / admin123');
        console.log('Student Eval:     student.eval.1@prajwalan.com / eval123');
        console.log('Regular Eval:     evaluator.1@prajwalan.com / eval123');
        console.log('Team Lead:        team1@prajwalan.com / team123');
        console.log('─────────────────────────────────');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedData();
