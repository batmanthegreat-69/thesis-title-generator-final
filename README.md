# Thesis / Capstone Title Generator

Generates thesis/capstone title suggestions from student-selected preferences
(program, community, platform, domain, method), then filters out titles that
are too similar to existing ones using local sentence embeddings.

## How it works

1. User picks preferences on the form.
2. Backend builds a prompt and calls Groq (free LLM API) to generate 8 candidate titles.
3. Each candidate is embedded locally (transformers.js, `all-MiniLM-L6-v2`) and
   compared against `lib/referenceTitles.json` and against each other.
4. Titles too similar to an existing one are dropped; the rest are ranked by
   novelty score and the top 5 are returned.

This last step is the "intelligent system" component — it's a real ML
technique (embedding similarity) layered on top of the LLM call, not just a
wrapper around someone else's API.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and paste your free Groq API key (get one at console.groq.com/keys)
npm start
```

Then open http://localhost:3000

The first request will be slow (~10-20s) because transformers.js downloads
and caches the embedding model. After that it's fast.

## Improving it further

- **Grow `lib/referenceTitles.json`** with real titles from your school's
  thesis repository — the more real titles it knows about, the better the
  novelty filter gets. Even 30-50 manually collected titles help a lot.
- **Tune `similarityThreshold`** in `lib/noveltyFilter.js` (default 0.85) —
  lower it to be stricter about what counts as "too similar".
- **Check Groq's current model list** at console.groq.com/docs/models before
  your defense — free-tier models get deprecated periodically, and
  `GROQ_MODEL` in `.env` needs to point at one that's still live.
- Consider showing the *dropped* titles too (with "too similar to: X") so
  users understand why the filter rejected them — good for a demo.
