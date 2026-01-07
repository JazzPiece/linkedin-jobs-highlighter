// --- Storage helpers -------------------------------------------------
const STORAGE_KEY = "appliedJobIds"; // { [jobId: string]: timestamp }

async function getAppliedMap() {
  const obj = await chrome.storage.local.get(STORAGE_KEY);
  return obj[STORAGE_KEY] || {};
}

async function setApplied(jobId) {
  const map = await getAppliedMap();
  if (!map[jobId]) {
    map[jobId] = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEY]: map });
  }
}

function onStorageChange(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) callback();
  });
}

// --- DOM utilities ---------------------------------------------------
function extractJobIdFromUrl(url) {
  // Matches: /jobs/view/1234567890/ or /jobs/view/1234567890/?...
  const m = String(url).match(/\/jobs\/view\/(\d{5,})/);
  return m ? m[1] : null;
}

function findAllJobCardNodes() {
  // Common containers on results pages (LinkedIn changes these occasionally)
  // We focus on <a> links that point to /jobs/view/<id>
  const anchors = document.querySelectorAll('a[href*="/jobs/view/"]');
  const cards = new Map(); // jobId -> cardElement
  anchors.forEach(a => {
    const id = extractJobIdFromUrl(a.getAttribute("href"));
    if (!id) return;

    // Walk up to a visual card container (heuristics)
    const card = a.closest('li, div.jobs-search-results__list-item, div.job-card-container, div.jobs-search__results-list li') || a.closest("div");
    if (card && !cards.has(id)) cards.set(id, card);
  });
  return cards; // Map<jobId, element>
}

function annotateCard(el) {
  if (!el || el.classList.contains("li-applied-job-card")) return;
  el.classList.add("li-applied-job-card");

  // Add small "Applied" badge beside title if possible
  const title = el.querySelector('a[href*="/jobs/view/"]') || el.querySelector("h3,h2");
  if (title && !title.querySelector(".li-applied-badge")) {
    const tag = document.createElement("span");
    tag.className = "li-applied-badge";
    tag.textContent = "Applied";
    title.appendChild(tag);
  }
}

// Try to auto-detect "Applied" or similar on the card/details
function cardShowsApplied(el) {
  const txt = (el.textContent || "").toLowerCase();
  // Common phrases LinkedIn uses:
  // "Applied", "You applied", "Application submitted", "Applied on"
  return /\b(applied|you applied|application submitted|applied on)\b/i.test(txt);
}

// On job detail page, try to insert a “Mark as Applied” button
function injectMarkAppliedButton(jobId) {
  if (!jobId) return;

  // Find a stable header zone (heuristic)
  const header = document.querySelector('[data-test-id="job-details"]') ||
                 document.querySelector(".jobs-details-top-card") ||
                 document.querySelector("main");

  if (!header || header.querySelector(".li-mark-applied-btn")) return;

  const btn = document.createElement("button");
  btn.className = "li-mark-applied-btn";
  btn.textContent = "Mark as Applied";
  btn.addEventListener("click", async () => {
    await setApplied(jobId);
    btn.textContent = "Marked ✓";
  });

  // Put it near the Save/Follow button row if present
  const btnRow = header.querySelector('[data-test-id="top-card-buttons-container"]') ||
                 header.querySelector('[class*="jobs-save-button"]') ||
                 header;
  btnRow.appendChild(btn);
}

// If details page text says you already applied, store it automatically
async function autoDetectAndStoreAppliedOnDetails(jobId) {
  if (!jobId) return;
  const txt = (document.body.textContent || "").toLowerCase();
  if (/\b(applied|you applied|application submitted|applied on)\b/i.test(txt)) {
    await setApplied(jobId);
  }
}

// --- Main highlighter workflow --------------------------------------
async function highlightApplied() {
  const appliedMap = await getAppliedMap();
  const cards = findAllJobCardNodes();

  // 1) Cards that explicitly show "Applied" -> highlight & store
  for (const [jobId, el] of cards.entries()) {
    if (cardShowsApplied(el)) {
      annotateCard(el);
      if (!appliedMap[jobId]) await setApplied(jobId);
    }
  }

  // 2) Highlight any card whose jobId we’ve already stored
  const updatedMap = await getAppliedMap();
  for (const [jobId, el] of cards.entries()) {
    if (updatedMap[jobId]) annotateCard(el);
  }
}

// Observe dynamic/infinite scrolling updates
const observer = new MutationObserver(() => {
  highlightApplied();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

// Re-run when storage changes (e.g., when you mark from a details page)
onStorageChange(() => highlightApplied());

// Boot
(async function init() {
  await highlightApplied();

  // If on a job-view page, offer a manual mark button and auto-detect applied
  const currentId = extractJobIdFromUrl(location.pathname + location.search);
  injectMarkAppliedButton(currentId);
  autoDetectAndStoreAppliedOnDetails(currentId);
})();
