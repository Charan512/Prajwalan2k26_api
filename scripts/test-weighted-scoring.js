const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env
dotenv.config();

// Import models
const User = require('../models/User');
const Team = require('../models/Team');

const testWeightedScoring = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB\n');

        // Get Team 1 (Web Development domain)
        const team = await Team.findOne({ teamNumber: 1 });
        console.log(`Testing with: ${team.teamName} (${team.domain})\n`);

        // Get evaluators for Web Development domain
        const studentEval = await User.findOne({ domain: 'Web Development', evaluatorType: 'student' });
        const staffEval1 = await User.findOne({ domain: 'Web Development', evaluatorType: 'staff', email: 'evaluator.1@prajwalan.com' });
        const staffEval2 = await User.findOne({ domain: 'Web Development', evaluatorType: 'staff', email: 'evaluator.2@prajwalan.com' });

        console.log('Evaluators:');
        console.log(`  Student: ${studentEval.name} (${studentEval.email})`);
        console.log(`  Staff 1: ${staffEval1.name} (${staffEval1.email})`);
        console.log(`  Staff 2: ${staffEval2.name} (${staffEval2.email})\n`);

        // Test Case 1: Only student evaluator scores
        console.log('═══════════════════════════════════════════════');
        console.log('TEST CASE 1: Only Student Evaluator');
        console.log('═══════════════════════════════════════════════');
        team.scores.round1.evaluations = [{
            evaluatorId: studentEval._id,
            evaluatorName: studentEval.name,
            evaluatorType: 'student',
            score: 20,
            feedback: 'Good work',
            evaluatedAt: new Date()
        }];
        await team.save();

        console.log(`Student score: 20/30`);
        console.log(`Expected final score: 20 * 0.6 = 12`);
        console.log(`Actual final score: ${team.scores.round1.finalScore}`);
        console.log(`✓ Test ${team.scores.round1.finalScore === 12 ? 'PASSED' : 'FAILED'}\n`);

        // Test Case 2: Student + 1 Regular evaluator
        console.log('═══════════════════════════════════════════════');
        console.log('TEST CASE 2: Student + 1 Staff Evaluator');
        console.log('═══════════════════════════════════════════════');
        team.scores.round1.evaluations.push({
            evaluatorId: staffEval1._id,
            evaluatorName: staffEval1.name,
            evaluatorType: 'staff',
            score: 25,
            feedback: 'Excellent',
            evaluatedAt: new Date()
        });
        await team.save();

        console.log(`Student score: 20/30`);
        console.log(`Staff evaluator score: 25/30`);
        console.log(`Expected final score: (20 * 0.6) + (25 * 0.4) = 12 + 10 = 22`);
        console.log(`Actual final score: ${team.scores.round1.finalScore}`);
        console.log(`✓ Test ${team.scores.round1.finalScore === 22 ? 'PASSED' : 'FAILED'}\n`);

        // Test Case 3: Student + 2 Regular evaluators
        console.log('═══════════════════════════════════════════════');
        console.log('TEST CASE 3: Student + 2 Staff Evaluators');
        console.log('═══════════════════════════════════════════════');
        team.scores.round1.evaluations.push({
            evaluatorId: staffEval2._id,
            evaluatorName: staffEval2.name,
            evaluatorType: 'staff',
            score: 27,
            feedback: 'Outstanding',
            evaluatedAt: new Date()
        });
        await team.save();

        console.log(`Student score: 20/30`);
        console.log(`Staff evaluator 1 score: 25/30`);
        console.log(`Staff evaluator 2 score: 27/30`);
        console.log(`Average of staff evaluators: (25 + 27) / 2 = 26`);
        console.log(`Expected final score: (20 * 0.6) + (26 * 0.4) = 12 + 10.4 = 22.4`);
        console.log(`Actual final score: ${team.scores.round1.finalScore}`);
        console.log(`✓ Test ${team.scores.round1.finalScore === 22.4 ? 'PASSED' : 'FAILED'}\n`);

        // Test Case 4: Multiple rounds
        console.log('═══════════════════════════════════════════════');
        console.log('TEST CASE 4: Multiple Rounds Total Score');
        console.log('═══════════════════════════════════════════════');

        // Add scores for round2
        team.scores.round2.evaluations = [
            {
                evaluatorId: studentEval._id,
                evaluatorName: studentEval.name,
                evaluatorType: 'student',
                score: 15,
                feedback: 'Good',
                evaluatedAt: new Date()
            },
            {
                evaluatorId: staffEval1._id,
                evaluatorName: staffEval1.name,
                evaluatorType: 'staff',
                score: 18,
                feedback: 'Great',
                evaluatedAt: new Date()
            }
        ];
        await team.save();

        console.log(`Round 1 final score: ${team.scores.round1.finalScore}`);
        console.log(`Round 2 final score: ${team.scores.round2.finalScore}`);
        console.log(`Expected Round 2: (15 * 0.6) + (18 * 0.4) = 9 + 7.2 = 16.2`);
        console.log(`Expected total: 22.4 + 16.2 = 38.6`);
        console.log(`Actual total score: ${team.totalScore}`);
        console.log(`✓ Test ${team.totalScore === 38.6 ? 'PASSED' : 'FAILED'}\n`);

        console.log('═══════════════════════════════════════════════');
        console.log('✅ All weighted scoring tests completed!');
        console.log('═══════════════════════════════════════════════');

        process.exit(0);
    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
};

testWeightedScoring();
