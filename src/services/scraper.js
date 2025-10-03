const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeGuildMembers(guildName) {
  if (typeof guildName !== 'string' || guildName.trim().length === 0) {
    throw new Error('guildName must be a non-empty string');
  }

  const template = process.env.TARGET_URL_TEMPLATE;
  if (typeof template !== 'string' || template.length === 0) {
    throw new Error('TARGET_URL_TEMPLATE is not defined');
  }

  const url = template.replace('{guild}', encodeURIComponent(guildName));

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const members = [];

    $('tr').each((_, row) => {
      const name = $(row).find('td:nth-child(2)').text().trim();
      const expText = $(row).find('td:nth-child(12)').text().trim();

      if (!name) {
        return;
      }

      const cleanedExpText = expText.replace(/[+,\.\s]/g, '');
      const exp = parseInt(cleanedExpText, 10);

      members.push({
        name,
        exp_yesterday: Number.isNaN(exp) ? 0 : exp,
      });
    });

    return members;
  } catch (error) {
    console.error('Failed to scrape guild members:', error);
    return [];
  }
}

module.exports = { scrapeGuildMembers };
