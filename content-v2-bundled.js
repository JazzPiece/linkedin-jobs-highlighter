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
      showBorder: true,
      showTimestamp: false
    },
    filtering: {
      hideApplied: false,
      hideOnSite: false,
      hideHybrid: false,
      hideRemote: false,
      hideNoSalary: false,
      hideMode: 'collapse' // 'collapse' or 'complete'
    },
    blacklist: {
      companies: [] // array of company names (case-insensitive)
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
      try {
        const result = await this.storageAPI.get(STORAGE_KEYS.JOBS);
        return result[STORAGE_KEYS.JOBS] || {};
      } catch (error) {
        // Extension context invalidated - reload will fix
        if (error.message.includes('Extension context invalidated')) {
          console.log('[StorageManager] Extension context invalidated, stopping operations');
          return {};
        }
        throw error;
      }
    }

    async getJob(jobId) {
      const jobs = await this.getAllJobs();
      return jobs[jobId] || null;
    }

    async saveJob(jobData) {
      try {
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
          saved: jobData.saved !== undefined ? jobData.saved : (existingJob?.saved || false),
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
      } catch (error) {
        // Extension context invalidated - ignore
        if (error.message.includes('Extension context invalidated')) {
          console.log('[StorageManager] Extension context invalidated, cannot save job');
          return;
        }
        throw error;
      }
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
    // Safely access nested properties with null checking
    const colors = currentSettings?.tracking;
    if (!colors) {
      console.warn('[LinkedInHighlighter] Settings not loaded yet, using defaults');
      return;
    }

    // Apply CSS custom properties for dynamic colors
    document.documentElement.style.setProperty('--highlight-applied', colors.applied?.color || '#ff0000');
    document.documentElement.style.setProperty('--highlight-viewed', colors.viewed?.color || '#ffd700');
    document.documentElement.style.setProperty('--highlight-saved', colors.saved?.color || '#00c851');
  }

  // Listen for settings updates from popup
  chrome.runtime.onMessage.addListener((message) => {
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
      if (area === "local" && (changes.jobs || changes.settings)) {
        callback();
      }
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

  function annotateCard(el, state = 'applied', isSaved = false, jobData = null) {
    if (!el) return;

    // Remove any existing state classes
    el.classList.remove("li-applied-job-card", "li-viewed-job-card", "li-saved-job-card", "show-border");

    // Priority order for primary highlight: Applied > Viewed
    // Saved is shown as secondary indicator (additional class)
    const stateClass = `li-${state}-job-card`;
    el.classList.add(stateClass);

    // Add saved class if job is saved (can coexist with applied/viewed)
    if (isSaved && currentSettings.tracking.saved.enabled) {
      el.classList.add("li-saved-job-card");
    }

    // Add border class if showBorder setting is enabled
    if (currentSettings.display.showBorder) {
      el.classList.add("show-border");
    }

    // Find title element
    const title = el.querySelector('a[href*="/jobs/view/"]') || el.querySelector("h3,h2");
    if (!title) return;

    // Remove existing badges
    const existingBadges = title.querySelectorAll(".li-applied-badge");
    existingBadges.forEach(badge => badge.remove());

    // Add badge if showBadge setting is enabled
    if (currentSettings.display.showBadge) {
      const tag = document.createElement("span");
      tag.className = "li-applied-badge";

      // Build badge text - show both state and saved status if applicable
      let badgeText = state.charAt(0).toUpperCase() + state.slice(1);
      if (isSaved && currentSettings.tracking.saved.enabled) {
        badgeText += ' + Saved';
      }

      // Add timestamp if enabled and available
      if (currentSettings.display.showTimestamp && jobData?.dateApplied) {
        const date = new Date(jobData.dateApplied);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        let dateStr;
        if (diffDays === 0) {
          dateStr = 'Today';
        } else if (diffDays === 1) {
          dateStr = 'Yesterday';
        } else if (diffDays < 7) {
          dateStr = `${diffDays}d ago`;
        } else if (diffDays < 30) {
          dateStr = `${Math.floor(diffDays / 7)}w ago`;
        } else {
          dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        badgeText += ` • ${dateStr}`;
      }

      tag.textContent = badgeText;
      title.appendChild(tag);
    }
  }

  function cardShowsApplied(el) {
    const txt = (el.textContent || "").toLowerCase();
    return /\b(applied|you applied|application submitted|applied on)\b/i.test(txt);
  }

  function cardShowsViewed(el) {
    const txt = (el.textContent || "").toLowerCase();
    return /\b(viewed|viewed on|you viewed)\b/i.test(txt);
  }

  function cardShowsSaved(el) {
    const txt = (el.textContent || "").toLowerCase();
    return /\b(saved|you saved|saved on)\b/i.test(txt);
  }

  function getCardState(el) {
    // Priority: Applied > Viewed (Saved is handled separately as boolean)
    if (cardShowsApplied(el)) return 'applied';
    if (cardShowsViewed(el)) return 'viewed';
    return null;
  }

  function getCardDetection(el) {
    // Return both state and saved status
    return {
      state: cardShowsApplied(el) ? 'applied' : (cardShowsViewed(el) ? 'viewed' : null),
      saved: cardShowsSaved(el)
    };
  }

  // ============================================================================
  // FILTERING UTILITIES
  // ============================================================================

  function detectLocationType(el) {
    const text = (el.textContent || "").toLowerCase();

    // Check for remote keywords
    if (/\b(remote|work from home|wfh)\b/i.test(text)) {
      return 'remote';
    }

    // Check for hybrid keywords
    if (/\b(hybrid)\b/i.test(text)) {
      return 'hybrid';
    }

    // Default to on-site if no remote/hybrid indicators
    return 'onsite';
  }

  function hasSalaryListed(el) {
    const text = el.textContent || "";
    // Check for common salary indicators
    return /[$€£¥]\s*[\d,]+|\d+[kK]\/?(yr|year)?|salary|compensation|per (hour|year|month)/i.test(text);
  }

  function getCompanyName(el) {
    // Try multiple selectors for company name
    const selectors = [
      '.job-card-container__company-name',
      '[data-test-id="job-card-company-name"]',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-container__primary-description',
      '.base-search-card__subtitle',
      'span.job-card-container__primary-description'
    ];

    for (const selector of selectors) {
      const companyEl = el.querySelector(selector);
      if (companyEl) {
        const companyName = companyEl.textContent?.trim().toLowerCase() || '';
        if (companyName) {
          return companyName;
        }
      }
    }

    return '';
  }

  function shouldHideJobCard(el, state, currentSettings) {
    const filtering = currentSettings.filtering || {};
    const blacklist = currentSettings.blacklist?.companies || [];

    // State-based hiding: Only hide applied jobs if hideApplied is enabled
    // NEVER hide viewed jobs based on state (they should only be highlighted)
    if (state === 'applied' && filtering.hideApplied) return true;

    // Location-based hiding: Apply to ALL jobs (regardless of state)
    const locationType = detectLocationType(el);
    if (locationType === 'remote' && filtering.hideRemote) return true;
    if (locationType === 'hybrid' && filtering.hideHybrid) return true;
    if (locationType === 'onsite' && filtering.hideOnSite) return true;

    // Salary-based hiding: Apply to ALL jobs
    if (filtering.hideNoSalary && !hasSalaryListed(el)) return true;

    // Company blacklist: Apply to ALL jobs
    if (blacklist.length > 0) {
      const companyName = getCompanyName(el);
      if (companyName) {
        const isBlacklisted = blacklist.some(blocked => {
          return companyName.includes(blocked.toLowerCase());
        });
        if (isBlacklisted) return true;
      }
    }

    return false;
  }

  function isJobCurrentlySelected(jobId) {
    if (!jobId) return false;

    // Check if this job is currently selected/opened in the detail pane
    const currentUrl = window.location.href;

    // Method 1: Check if URL contains this job ID
    if (currentUrl.includes(`/jobs/view/${jobId}`)) {
      return true;
    }

    // Method 2: Check if the job card has active/selected class
    const jobLink = document.querySelector(`a[href*="/jobs/view/${jobId}"]`);
    if (jobLink) {
      const listItem = jobLink.closest('li, div.job-card-container, div.jobs-search-results__list-item');
      if (listItem) {
        // Check various classes that indicate selection
        if (listItem.classList.contains('active') ||
            listItem.classList.contains('selected') ||
            listItem.classList.contains('jobs-search-results__list-item--active') ||
            listItem.getAttribute('aria-current') === 'true') {
          return true;
        }
      }
    }

    // Method 3: Check if the detail pane is showing this job
    const detailPane = document.querySelector('[data-job-id], .jobs-details, .jobs-search__job-details');
    if (detailPane) {
      const detailJobId = detailPane.getAttribute('data-job-id') ||
                         extractJobIdFromUrl(detailPane.querySelector('a[href*="/jobs/view/"]')?.href || '');
      if (detailJobId === jobId) {
        return true;
      }
    }

    return false;
  }

  function applyHiddenState(el, shouldHide, hideMode, jobId) {
    // Don't hide if this is the currently selected/viewed job
    if (shouldHide && jobId && isJobCurrentlySelected(jobId)) {
      shouldHide = false;
    }

    if (shouldHide) {
      el.classList.add('li-job-hidden');

      if (hideMode === 'collapse') {
        el.classList.add('li-job-collapsed');
      }
    } else {
      el.classList.remove('li-job-hidden', 'li-job-collapsed');
    }
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
    const allJobs = await storageManager.getAllJobs();
    const cards = findAllJobCardNodes();

    // Process each card
    for (const [jobId, el] of cards.entries()) {
      let state = null;
      let isSaved = false;
      let shouldStore = false;
      let shouldUpdate = false;

      // Check if job is already in storage
      const existingJob = allJobs[jobId];

      // Always detect current state and saved status from LinkedIn's UI
      const detection = getCardDetection(el);
      const detectedState = detection.state;
      const detectedSaved = detection.saved;

      if (existingJob) {
        // Job exists - check if state or saved status has changed
        const currentStoredState = existingJob.status || 'applied';
        const currentStoredSaved = existingJob.saved || false;

        // Update state if it changed (Applied > Viewed priority)
        if (detectedState === 'applied' && currentStoredState !== 'applied') {
          state = 'applied';
          shouldUpdate = true;
        } else if (detectedState === 'viewed' && currentStoredState !== 'viewed' && currentStoredState !== 'applied') {
          // Only upgrade to viewed if not already applied
          state = 'viewed';
          shouldUpdate = true;
        } else {
          // Keep existing state
          state = currentStoredState;
        }

        // Update saved status if it changed
        if (detectedSaved !== currentStoredSaved) {
          isSaved = detectedSaved;
          shouldUpdate = true;
        } else {
          isSaved = currentStoredSaved;
        }

      } else {
        // Job not in storage yet
        if (detectedState === 'applied' && currentSettings.tracking.applied.enabled) {
          // Applied jobs: Store immediately
          state = 'applied';
          shouldStore = true;
        } else if (detectedState === 'viewed' && currentSettings.tracking.viewed.enabled) {
          // Viewed jobs: Show highlight but DON'T store until clicked
          state = 'viewed';
          // shouldStore stays false - we'll store it when user clicks
        }

        // Check if saved (can be saved without being applied/viewed)
        if (detectedSaved && currentSettings.tracking.saved.enabled) {
          isSaved = true;
          if (!state) {
            // Only saved, not applied or viewed - still store it
            shouldStore = true;
          }
        }
      }

      // Apply highlighting if we have a state and that state is enabled
      if (state) {
        const stateEnabled = currentSettings.tracking[state]?.enabled;
        if (stateEnabled) {
          annotateCard(el, state, isSaved, existingJob);
        }
      } else if (isSaved && currentSettings.tracking.saved.enabled) {
        // Only saved, show saved highlight
        annotateCard(el, 'saved', false, existingJob);
      }

      // Apply filtering/hiding logic
      const shouldHide = shouldHideJobCard(el, state, currentSettings);
      const hideMode = currentSettings.filtering?.hideMode || 'collapse';
      applyHiddenState(el, shouldHide, hideMode, jobId);

      // Add click listener for viewed jobs to store them when clicked
      if (state === 'viewed' && !existingJob && currentSettings.tracking.viewed.enabled) {
        const jobLink = el.querySelector('a[href*="/jobs/view/"]');
        if (jobLink && !jobLink.dataset.clickTracked) {
          jobLink.dataset.clickTracked = 'true';
          jobLink.addEventListener('click', async () => {
            const metadata = extractJobMetadata(el, jobId);
            metadata.status = 'viewed';
            metadata.saved = isSaved;
            await storageManager.saveJob(metadata);
            console.log(`[LinkedInHighlighter] Stored viewed job on click: ${jobId}`);
          }, { once: true });
        }
      }

      // Store new job or update existing
      if (shouldStore || shouldUpdate) {
        const metadata = extractJobMetadata(el, jobId);
        metadata.status = state || 'saved'; // If only saved, use 'saved' as status
        metadata.saved = isSaved;
        await storageManager.saveJob(metadata);

        if (shouldUpdate) {
          console.log(`[LinkedInHighlighter] Updated job ${jobId}: status=${state}, saved=${isSaved}`);
        }
      }
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  console.log('[LinkedInHighlighter] V2 Initializing...');

  // Load settings on startup and ensure they're properly set
  try {
    currentSettings = await getSettings();
    // Ensure settings have proper structure
    if (!currentSettings.tracking) {
      currentSettings = DEFAULT_SETTINGS;
    }
    applyDynamicColors();
  } catch (error) {
    console.error('[LinkedInHighlighter] Error loading settings:', error);
    currentSettings = DEFAULT_SETTINGS;
    applyDynamicColors();
  }

  // Observe dynamic/infinite scrolling updates
  const observer = new MutationObserver(() => {
    highlightApplied();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Re-run when storage changes (jobs or settings)
  onStorageChange(async () => {
    // Reload settings if they changed
    currentSettings = await getSettings();
    applyDynamicColors();
    // Re-apply highlighting with new settings
    highlightApplied();
  });

  // Re-run when URL changes (user clicks different job)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[LinkedInHighlighter] URL changed, re-checking hidden states');
      // Small delay to let LinkedIn update the DOM
      setTimeout(() => highlightApplied(), 100);
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Initial highlight
  await highlightApplied();

  // If on a job-view page, offer manual mark button and auto-detect applied
  const currentId = extractJobIdFromUrl(location.pathname + location.search);
  injectMarkAppliedButton(currentId);
  autoDetectAndStoreAppliedOnDetails(currentId);

  console.log('[LinkedInHighlighter] V2 Ready!');

})();
