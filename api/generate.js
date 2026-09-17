// Vercel serverless function. Vercel auto-parses JSON request bodies when
// Content-Type: application/json is set (which public/script.js already sends),
// so req.body arrives pre-parsed here, same as with Express.

const { buildMessages } = require('../lib/promptBuilder');
const { generateTitles } = require('../lib/groqClient');
const { filterAndRank } = require('../lib/noveltyFilter');
const referenceTitles = require('../lib/referenceTitles.json');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { program, community, platform, domain, method } = req.body || {};

  if (!program || !community || !platform || !domain || !method) {
    res.status(400).json({
      error: 'Missing one or more required fields: program, community, platform, domain, method',
    });
    return;
  }

  try {
    const messages = buildMessages({ program, community, platform, domain, method, count: 8 });
    const candidates = await generateTitles(messages);

    if (candidates.length === 0) {
      res.status(502).json({ error: 'The model returned no usable titles. Try again.' });
      return;
    }

    const ranked = await filterAndRank(candidates, referenceTitles);

    res.status(200).json({
      candidatesGenerated: candidates.length,
      candidatesAfterFilter: ranked.length,
      titles: ranked.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
