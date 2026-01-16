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
      showBorder: true,
      showTimestamp: false
    },
    filtering: {
      hideApplied: false,
      hideOnSite: false,
      hideHybrid: false,
      hideRemote: false,
      hideNoSalary: false,
      hideMode: 'collapse'
    },
    blacklist: {
      companies: []
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

    // Notify content scripts on LinkedIn tabs of settings change
    try {
      const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' });
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', settings });
        } catch (e) {
          // Tab doesn't have content script injected - that's okay
        }
      }
    } catch (error) {
      // Silently fail - settings are saved to storage and will be loaded on next page
    }
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

  // Calculate this week's count for a given status
  function getThisWeekCount(jobs, status = 'applied') {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    return Object.values(jobs).filter(job => {
      return job.status === status && job.dateApplied >= weekStart.getTime();
    }).length;
  }

  // Track current filter
  let currentFilter = 'applied';

  // Render jobs list
  function renderJobs(jobs, filter = 'applied') {
    const jobsList = document.getElementById('jobs-list');
    let jobsArray = Object.values(jobs);

    // Filter by status
    jobsArray = jobsArray.filter(job => job.status === filter);

    if (jobsArray.length === 0) {
      const filterName = filter.charAt(0).toUpperCase() + filter.slice(1);
      jobsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-text">
            No ${filterName.toLowerCase()} jobs yet!<br>
            ${filter === 'applied' ? 'Start applying on LinkedIn and<br>they\'ll appear here automatically.' : 'Jobs you\'ve viewed will<br>appear here automatically.'}
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

  // Update statistics based on current filter
  async function updateStats(jobs, filter = 'applied') {
    const jobsArray = Object.values(jobs);
    // Filter to count jobs for the current status
    const filteredJobs = jobsArray.filter(job => job.status === filter);
    const totalCount = filteredJobs.length;
    const thisWeek = getThisWeekCount(jobs, filter);

    // Update the label based on filter
    const labelMap = {
      'applied': 'Total Applied',
      'viewed': 'Total Viewed'
    };

    document.getElementById('total-apps').textContent = totalCount;
    document.getElementById('stat-label-total').textContent = labelMap[filter] || 'Total Applied';
    document.getElementById('this-week').textContent = thisWeek;

    // Update install date
    const { installDate } = await chrome.storage.local.get('installDate');
    if (installDate) {
      document.getElementById('install-date').textContent = formatDate(installDate);
    } else {
      document.getElementById('install-date').textContent = 'Unknown';
    }
  }

  // Helper function to refresh all LinkedIn tabs
  async function refreshLinkedInTabs() {
    try {
      const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' });
      if (tabs.length > 0) {
        for (const tab of tabs) {
          await chrome.tabs.reload(tab.id);
        }
        console.log('[Popup] Auto-refreshed', tabs.length, 'LinkedIn tab(s)');
      }
    } catch (error) {
      console.error('[Popup] Failed to auto-refresh tabs:', error);
    }
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
    updateStats(jobs, currentFilter);
    renderJobs(jobs, currentFilter);

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update filter
        currentFilter = tab.dataset.tab;

        // Re-render jobs and update stats with new filter
        const jobs = await getAllJobs();
        updateStats(jobs, currentFilter);
        renderJobs(jobs, currentFilter);
      });
    });

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

    // Update active color preset indicators and current color box
    function updateColorPresetIndicators() {
      const colorTypes = ['applied', 'viewed', 'saved'];

      colorTypes.forEach(type => {
        const colorInput = document.getElementById(`color-${type}`);
        const currentColorBox = document.getElementById(`current-color-${type}`);

        if (colorInput && currentColorBox) {
          const selectedColor = colorInput.value.toLowerCase();

          // Update current color box
          currentColorBox.style.background = selectedColor;

          // Update preset button active states
          const presetBtns = document.querySelectorAll(`.color-preset-btn[data-target="${type}"]`);
          presetBtns.forEach(btn => {
            const btnColor = btn.dataset.color?.toLowerCase();
            if (btnColor === selectedColor) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });
        }
      });
    }

    // Load settings into UI
    async function loadSettings() {
      const settings = await getSettings();

      // Safely access nested properties with fallbacks and null checks
      const toggleApplied = document.getElementById('toggle-applied');
      const toggleViewed = document.getElementById('toggle-viewed');
      const toggleSaved = document.getElementById('toggle-saved');
      const colorApplied = document.getElementById('color-applied');
      const colorViewed = document.getElementById('color-viewed');
      const colorSaved = document.getElementById('color-saved');
      const toggleBadge = document.getElementById('toggle-badge');
      const toggleBorder = document.getElementById('toggle-border');
      const toggleTimestamp = document.getElementById('toggle-timestamp');

      if (toggleApplied) toggleApplied.checked = settings?.tracking?.applied?.enabled ?? true;
      if (toggleViewed) toggleViewed.checked = settings?.tracking?.viewed?.enabled ?? false;
      if (toggleSaved) toggleSaved.checked = settings?.tracking?.saved?.enabled ?? false;

      if (colorApplied) colorApplied.value = settings?.tracking?.applied?.color ?? '#ff0000';
      if (colorViewed) colorViewed.value = settings?.tracking?.viewed?.color ?? '#ffd700';
      if (colorSaved) colorSaved.value = settings?.tracking?.saved?.color ?? '#00c851';

      if (toggleBadge) toggleBadge.checked = settings?.display?.showBadge ?? true;
      if (toggleBorder) toggleBorder.checked = settings?.display?.showBorder ?? true;
      if (toggleTimestamp) toggleTimestamp.checked = settings?.display?.showTimestamp ?? false;

      // Load filtering settings
      const toggleHideApplied = document.getElementById('toggle-hide-applied');
      const toggleHideRemote = document.getElementById('toggle-hide-remote');
      const toggleHideHybrid = document.getElementById('toggle-hide-hybrid');
      const toggleHideOnsite = document.getElementById('toggle-hide-onsite');
      const toggleHideNoSalary = document.getElementById('toggle-hide-no-salary');
      const hideModeSelect = document.getElementById('hide-mode-select');

      if (toggleHideApplied) toggleHideApplied.checked = settings?.filtering?.hideApplied ?? false;
      if (toggleHideRemote) toggleHideRemote.checked = settings?.filtering?.hideRemote ?? false;
      if (toggleHideHybrid) toggleHideHybrid.checked = settings?.filtering?.hideHybrid ?? false;
      if (toggleHideOnsite) toggleHideOnsite.checked = settings?.filtering?.hideOnSite ?? false;
      if (toggleHideNoSalary) toggleHideNoSalary.checked = settings?.filtering?.hideNoSalary ?? false;
      if (hideModeSelect) hideModeSelect.value = settings?.filtering?.hideMode ?? 'collapse';

      // Load blacklist
      renderBlacklist(settings?.blacklist?.companies ?? []);

      // Update active color indicators
      updateColorPresetIndicators();
    }

    // Show notification banner
    function showSettingsNotification() {
      const notification = document.getElementById('settings-notification');
      if (notification) {
        notification.classList.add('show');

        // Auto-hide after 5 seconds
        setTimeout(() => {
          notification.classList.remove('show');
        }, 5000);
      }
    }

    // Save settings when toggles change
    async function handleSettingChange() {
      const toggleApplied = document.getElementById('toggle-applied');
      const toggleViewed = document.getElementById('toggle-viewed');
      const toggleSaved = document.getElementById('toggle-saved');
      const colorApplied = document.getElementById('color-applied');
      const colorViewed = document.getElementById('color-viewed');
      const colorSaved = document.getElementById('color-saved');
      const toggleBadge = document.getElementById('toggle-badge');
      const toggleBorder = document.getElementById('toggle-border');
      const toggleTimestamp = document.getElementById('toggle-timestamp');

      // Only proceed if all elements exist
      if (!toggleApplied || !toggleViewed || !toggleSaved ||
          !colorApplied || !colorViewed || !colorSaved ||
          !toggleBadge || !toggleBorder || !toggleTimestamp) {
        console.warn('[Popup] Some settings elements not found, skipping save');
        return;
      }

      // Get filtering elements
      const toggleHideApplied = document.getElementById('toggle-hide-applied');
      const toggleHideRemote = document.getElementById('toggle-hide-remote');
      const toggleHideHybrid = document.getElementById('toggle-hide-hybrid');
      const toggleHideOnsite = document.getElementById('toggle-hide-onsite');
      const toggleHideNoSalary = document.getElementById('toggle-hide-no-salary');
      const hideModeSelect = document.getElementById('hide-mode-select');

      // Get current blacklist from storage (don't overwrite it here)
      const currentSettings = await getSettings();

      const settings = {
        tracking: {
          applied: {
            enabled: toggleApplied.checked,
            color: colorApplied.value
          },
          viewed: {
            enabled: toggleViewed.checked,
            color: colorViewed.value
          },
          saved: {
            enabled: toggleSaved.checked,
            color: colorSaved.value
          }
        },
        display: {
          showBadge: toggleBadge.checked,
          showBorder: toggleBorder.checked,
          showTimestamp: toggleTimestamp.checked
        },
        filtering: {
          hideApplied: toggleHideApplied?.checked ?? false,
          hideOnSite: toggleHideOnsite?.checked ?? false,
          hideHybrid: toggleHideHybrid?.checked ?? false,
          hideRemote: toggleHideRemote?.checked ?? false,
          hideNoSalary: toggleHideNoSalary?.checked ?? false,
          hideMode: hideModeSelect?.value ?? 'collapse'
        },
        blacklist: currentSettings?.blacklist ?? { companies: [] }
      };
      await saveSettings(settings);
      updateColorPresetIndicators();

      // Show notification to refresh page
      showSettingsNotification();

      // Auto-refresh LinkedIn tabs after settings change
      await refreshLinkedInTabs();
    }

    // Attach change listeners to all settings with null checks
    const toggleApplied = document.getElementById('toggle-applied');
    const toggleViewed = document.getElementById('toggle-viewed');
    const toggleSaved = document.getElementById('toggle-saved');
    const toggleBadge = document.getElementById('toggle-badge');
    const toggleBorder = document.getElementById('toggle-border');
    const toggleTimestamp = document.getElementById('toggle-timestamp');
    const colorApplied = document.getElementById('color-applied');
    const colorViewed = document.getElementById('color-viewed');
    const colorSaved = document.getElementById('color-saved');

    if (toggleApplied) toggleApplied.addEventListener('change', handleSettingChange);
    if (toggleViewed) toggleViewed.addEventListener('change', handleSettingChange);
    if (toggleSaved) toggleSaved.addEventListener('change', handleSettingChange);
    if (toggleBadge) toggleBadge.addEventListener('change', handleSettingChange);
    if (toggleBorder) toggleBorder.addEventListener('change', handleSettingChange);
    if (toggleTimestamp) toggleTimestamp.addEventListener('change', handleSettingChange);

    if (colorApplied) colorApplied.addEventListener('input', handleSettingChange);
    if (colorViewed) colorViewed.addEventListener('input', handleSettingChange);
    if (colorSaved) colorSaved.addEventListener('input', handleSettingChange);

    // Color preset buttons
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const color = btn.dataset.color;
        const target = btn.dataset.target;
        const colorInput = document.getElementById(`color-${target}`);
        if (colorInput) {
          colorInput.value = color;
          await handleSettingChange();
        }
      });
    });

    // Blacklist management functions
    function renderBlacklist(companies) {
      const listEl = document.getElementById('blacklist-list');
      if (!listEl) return;

      if (companies.length === 0) {
        listEl.innerHTML = '<div style="font-size: 12px; color: #9ca3af; padding: 8px;">No companies blacklisted</div>';
        return;
      }

      listEl.innerHTML = companies.map(company => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e5e7eb;">
          <span style="font-size: 13px; color: #374151;">${company}</span>
          <button class="btn-remove-blacklist" data-company="${company}" style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">Remove</button>
        </div>
      `).join('');

      // Attach remove listeners
      listEl.querySelectorAll('.btn-remove-blacklist').forEach(btn => {
        btn.addEventListener('click', async () => {
          const company = btn.dataset.company;
          await removeFromBlacklist(company);
        });
      });
    }

    async function addToBlacklist(company) {
      if (!company || company.trim() === '') return;

      const settings = await getSettings();
      const companies = settings?.blacklist?.companies ?? [];

      // Check if already exists (case-insensitive)
      if (companies.some(c => c.toLowerCase() === company.toLowerCase())) {
        alert('Company already in blacklist');
        return;
      }

      companies.push(company.trim());

      // Build full settings object with updated blacklist
      const updatedSettings = {
        ...settings,
        blacklist: { companies }
      };

      await saveSettings(updatedSettings);

      // Re-render blacklist UI immediately
      renderBlacklist(companies);

      // Clear input
      const input = document.getElementById('blacklist-input');
      if (input) input.value = '';

      // Show notification (no longer showing refresh message since it's automatic)
      const notification = document.getElementById('settings-notification');
      if (notification) {
        notification.textContent = 'Company added to blacklist!';
        notification.classList.add('show');
        setTimeout(() => {
          notification.classList.remove('show');
          notification.textContent = 'Settings saved! Refresh LinkedIn page to see changes.';
        }, 3000);
      }
    }

    async function removeFromBlacklist(company) {
      const settings = await getSettings();
      const companies = settings?.blacklist?.companies ?? [];

      const filtered = companies.filter(c => c !== company);

      await saveSettings({
        ...settings,
        blacklist: { companies: filtered }
      });

      renderBlacklist(filtered);

      // Show notification
      const notification = document.getElementById('settings-notification');
      if (notification) {
        notification.textContent = 'Company removed from blacklist!';
        notification.classList.add('show');
        setTimeout(() => {
          notification.classList.remove('show');
          notification.textContent = 'Settings saved! Refresh LinkedIn page to see changes.';
        }, 3000);
      }
    }

    // Blacklist event listeners
    const blacklistInput = document.getElementById('blacklist-input');
    const btnAddBlacklist = document.getElementById('btn-add-blacklist');

    if (btnAddBlacklist && blacklistInput) {
      btnAddBlacklist.addEventListener('click', async () => {
        await addToBlacklist(blacklistInput.value);
      });

      // Add on Enter key
      blacklistInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await addToBlacklist(blacklistInput.value);
        }
      });
    }

    // Filtering event listeners
    const toggleHideApplied = document.getElementById('toggle-hide-applied');
    const toggleHideRemote = document.getElementById('toggle-hide-remote');
    const toggleHideHybrid = document.getElementById('toggle-hide-hybrid');
    const toggleHideOnsite = document.getElementById('toggle-hide-onsite');
    const toggleHideNoSalary = document.getElementById('toggle-hide-no-salary');
    const hideModeSelect = document.getElementById('hide-mode-select');

    if (toggleHideApplied) toggleHideApplied.addEventListener('change', handleSettingChange);
    if (toggleHideRemote) toggleHideRemote.addEventListener('change', handleSettingChange);
    if (toggleHideHybrid) toggleHideHybrid.addEventListener('change', handleSettingChange);
    if (toggleHideOnsite) toggleHideOnsite.addEventListener('change', handleSettingChange);
    if (toggleHideNoSalary) toggleHideNoSalary.addEventListener('change', handleSettingChange);
    if (hideModeSelect) hideModeSelect.addEventListener('change', handleSettingChange);

    // Refresh LinkedIn page button
    document.getElementById('btn-refresh-page').addEventListener('click', async () => {
      try {
        const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' });
        if (tabs.length > 0) {
          for (const tab of tabs) {
            await chrome.tabs.reload(tab.id);
          }
          console.log('[Popup] Refreshed', tabs.length, 'LinkedIn tab(s)');
        }
      } catch (error) {
        console.error('[Popup] Failed to refresh tabs:', error);
      }
    });

    // Reset to defaults
    document.getElementById('btn-reset-settings').addEventListener('click', async () => {
      if (confirm('Reset all settings to defaults?')) {
        await saveSettings(DEFAULT_SETTINGS);
        await loadSettings();
        showSettingsNotification();
        // Auto-refresh LinkedIn tabs after reset
        await refreshLinkedInTabs();
      }
    });

    // Notification close button
    const notificationClose = document.getElementById('notification-close');
    if (notificationClose) {
      notificationClose.addEventListener('click', () => {
        const notification = document.getElementById('settings-notification');
        if (notification) {
          notification.classList.remove('show');
        }
      });
    }

    // Listen for storage changes
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes.jobs) {
        const jobs = await getAllJobs();
        updateStats(jobs, currentFilter);
        renderJobs(jobs, currentFilter);
      }
    });
  }

  init();
})();
