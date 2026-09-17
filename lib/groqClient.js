// Thin wrapper around Groq's OpenAI-compatible chat completions endpoint.
// Free tier: sign up at https://console.groq.com — no credit card required.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateTitles(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing. Copy .env.example to .env and add your key.');
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';
  return parseTitleJson(raw);
}

// Models sometimes wrap JSON in ```json fences despite instructions not to.
// Strip those, parse, and defensively normalize each entry's shape.
function parseTitleJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Model did not return valid JSON: ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Model response was not a JSON array of titles.');
  }

  return parsed
    .filter((item) => item && typeof item.title === 'string' && item.title.trim())
    .map((item) => ({
      title: item.title.trim(),
      difficulty: clampDifficulty(item.difficulty),
      clients: Array.isArray(item.clients) ? item.clients.filter(Boolean).slice(0, 3) : [],
      problemStatement: typeof item.problemStatement === 'string' ? item.problemStatement.trim() : '',
      researchGap: typeof item.researchGap === 'string' ? item.researchGap.trim() : '',
    }));
}

function clampDifficulty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3; // default to middle if the model omits it
  return Math.min(5, Math.max(1, Math.round(n)));
}

module.exports = { generateTitles };
