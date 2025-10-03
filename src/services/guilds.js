const axios = require('axios');

async function fetchGuilds(world) {
  const url = `https://api.tibiadata.com/v4/guilds/${encodeURIComponent(world)}`;

  try {
    const response = await axios.get(url);
    const guilds = response?.data?.guilds?.guilds_list ?? [];

    const names = guilds
      .map((guild) => (typeof guild?.name === 'string' ? guild.name.trim() : ''))
      .filter((name) => name.length > 0);

    return [...new Set(names)];
  } catch (error) {
    console.error('Failed to fetch guilds:', error);
    return [];
  }
}

module.exports = { fetchGuilds };
