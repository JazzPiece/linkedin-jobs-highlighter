// V2 Content Script - Integrates with StorageManager for rich job tracking
import { storageManager } from './src/shared/storage.js';
import { runMigrationIfNeeded } from './src/utils/migration.js';

// --- Job Data Extraction -------------------------------------------------

/**
 * Extract job metadata from a job card element
 * @param {HTMLElement} cardElement - The job card DOM element
 * @param {string} jobId - The LinkedIn job ID
 * @returns {Object} Job data object
 */
function extractJobMetadata(cardElement, jobId) {
  const metadata = {
    id: jobId,
    title: '',
    company: '',
    url: `https://www.linkedin.com/jobs/view/${jobId}`,
    dateApplied: Date.now(),
    metadata: {
      location: '',
      salary: '',
      remote: false
    }
  };

  try {
    // Extract job title
    const titleEl = cardElement.querySelector('a[href*="/jobs/view/"]') ||
                   cardElement.querySelector('h3, h2, .job-card-list__title');
    if (titleEl) {
      metadata.title = titleEl.textContent?.trim() || '';
    }

    // Extract company name
    const companyEl = cardElement.querySelector('.job-card-container__company-name') ||
                     cardElement.querySelector('[data-test-id="job-card-company-name"]') ||
                     cardElement.querySelector('.artdeco-entity-lockup__subtitle');
    if (companyEl) {
      metadata.company = companyEl.textContent?.trim() || '';
    }

    // Extract location
    const locationEl = cardElement.querySelector('.job-card-container__metadata-item') ||
                      cardElement.querySelector('[data-test-id="job-card-location"]') ||
                      cardElement.querySelector('.artdeco-entity-lockup__caption');
    if (locationEl) {
      metadata.metadata.location = locationEl.textContent?.trim() || '';
    }

    // Check if remote
    const text = cardElement.textContent?.toLowerCase() || '';
    metadata.metadata.remote = /\b(remote|work from home|wfh)\b/i.test(text);

    // Extract salary if present
    const salaryEl = cardElement.querySelector('.job-card-container__metadata-salary') ||
                    cardElement.querySelector('[class*="salary"]');
    if (salaryEl) {
      metadata.metadata.salary = salaryEl.textContent?.trim() || '';
    }
  } catch (error) {
    console.warn('[LinkedInHighlighter] Error extracting metadata:', error);
  }

  return metadata;
}

/**
 * Extract job metadata from detail page (more complete data)
 * @param {string} jobId - The LinkedIn job ID
 * @returns {Object} Job data object
 */
function extractJobMetadataFromDetailPage(jobId) {
  const metadata = {
    id: jobId,
    title: '',
    company: '',
    url: window.location.href,
    dateApplied: Date.now(),
    metadata: {
      location: '',
      salary: '',
      remote: false
    }
  };

  try {
    // Job title
    const titleEl = document.querySelector('.jobs-details-top-card__job-title') ||
                   document.querySelector('h1[class*="job"]');
    if (titleEl) {
      metadata.title = titleEl.textContent?.trim() || '';
    }

    // Company name
    const companyEl = document.querySelector('.jobs-details-top-card__company-name') ||
                     document.querySelector('[data-test-id="job-details-company-name"]') ||
                     document.querySelector('a[href*="/company/"]');
    if (companyEl) {
      metadata.company = companyEl.textContent?.trim() || '';
    }

    // Location
    const locationEl = document.querySelector('.jobs-details-top-card__bullet') ||
                      document.querySelector('[class*="location"]');
    if (locationEl) {
      metadata.metadata.location = locationEl.textContent?.trim() || '';
    }

    // Salary
    const salaryEl = document.querySelector('[class*="salary"]') ||
                    document.querySelector('[data-test-id="job-details-salary"]');
    if (salaryEl) {
      metadata.metadata.salary = salaryEl.textContent?.trim() || '';
    }

    // Remote check
    const text = document.body.textContent?.toLowerCase() || '';
    metadata.metadata.remote = /\b(remote|work from home|wfh)\b/i.test(text);
  } catch (error) {
    console.warn('[LinkedInHighlighter] Error extracting detail page metadata:', error);
  }

  return metadata;
}

// --- Storage helpers (V2) -------------------------------------------------

async function getAppliedJobIds() {
  const jobs = await storageManager.getAllJobs();
  return Object.keys(jobs);
}

async function setApplied(jobId, cardElement = null) {
  // Check if already exists
  const exists = await storageManager.jobExists(jobId);
  if (exists) return;

  // Extract metadata
  let jobData;
  if (cardElement) {
    jobData = extractJobMetadata(cardElement, jobId);
  } else {
    jobData = extractJobMetadataFromDetailPage(jobId);
  }

  // Save to storage
  await storageManager.saveJob(jobData);
  console.log('[LinkedInHighlighter] Saved job:', jobId, jobData.title);
}

function onStorageChange(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.jobs) callback();
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

// On job detail page, try to insert a "Mark as Applied" button
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
    await setApplied(jobId, null); // null = use detail page extraction
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
    await setApplied(jobId, null);
  }
}

// --- Main highlighter workflow --------------------------------------
async function highlightApplied() {
  const appliedJobIds = await getAppliedJobIds();
  const appliedSet = new Set(appliedJobIds);
  const cards = findAllJobCardNodes();

  // 1) Cards that explicitly show "Applied" -> highlight & store
  for (const [jobId, el] of cards.entries()) {
    if (cardShowsApplied(el)) {
      annotateCard(el);
      if (!appliedSet.has(jobId)) {
        await setApplied(jobId, el);
        appliedSet.add(jobId);
      }
    }
  }

  // 2) Highlight any card whose jobId we've already stored
  for (const [jobId, el] of cards.entries()) {
    if (appliedSet.has(jobId)) {
      annotateCard(el);
    }
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
  console.log('[LinkedInHighlighter] V2 Initializing...');

  // Run migration if needed (happens automatically in background, but double-check here)
  try {
    await runMigrationIfNeeded();
  } catch (error) {
    console.warn('[LinkedInHighlighter] Migration check failed:', error);
  }

  // Start highlighting
  await highlightApplied();

  // If on a job-view page, offer a manual mark button and auto-detect applied
  const currentId = extractJobIdFromUrl(location.pathname + location.search);
  injectMarkAppliedButton(currentId);
  autoDetectAndStoreAppliedOnDetails(currentId);

  console.log('[LinkedInHighlighter] V2 Ready!');
})();
