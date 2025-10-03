const { prisma } = require('../db');

function ensureTrimmedString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return trimmed;
}

function normalizeRunDate(runDate) {
  if (runDate instanceof Date) {
    if (Number.isNaN(runDate.getTime())) {
      throw new Error('runDate must be a valid date');
    }

    return runDate;
  }

  if (typeof runDate === 'string' || typeof runDate === 'number') {
    const parsed = new Date(runDate);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error('runDate must be a valid date');
    }

    return parsed;
  }

  throw new Error('runDate must be a Date instance or a parseable value');
}

function normalizeExpValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

async function upsertGuild(name, world, db = prisma) {
  const trimmedName = ensureTrimmedString(name, 'Guild name');
  const trimmedWorld = ensureTrimmedString(world, 'World');

  return db.guild.upsert({
    where: {
      name_world: {
        name: trimmedName,
        world: trimmedWorld,
      },
    },
    update: {},
    create: {
      name: trimmedName,
      world: trimmedWorld,
    },
  });
}

async function upsertPlayer(name, db = prisma) {
  const trimmedName = ensureTrimmedString(name, 'Player name');

  return db.player.upsert({
    where: { name: trimmedName },
    update: {},
    create: { name: trimmedName },
  });
}

async function saveDailyExp({ guildName, world, runDate, items }) {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }

  const normalizedRunDate = normalizeRunDate(runDate);

  return prisma.$transaction(async (tx) => {
    const guild = await upsertGuild(guildName, world, tx);
    const savedEntries = [];

    for (const item of items) {
      if (!item || typeof item.name !== 'string' || item.name.trim().length === 0) {
        continue;
      }

      const player = await upsertPlayer(item.name, tx);
      const expYesterday = normalizeExpValue(
        item.expYesterday ?? item.exp_yesterday ?? 0,
      );

      const dailyExp = await tx.dailyExp.upsert({
        where: {
          playerId_guildId_runDate: {
            playerId: player.id,
            guildId: guild.id,
            runDate: normalizedRunDate,
          },
        },
        update: {
          expYesterday,
        },
        create: {
          playerId: player.id,
          guildId: guild.id,
          runDate: normalizedRunDate,
          expYesterday,
        },
      });

      savedEntries.push(dailyExp);
    }

    return {
      guild,
      entries: savedEntries,
    };
  });
}

module.exports = {
  upsertGuild,
  upsertPlayer,
  saveDailyExp,
};
