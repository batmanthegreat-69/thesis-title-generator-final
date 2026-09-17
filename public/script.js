const form = document.getElementById('pref-form');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const btn = document.getElementById('generate-btn');
const communitySelect = document.getElementById('community-select');
const domainSelect = document.getElementById('domain-select');
const domainHint = document.getElementById('domain-hint');

// The full master list of domains, in original order. Nothing is ever removed
// from this list — a community only changes which ones are suggested first.
const ALL_DOMAINS = Array.from(domainSelect.options)
  .map((o) => o.value)
  .filter((v) => v !== '');

// Which domains are typically the best fit for each community setting.
// Anything not listed here for a given community just falls into "Other
// domains" — it's still selectable, just not pushed to the top. This is
// deliberately not a hard restriction: coastal + agriculture is unusual but
// not invalid (e.g. mangrove-based agriculture, aquasilviculture).
const DOMAIN_RELEVANCE = {
  'Urban area': ['Transportation', 'Governance / public service', 'Security', 'Livelihood / commerce', 'Tourism'],
  'Peri-urban area': ['Transportation', 'Livelihood / commerce', 'Governance / public service', 'Environment'],
  'Rural area': ['Agriculture', 'Health', 'Education', 'Livelihood / commerce', 'Environment'],
  'Bukid / agricultural community': ['Agriculture', 'Environment', 'Livelihood / commerce', 'Health'],
  'Coastal community': ['Environment', 'Disaster / safety', 'Livelihood / commerce', 'Tourism', 'Health'],
  'Island / remote community': ['Disaster / safety', 'Health', 'Transportation', 'Environment'],
  'Upland / indigenous community': ['Agriculture', 'Environment', 'Education', 'Health'],
  'Informal settlement / urban poor community': ['Health', 'Governance / public service', 'Security', 'Livelihood / commerce'],
  'Campus / school community': ['Education', 'Security', 'Sports / fitness', 'Accessibility / PWD support'],
};

function rebuildDomainOptions(community, preserveValue) {
  const recommended = DOMAIN_RELEVANCE[community] || [];
  const other = ALL_DOMAINS.filter((d) => !recommended.includes(d));

  domainSelect.innerHTML = '<option value="">-- Select --</option>';

  if (recommended.length) {
    const recGroup = document.createElement('optgroup');
    recGroup.label = `Recommended for ${community}`;
    recommended.forEach((d) => recGroup.appendChild(new Option(d, d)));
    domainSelect.appendChild(recGroup);

    const otherGroup = document.createElement('optgroup');
    otherGroup.label = 'Other domains';
    other.forEach((d) => otherGroup.appendChild(new Option(d, d)));
    domainSelect.appendChild(otherGroup);
  } else {
    // No community picked yet (or unrecognized) — just show the flat list.
    ALL_DOMAINS.forEach((d) => domainSelect.appendChild(new Option(d, d)));
  }

  // Keep whatever the user had already picked, even if it's now in "Other".
  if (preserveValue && ALL_DOMAINS.includes(preserveValue)) {
    domainSelect.value = preserveValue;
  }

  updateDomainHint(community);
}

function updateDomainHint(community) {
  if (!community) {
    domainHint.textContent = '';
    return;
  }
  const isUncommon = domainSelect.value && !(DOMAIN_RELEVANCE[community] || []).includes(domainSelect.value);
  domainHint.textContent = isUncommon
    ? `"${domainSelect.value}" is an uncommon pairing for ${community} — still valid, just less typical.`
    : '';
}

communitySelect.addEventListener('change', () => {
  rebuildDomainOptions(communitySelect.value, domainSelect.value);
});

domainSelect.addEventListener('change', () => {
  updateDomainHint(communitySelect.value);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultsEl.innerHTML = '';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  btn.disabled = true;
  statusEl.textContent = 'Generating titles… (first request may take a moment while the local model loads)';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = `Error: ${data.error || 'something went wrong'}`;
      return;
    }

    statusEl.textContent = `${data.candidatesGenerated} generated, ${data.candidatesAfterFilter} passed the novelty filter.`;

    data.titles.forEach(({ title, difficulty, clients, problemStatement, researchGap, noveltyScore }) => {
      const li = document.createElement('li');
      const stars = '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
      const clientsList = (clients || []).length
        ? clients.join(', ')
        : 'Not specified';

      li.innerHTML = `
        <div class="title-text">${title}</div>
        <div class="difficulty" title="Difficulty: ${difficulty}/5">${stars}</div>
        ${problemStatement ? `<p class="problem"><strong>Problem:</strong> ${problemStatement}</p>` : ''}
        ${researchGap ? `<p class="gap"><strong>Research gap:</strong> ${researchGap}</p>` : ''}
        <div class="clients"><strong>Possible clients:</strong> ${clientsList}</div>
        <div class="novelty">Novelty score: ${noveltyScore}</div>
      `;
      resultsEl.appendChild(li);
    });
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});
