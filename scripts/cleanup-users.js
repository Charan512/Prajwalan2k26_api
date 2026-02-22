const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function cleanupUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected');

        const result = await mongoose.connection.collection('users').deleteMany({});
        console.log(`🗑️  Deleted ${result.deletedCount} user documents from the users collection.`);

        await mongoose.disconnect();
        console.log('✅ Done. Database is clean.');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

cleanupUsers();
