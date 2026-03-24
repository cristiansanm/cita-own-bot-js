import { Telegraf } from 'telegraf';
import cron, { ScheduledTask } from 'node-cron';
import { Log } from './models/Log';
import dotenv from 'dotenv';
import { runScraper } from './services/scrapper';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN!);
let job: ScheduledTask | null = null;

// Helper to find the next 00 or 30 minute mark
const getNextScheduleTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    if (minutes < 30) return `${now.getHours()}:30`;
    return `${now.getHours() + 1}:00`;
};

export function initBot() {
    // COMMAND: /start
    bot.command('start', async (ctx) => {
        if (job) {
            return ctx.reply("⚠️ Job already running! Please wait for the next scheduled check.");
        }

        const nextTime = getNextScheduleTime();

        // Cron: '0,30 * * * *' means minute 0 and minute 30 of every hour
        job = cron.schedule('0,30 * * * *', async () => {
            try {
                console.log(`[${new Date().toISOString()}] Starting scheduled scrape...`);
                const result = await runScraper(bot, process.env.MY_CHAT_ID!);
                
                if (result?.success) {
                    await ctx.reply(`✅ CITAS DISPONIBLES!\nOficinas:\n${result.offices?.join('\n')}`);
                } else {
                    console.log("No appointments found this time.");
                }
            } catch (err: any) {
                // Critical error handling: Notify and STOP
                await ctx.reply(`❌ FATAL ERROR: ${err.message}\n\nScheduler has been STOPPED for safety.`);
                job?.stop();
                job = null;
            }
        });

        ctx.reply(`🚀 Scheduler started 24/7!\n📍 Next check: ~${nextTime}\n🔄 Interval: Every 30 mins.`);
    });

    // COMMAND: /stop
    bot.command('stop', (ctx) => {
        if (job) {
            job.stop();
            job = null;
            ctx.reply("🛑 Scheduler stopped successfully.");
        } else {
            ctx.reply("Execution is not currently active.");
        }
    });

    // COMMAND: /last
    bot.command('last', async (ctx) => {
        try {
            const lastLog = await Log.findOne().sort({ timestamp: -1 });
            if (!lastLog) return ctx.reply("No records found in database.");

            const status = lastLog.success ? "✅ FOUND" : "❌ NONE";
            ctx.reply(
                `📊 **Last Try Summary**\n` +
                `🕒 Time: ${lastLog.timestamp.toLocaleString()}\n` +
                `👤 Name: ${lastLog.lastName}\n` +
                `🆔 NIE: ${lastLog.lastNie}\n` +
                `🌎 Country: ${lastLog.lastNationality}\n` +
                `📝 Result: ${status}`
            );
        } catch (err) {
            ctx.reply("Error fetching data from MongoDB.");
        }
    });

    bot.launch().then(() => console.log("🤖 Telegram Bot is online."));
}