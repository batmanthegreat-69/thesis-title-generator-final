require('dotenv').config();
const express = require('express');
const { buildMessages } = require('./lib/promptBuilder');
const { generateTitles } = require('./lib/groqClient');
const { filterAndRank } = require('./lib/noveltyFilter');
const referenceTitles = require('./lib/referenceTitles.json');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate', async (req, res) => {
  const { program, community, platform, domain, method } = req.body || {};

  if (!program || !community || !platform || !domain || !method) {
    return res.status(400).json({
      error: 'Missing one or more required fields: program, community, platform, domain, method',
    });
  }

  try {
    const messages = buildMessages({ program, community, platform, domain, method, count: 8 });
    const candidates = await generateTitles(messages);

    if (candidates.length === 0) {
      return res.status(502).json({ error: 'The model returned no usable titles. Try again.' });
    }

    const ranked = await filterAndRank(candidates, referenceTitles);

    res.json({
      candidatesGenerated: candidates.length,
      candidatesAfterFilter: ranked.length,
      titles: ranked.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Thesis title generator running at http://localhost:${PORT}`);
});
