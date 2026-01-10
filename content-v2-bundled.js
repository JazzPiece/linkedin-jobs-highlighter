// V2 Content Script - Bundled version (no imports)
// This file includes all necessary code inline to avoid module loading issues

(async function() {
  'use strict';

  // ============================================================================
  // CONSTANTS (from src/shared/constants.js)
  // ============================================================================

  const STORAGE_KEYS = {
    JOBS: 'jobs',
    SETTINGS: 'settings',
    STATISTICS: 'statistics',
    SCHEMA_VERSION: 'schemaVersion',
    LEGACY_APPLIED_IDS: 'appliedJobIds'
  };

  const CURRENT_SCHEMA_VERSION = 2;

  const JOB_STATUS = {
    APPLIED: 'applied',
    INTERVIEWING: 'interviewing',
    OFFER: 'offer',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn'
  };

  const DEFAULT_SETTINGS = {
    tracking: {
      applied: { enabled: true, color: '#ff0000' },
      viewed: { enabled: false, color: '#ffd700' },
      saved: { enabled: false, color: '#00c851' }
    },
    display: {
      showBadge: true,
      showBorder: true
    }
  };

  // ============================================================================
  // STORAGE MANAGER (simplified inline version)
  // ============================================================================

  class StorageManager {
    constructor() {
      this.storageAPI = chrome.storage.local;
    }

    async getAllJobs() {
      const result = await this.storageAPI.get(STORAGE_KEYS.JOBS);
      return result[STORAGE_KEYS.JOBS] || {};
    }

    async getJob(jobId) {
      const jobs = await this.getAllJobs();
      return jobs[jobId] || null;
    }

    async saveJob(jobData) {
      const jobs = await this.getAllJobs();
      const now = Date.now();
      const existingJob = jobs[jobData.id];

      const job = {
        id: jobData.id,
        title: jobData.title || existingJob?.title || '',
        company: jobData.company || existingJob?.company || '',
        url: jobData.url || existingJob?.url || `https://www.linkedin.com/jobs/view/${jobData.id}`,
        dateApplied: jobData.dateApplied || existingJob?.dateApplied || now,
        dateAdded: existingJob?.dateAdded || now,
        status: jobData.status || existingJob?.status || JOB_STATUS.APPLIED,
        notes: existingJob?.notes || [],
        statusHistory: existingJob?.statusHistory || [
          { status: jobData.status || JOB_STATUS.APPLIED, timestamp: now }
        ],
        metadata: {
          location: jobData.metadata?.location || existingJob?.metadata?.location || '',
          salary: jobData.metadata?.salary || existingJob?.metadata?.salary || '',
          remote: jobData.metadata?.remote || existingJob?.metadata?.remote || false
        }
      };

      jobs[jobData.id] = job;
      await this.storageAPI.set({ [STORAGE_KEYS.JOBS]: jobs });
    }

    async jobExists(jobId) {
      const job = await this.getJob(jobId);
      return job !== null;
    }
  }

  const storageManager = new StorageManager();

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  let currentSettings = DEFAULT_SETTINGS;

  async function getSettings() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  function applyDynamicColors() {
    const colors = currentSettings.tracking;

    // Apply CSS custom properties for dynamic colors
    document.documentElement.style.setProperty('--highlight-applied', colors.applied.color);
    document.documentElement.style.setProperty('--highlight-viewed', colors.viewed.color);
    document.documentElement.style.setProperty('--highlight-saved', colors.saved.color);
  }

  // Listen for settings updates from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_UPDATED') {
      currentSettings = message.settings;
      applyDynamicColors();
      highlightApplied(); // Re-run highlighting with new settings
    }
  });

  // ============================================================================
  // JOB DATA EXTRACTION
  // ============================================================================

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
      // Extract job title (clone to avoid our badge text)
      const titleEl = cardElement.querySelector('a[href*="/jobs/view/"]') ||
                     cardElement.querySelector('h3, h2, .job-card-list__title');
      if (titleEl) {
        // Clone and remove our badge to get clean title
        const clone = titleEl.cloneNode(true);
        const badge = clone.querySelector('.li-applied-badge');
        if (badge) badge.remove();
        metadata.title = clone.textContent?.trim() || '';
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

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================

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

  // ============================================================================
  // DOM UTILITIES
  // ============================================================================

  function extractJobIdFromUrl(url) {
    const m = String(url).match(/\/jobs\/view\/(\d{5,})/);
    return m ? m[1] : null;
  }

  function findAllJobCardNodes() {
    const anchors = document.querySelectorAll('a[href*="/jobs/view/"]');
    const cards = new Map();
    anchors.forEach(a => {
      const id = extractJobIdFromUrl(a.getAttribute("href"));
      if (!id) return;

      const card = a.closest('li, div.jobs-search-results__list-item, div.job-card-container, div.jobs-search__results-list li') || a.closest("div");
      if (card && !cards.has(id)) cards.set(id, card);
    });
    return cards;
  }

  function annotateCard(el, state = 'applied') {
    if (!el) return;

    // Remove any existing state classes
    el.classList.remove("li-applied-job-card", "li-viewed-job-card", "li-saved-job-card");

    // Add appropriate class based on state
    const stateClass = `li-${state}-job-card`;
    if (el.classList.contains(stateClass)) return;
    el.classList.add(stateClass);

    // Only add badge if showBadge setting is enabled
    if (currentSettings.display.showBadge) {
      const title = el.querySelector('a[href*="/jobs/view/"]') || el.querySelector("h3,h2");
      if (title && !title.querySelector(".li-applied-badge")) {
        const tag = document.createElement("span");
        tag.className = "li-applied-badge";
        tag.textContent = state.charAt(0).toUpperCase() + state.slice(1);
        title.appendChild(tag);
      }
    }
  }

  function cardShowsApplied(el) {
    const txt = (el.textContent || "").toLowerCase();
    return /\b(applied|you applied|application submitted|applied on)\b/i.test(txt);
  }

  function injectMarkAppliedButton(jobId) {
    if (!jobId) return;

    const header = document.querySelector('[data-test-id="job-details"]') ||
                   document.querySelector(".jobs-details-top-card") ||
                   document.querySelector("main");

    if (!header || header.querySelector(".li-mark-applied-btn")) return;

    const btn = document.createElement("button");
    btn.className = "li-mark-applied-btn";
    btn.textContent = "Mark as Applied";
    btn.addEventListener("click", async () => {
      await setApplied(jobId, null);
      btn.textContent = "Marked ✓";
    });

    const btnRow = header.querySelector('[data-test-id="top-card-buttons-container"]') ||
                   header.querySelector('[class*="jobs-save-button"]') ||
                   header;
    btnRow.appendChild(btn);
  }

  async function autoDetectAndStoreAppliedOnDetails(jobId) {
    if (!jobId) return;
    const txt = (document.body.textContent || "").toLowerCase();
    if (/\b(applied|you applied|application submitted|applied on)\b/i.test(txt)) {
      await setApplied(jobId, null);
    }
  }

  // ============================================================================
  // MAIN HIGHLIGHTER WORKFLOW
  // ============================================================================

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

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  console.log('[LinkedInHighlighter] V2 Initializing...');

  // Load settings on startup
  currentSettings = await getSettings();
  applyDynamicColors();

  // Observe dynamic/infinite scrolling updates
  const observer = new MutationObserver(() => {
    highlightApplied();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Re-run when storage changes
  onStorageChange(() => highlightApplied());

  // Initial highlight
  await highlightApplied();

  // If on a job-view page, offer manual mark button and auto-detect applied
  const currentId = extractJobIdFromUrl(location.pathname + location.search);
  injectMarkAppliedButton(currentId);
  autoDetectAndStoreAppliedOnDetails(currentId);

  console.log('[LinkedInHighlighter] V2 Ready!');

})();
