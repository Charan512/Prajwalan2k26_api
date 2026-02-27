const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const checkTeamLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const emailToFind = 'venkatkrishna.2023@gmail.com';
        const passwordToTest = 'hydr7075';
        console.log(`Testing login for: '${emailToFind}'`);

        const user = await User.findOne({ email: emailToFind }).select('+password');

        if (!user) {
            console.log('\n❌ USER NOT FOUND');
            return;
        }

        console.log('\nUser found:', user.email);

        const isMatch = await user.matchPassword(passwordToTest);

        if (isMatch) {
            console.log(`\n✅ Login SUCCESS! Password '${passwordToTest}' is correct.`);
        } else {
            console.log(`\n❌ Login FAILED! Password '${passwordToTest}' does NOT match the hash in DB.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkTeamLogin();
