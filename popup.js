// Popup logic for user-facing dashboard

(async function() {
  'use strict';

  // Default settings
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

  // Get jobs from storage
  async function getAllJobs() {
    const result = await chrome.storage.local.get('jobs');
    return result.jobs || {};
  }

  // Get settings from storage
  async function getSettings() {
    const result = await chrome.storage.local.get('settings');
    return result.settings || DEFAULT_SETTINGS;
  }

  // Save settings to storage
  async function saveSettings(settings) {
    await chrome.storage.local.set({ settings });
    // Notify content script of settings change
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings });
  }

  // Format date
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Get badge class for status
  function getBadgeClass(status) {
    const classes = {
      'applied': 'badge-applied',
      'interviewing': 'badge-interviewing',
      'offer': 'badge-offer',
      'rejected': 'badge-rejected',
      'withdrawn': 'badge-rejected'
    };
    return classes[status] || 'badge-applied';
  }

  // Calculate this week's applications
  function getThisWeekCount(jobs) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    return Object.values(jobs).filter(job => {
      return job.dateApplied >= weekStart.getTime();
    }).length;
  }

  // Render jobs list
  function renderJobs(jobs) {
    const jobsList = document.getElementById('jobs-list');
    const jobsArray = Object.values(jobs);

    if (jobsArray.length === 0) {
      jobsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-text">
            No jobs tracked yet!<br>
            Start applying on LinkedIn and<br>
            they'll appear here automatically.
          </div>
        </div>
      `;
      return;
    }

    // Sort by date (newest first)
    jobsArray.sort((a, b) => b.dateApplied - a.dateApplied);

    // Limit to 20 most recent
    const recentJobs = jobsArray.slice(0, 20);

    jobsList.innerHTML = recentJobs.map(job => {
      const cleanTitle = job.title || 'Untitled Position';
      const company = job.company || 'Unknown Company';
      const location = job.metadata?.location || '';
      const status = job.status || 'applied';

      return `
        <div class="job-item">
          <a href="${job.url}" target="_blank" class="job-title" title="${cleanTitle}">
            ${cleanTitle}
          </a>
          <div class="job-company">${company}${location ? ' • ' + location : ''}</div>
          <div class="job-meta">
            <span class="job-badge ${getBadgeClass(status)}">${status}</span>
            <span class="job-date">${formatDate(job.dateApplied)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update statistics
  function updateStats(jobs) {
    const jobsArray = Object.values(jobs);
    const totalApps = jobsArray.length;
    const thisWeek = getThisWeekCount(jobs);

    document.getElementById('total-apps').textContent = totalApps;
    document.getElementById('this-week').textContent = thisWeek;
  }

  // Export data as JSON
  async function exportJSON() {
    const jobs = await getAllJobs();
    const settings = await chrome.storage.local.get('settings');
    const stats = await chrome.storage.local.get('statistics');

    const exportData = {
      version: 2,
      exportDate: new Date().toISOString(),
      jobs,
      settings: settings.settings || {},
      statistics: stats.statistics || {}
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-jobs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export data as CSV
  async function exportCSV() {
    const jobs = await getAllJobs();
    const jobsArray = Object.values(jobs);

    if (jobsArray.length === 0) {
      alert('No jobs to export');
      return;
    }

    // CSV headers
    const headers = ['Job Title', 'Company', 'Location', 'Status', 'Date Applied', 'URL', 'Salary', 'Remote', 'Notes'];

    // Convert jobs to CSV rows
    const rows = jobsArray.map(job => {
      const notes = job.notes?.map(n => n.text).join('; ') || '';
      return [
        job.title || '',
        job.company || '',
        job.metadata?.location || '',
        job.status || 'applied',
        new Date(job.dateApplied).toLocaleDateString('en-US'),
        job.url || '',
        job.metadata?.salary || '',
        job.metadata?.remote ? 'Yes' : 'No',
        notes
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-jobs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Show export menu
  function showExportMenu() {
    const menu = document.getElementById('export-menu');
    menu.classList.toggle('show');
  }

  // Initialize
  async function init() {
    const jobs = await getAllJobs();
    updateStats(jobs);
    renderJobs(jobs);

    // Button handlers
    document.getElementById('btn-export').addEventListener('click', showExportMenu);
    document.getElementById('btn-export-json').addEventListener('click', () => {
      exportJSON();
      document.getElementById('export-menu').classList.remove('show');
    });
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      exportCSV();
      document.getElementById('export-menu').classList.remove('show');
    });

    document.getElementById('btn-linkedin').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED' });
    });

    // Close export menu when clicking outside
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('export-menu');
      const exportBtn = document.getElementById('btn-export');
      if (!exportBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
      }
    });

    // Settings panel handlers
    const settingsPanel = document.getElementById('settings-panel');
    const settingsIcon = document.getElementById('settings-icon');
    const settingsClose = document.getElementById('settings-close');

    settingsIcon.addEventListener('click', async () => {
      settingsPanel.classList.add('show');
      await loadSettings();
    });

    settingsClose.addEventListener('click', () => {
      settingsPanel.classList.remove('show');
    });

    // Load settings into UI
    async function loadSettings() {
      const settings = await getSettings();

      document.getElementById('toggle-applied').checked = settings.tracking.applied.enabled;
      document.getElementById('toggle-viewed').checked = settings.tracking.viewed.enabled;
      document.getElementById('toggle-saved').checked = settings.tracking.saved.enabled;

      document.getElementById('color-applied').value = settings.tracking.applied.color;
      document.getElementById('color-viewed').value = settings.tracking.viewed.color;
      document.getElementById('color-saved').value = settings.tracking.saved.color;

      document.getElementById('toggle-badge').checked = settings.display.showBadge;
      document.getElementById('toggle-border').checked = settings.display.showBorder;
    }

    // Save settings when toggles change
    async function handleSettingChange() {
      const settings = {
        tracking: {
          applied: {
            enabled: document.getElementById('toggle-applied').checked,
            color: document.getElementById('color-applied').value
          },
          viewed: {
            enabled: document.getElementById('toggle-viewed').checked,
            color: document.getElementById('color-viewed').value
          },
          saved: {
            enabled: document.getElementById('toggle-saved').checked,
            color: document.getElementById('color-saved').value
          }
        },
        display: {
          showBadge: document.getElementById('toggle-badge').checked,
          showBorder: document.getElementById('toggle-border').checked
        }
      };
      await saveSettings(settings);
    }

    // Attach change listeners to all settings
    document.getElementById('toggle-applied').addEventListener('change', handleSettingChange);
    document.getElementById('toggle-viewed').addEventListener('change', handleSettingChange);
    document.getElementById('toggle-saved').addEventListener('change', handleSettingChange);
    document.getElementById('toggle-badge').addEventListener('change', handleSettingChange);
    document.getElementById('toggle-border').addEventListener('change', handleSettingChange);

    document.getElementById('color-applied').addEventListener('input', handleSettingChange);
    document.getElementById('color-viewed').addEventListener('input', handleSettingChange);
    document.getElementById('color-saved').addEventListener('input', handleSettingChange);

    // Color preset buttons
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const color = btn.dataset.color;
        const target = btn.dataset.target;
        document.getElementById(`color-${target}`).value = color;
        await handleSettingChange();
      });
    });

    // Reset to defaults
    document.getElementById('btn-reset-settings').addEventListener('click', async () => {
      if (confirm('Reset all settings to defaults?')) {
        await saveSettings(DEFAULT_SETTINGS);
        await loadSettings();
      }
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes.jobs) {
        const jobs = await getAllJobs();
        updateStats(jobs);
        renderJobs(jobs);
      }
    });
  }

  init();
})();
