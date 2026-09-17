// This is the "intelligence" layer beyond the LLM call: it scores each
// generated title for similarity against known/reference titles and against
// each other, so near-duplicates and overly generic titles get filtered out.
//
// Runs fully local via transformers.js — no extra API key needed.
// First run downloads the model (~25MB) and caches it.

const { pipeline } = require('@xenova/transformers');

let embedder = null;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

async function embed(text) {
  const model = await getEmbedder();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are already normalized, so dot product = cosine similarity
}

/**
 * @param {{title: string, difficulty: number, clients: string[], problemStatement: string, researchGap: string}[]} candidates
 * @param {string[]} referenceTitles - known/past titles to check novelty against
 * @param {number} similarityThreshold - above this, a title is considered "too similar"
 * @returns {Promise<Array<{title: string, difficulty: number, clients: string[], problemStatement: string, researchGap: string, noveltyScore: number}>>}
 */
async function filterAndRank(candidates, referenceTitles = [], similarityThreshold = 0.85) {
  const candidateVectors = await Promise.all(candidates.map((c) => embed(c.title)));
  const referenceVectors = await Promise.all(referenceTitles.map(embed));

  const kept = [];
  for (let i = 0; i < candidates.length; i++) {
    const vec = candidateVectors[i];

    // Check against reference titles (past/known theses)
    const maxRefSim = referenceVectors.length
      ? Math.max(...referenceVectors.map((rv) => cosineSimilarity(vec, rv)))
      : 0;
    if (maxRefSim >= similarityThreshold) continue; // too close to an existing title

    // Check against titles already kept from this batch (dedupe near-identical outputs)
    const dupInBatch = kept.some((k) => cosineSimilarity(vec, k.vector) >= similarityThreshold);
    if (dupInBatch) continue;

    // Novelty score: 1 - similarity to nearest known title (higher = more novel)
    kept.push({ ...candidates[i], vector: vec, noveltyScore: 1 - maxRefSim });
  }

  return kept
    .sort((a, b) => b.noveltyScore - a.noveltyScore)
    .map(({ title, difficulty, clients, problemStatement, researchGap, noveltyScore }) => ({
      title,
      difficulty,
      clients,
      problemStatement,
      researchGap,
      noveltyScore: Number(noveltyScore.toFixed(3)),
    }));
}

module.exports = { filterAndRank, embed, cosineSimilarity };
