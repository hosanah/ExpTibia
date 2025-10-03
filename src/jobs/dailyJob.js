require('dotenv').config();

const cron = require('node-cron');

const { fetchGuilds } = require('../services/guilds');
const { scrapeGuildMembers } = require('../services/scraper');
const { saveDailyExp } = require('../services/save');

const WORLD = process.env.WORLD;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 0 * * *';

if (!WORLD) {
  throw new Error('WORLD environment variable must be defined');
}

async function runDailyJob(world, runDate = new Date()) {
  try {
    const guilds = await fetchGuilds(world);

    for (const guildName of guilds) {
      try {
        const members = await scrapeGuildMembers(guildName);
        const playersCount = members.length;
        const totalExp = members.reduce((sum, member) => {
          const value =
            typeof member.exp_yesterday === 'number'
              ? member.exp_yesterday
              : Number.parseInt(member.exp_yesterday ?? member.expYesterday ?? 0, 10);

          if (Number.isNaN(value)) {
            return sum;
          }

          return sum + value;
        }, 0);

        await saveDailyExp({
          guildName,
          world,
          runDate,
          items: members,
        });

        console.log('[dailyJob] Summary', {
          guild: guildName,
          playersCount,
          totalExp,
        });
      } catch (guildError) {
        console.error(`[dailyJob] Failed processing guild ${guildName}:`, guildError);
      }
    }
  } catch (error) {
    console.error('[dailyJob] Failed to execute job:', error);
  }
}

const job = cron.schedule(
  CRON_SCHEDULE,
  () => {
    runDailyJob(WORLD, new Date());
  },
  { scheduled: false }
);

job.start();

module.exports = { job, runDailyJob };
