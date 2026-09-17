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

## Deploying to Vercel

The project is already structured for Vercel: `public/` is served as static
files automatically, and `api/generate.js` becomes a serverless function.

1. Push this folder to a GitHub repo (make sure `.env` is NOT committed —
   `.gitignore` already excludes it):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com), sign in, click **Add New → Project**,
   and import that GitHub repo.
3. Before deploying, add your environment variables under
   **Settings → Environment Variables**:
   - `GROQ_API_KEY` = your key from console.groq.com/keys
   - `GROQ_MODEL` = `openai/gpt-oss-120b` (or whatever's current — check
     console.groq.com/docs/models)
4. Deploy. Vercel gives you a live `https://your-project.vercel.app` URL.

### Things to expect on Vercel specifically

- **First request after a cold start will be slow** (10-20+ seconds) — the
  embedding model downloads fresh into `/tmp` each time a new function
  instance spins up, since Vercel's filesystem doesn't persist between cold
  starts the way a normal server's disk would. `vercel.json` already extends
  the function timeout to 60s to give this room; if you still see timeouts,
  that's the first thing to check.
- If you outgrow Vercel's free-tier limits or the cold-start delay becomes
  a real problem for a live demo, a platform with an always-on server
  (Render, Railway) avoids the cold-start/model-redownload issue entirely,
  since the model stays cached in memory. Worth keeping in mind if this
  needs to be reliably fast during your defense.
- `npm start` locally still uses `server.js`/Express exactly as before —
  the Vercel deployment path (`api/generate.js`) is a parallel copy of that
  same logic, not a replacement for local dev.

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
