import mongoose from 'mongoose';
import { initBot } from './bot';
import dotenv from 'dotenv';

dotenv.config();

// Validate critical Env variables immediately
if (!process.env.BOT_TOKEN || !process.env.MONGO_URI || !process.env.MY_CHAT_ID) {
    console.error("❌ MISSING CONFIG: Check your .env file for BOT_TOKEN, MONGO_URI, and MY_CHAT_ID.");
    process.exit(1);
}

const startServer = async () => {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("✅ MongoDB Connected.");

        // Initialize the Bot commands and Cron setup
        initBot();

    } catch (error) {
        console.error("❌ Initial Database Connection Failed:", error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.once('SIGINT', () => mongoose.connection.close().then(() => process.exit(0)));
process.once('SIGTERM', () => mongoose.connection.close().then(() => process.exit(0)));

startServer();