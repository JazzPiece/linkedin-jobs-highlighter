# LinkedIn Jobs Highlighter - Enhancement Implementation Plan

## Overview
Transform the existing LinkedIn Jobs Highlighter into a full-featured job application tracking system with statistics dashboard, notes, status tracking, export capabilities, and visual customization. Support both Firefox and Chrome Web Stores.

## User Requirements
- ✅ Statistics Dashboard with charts and trends
- ✅ Application Notes & Status Tracking (Applied → Interviewing → Offer/Rejected)
- ✅ Data Export & Backup (CSV/Excel/JSON)
- ✅ Visual Customization & Themes (dark mode, custom colors)
- ✅ Full-featured professional implementation
- ✅ Chrome Web Store compatibility (already works on Firefox)

## Current State Analysis
- **Version:** 1.0.1
- **Architecture:** Single content script (content.js), basic storage, Manifest V3
- **Storage:** Simple flat map `{ jobId: timestamp }`
- **Features:** Auto-detection, visual highlighting, manual marking
- **Browser Support:** Firefox (published), Chrome (compatible but not published)
- **Git:** Initialized and pushed to https://github.com/JazzPiece/linkedin-highlighter.git

## Implementation Strategy

### Phase 1: Foundation & Data Layer (Week 1)

#### 1.1 Create New Directory Structure
```
src/
├── content/          # Content scripts (refactored)
├── popup/            # Dashboard UI
├── options/          # Settings page
├── background/       # Service worker
├── shared/           # Shared utilities
└── utils/            # Export, import, migration

assets/
├── icons/            # Extension icons
└── themes/           # Theme definitions
```

#### 1.2 Enhanced Storage Schema (NEW: `src/shared/storage.js`)
**Critical File #1** - Foundation for all features

**New Schema Structure:**
```javascript
{
  "schemaVersion": 2,
  "jobs": {
    "jobId": {
      "id": "jobId",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "url": "https://linkedin.com/jobs/view/jobId",
      "dateApplied": timestamp,
      "dateAdded": timestamp,
      "status": "applied|interviewing|offer|rejected",
      "notes": [{ "id", "text", "timestamp" }],
      "statusHistory": [{ "status", "timestamp" }],
      "metadata": { "location", "salary", "remote" }
    }
  },
  "settings": {
    "theme": "default|dark|custom",
    "customColors": { statusColors },
    "notifications": { enabled, reminderDays },
    "ui": { showBadges, compactMode }
  },
  "statistics": {
    "totalApplications": number,
    "weeklyTrends": { "2024-W01": count },
    "statusBreakdown": { status: count }
  }
}
```

**Implementation:**
- Create `StorageManager` class with CRUD operations
- Methods: `getJob()`, `saveJob()`, `updateStatus()`, `addNote()`, `deleteJob()`
- Statistics calculations: `calculateStats()`, `getWeeklyTrends()`, `getStatusBreakdown()`
- Settings management: `getSettings()`, `updateSettings()`

#### 1.3 Data Migration (NEW: `src/utils/migration.js`)
**Critical File #2** - Backward compatibility

**Migration Flow:**
1. Detect schema version (check for `schemaVersion` key)
2. If v1 detected: backup old data to `appliedJobIds_backup`
3. Transform: `{ jobId: timestamp }` → new job object structure
4. Set defaults: status="applied", empty notes array
5. Set `schemaVersion: 2`
6. Validate migrated data
7. Save to storage

**Edge Cases:**
- No existing data (fresh install)
- Corrupted data (validation + skip invalid entries)
- Partial migration failure (rollback to backup)

#### 1.4 Shared Constants (NEW: `src/shared/constants.js`)
```javascript
// Storage keys
STORAGE_KEYS = { JOBS, SETTINGS, STATISTICS, SCHEMA_VERSION }

// Job statuses
JOB_STATUS = { APPLIED, INTERVIEWING, OFFER, REJECTED, WITHDRAWN }

// Default theme colors
DEFAULT_COLORS = { applied: "#772a2a", ... }

// UI constants
MAX_NOTES_LENGTH = 1000
JOBS_PER_PAGE = 50
```

---

### Phase 2: Content Script Enhancement (Week 2)

#### 2.1 Refactor Content Script
**Refactor:** `content.js` → modular structure

**NEW: `src/content/content.js`** (~80 lines)
**Critical File #5** - Main orchestrator
- Initialize all modules
- Set up MutationObserver
- Listen for storage changes
- Apply theme on load
- Boot sequence

**NEW: `src/content/job-detector.js`** (~120 lines)
- Move existing detection logic
- Add metadata scraping: `extractJobMetadata(element)` returns { title, company, location }
- Enhance `findAllJobCardNodes()` for robustness
- Parse job details from DOM

**NEW: `src/content/ui-injector.js`** (~150 lines)
- Move existing UI injection logic
- Add status-based coloring: `applyStatusColor(element, status)`
- Enhance badge with status indicator
- Add hover tooltip showing last note
- Theme-aware styling

**RENAME:** `styles.css` → `src/content/content.css`
- Add CSS custom properties for theming
- Status-specific colors using variables
- Dark mode support

---

### Phase 3: Popup Dashboard UI (Weeks 3-4)

#### 3.1 Popup HTML Structure (NEW: `src/popup/popup.html`)
**Critical File #4** - Main UI

**Layout:**
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div id="app">
    <!-- Navigation -->
    <nav>
      <button data-view="dashboard">Dashboard</button>
      <button data-view="jobs">Jobs</button>
      <button data-view="export">Export</button>
    </nav>

    <!-- Dashboard View -->
    <div id="dashboard-view">
      <div class="stats-cards">
        <div class="stat-card">Total: <span id="total">0</span></div>
        <div class="stat-card">This Week: <span id="week">0</span></div>
        <div class="stat-card">This Month: <span id="month">0</span></div>
      </div>
      <canvas id="weeklyChart"></canvas>
      <canvas id="statusChart"></canvas>
    </div>

    <!-- Jobs List View -->
    <div id="jobs-view" style="display:none">
      <div class="filters">
        <select id="statusFilter">All | Applied | Interviewing...</select>
        <input type="search" placeholder="Search..." />
      </div>
      <table id="jobsTable">...</table>
    </div>

    <!-- Job Detail Modal -->
    <div id="jobModal" class="modal">
      <div class="modal-content">
        <h2 id="jobTitle"></h2>
        <select id="statusSelect">...</select>
        <div id="notes">...</div>
        <textarea id="newNote"></textarea>
        <button id="addNote">Add Note</button>
      </div>
    </div>

    <!-- Export View -->
    <div id="export-view" style="display:none">
      <button id="exportCSV">Export CSV</button>
      <button id="exportExcel">Export Excel</button>
      <button id="exportJSON">Export JSON</button>
      <button id="importData">Import Data</button>
    </div>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

#### 3.2 Popup JavaScript (NEW: `src/popup/popup.js`)
**Critical File #3** - Main popup controller (~300 lines)

**Responsibilities:**
- Initialize views and routing
- Load data from storage via StorageManager
- Render dashboard stats and charts
- Handle navigation between views
- Coordinate all popup components

**Key Methods:**
```javascript
class PopupApp {
  async init() {
    await this.loadData();
    this.renderDashboard();
    this.setupEventListeners();
    this.setupNavigation();
  }

  async loadData() {
    this.jobs = await storageManager.getAllJobs();
    this.settings = await storageManager.getSettings();
    this.stats = await storageManager.getStatistics();
  }

  renderDashboard() {
    this.updateStatsCards();
    this.renderWeeklyChart();
    this.renderStatusChart();
  }

  renderJobsList(filter = null) { /* ... */ }
  openJobDetail(jobId) { /* ... */ }
  handleExport(format) { /* ... */ }
}
```

#### 3.3 Dashboard Components (NEW: `src/popup/components/dashboard.js`)
**Statistics Dashboard Logic:**
- Calculate total applications
- Group by week: `getWeeklyTrends(jobs)` → `{ "2024-W01": 5, ... }`
- Status breakdown: `getStatusBreakdown(jobs)` → `{ applied: 30, ... }`
- Response rate: (interviewing + offer + rejected) / total

**Chart Rendering:**
```javascript
function renderWeeklyChart(data) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(weeklyTrends),
      datasets: [{
        label: 'Applications per Week',
        data: Object.values(weeklyTrends),
        borderColor: '#2a4577',
        tension: 0.4
      }]
    },
    options: { responsive: true, ... }
  });
}
```

**Use Chart.js** from CDN (42KB, industry standard, excellent docs)

#### 3.4 Job List Component (NEW: `src/popup/components/job-list.js`)
**Features:**
- Filterable by status
- Sortable by date, company, title
- Searchable
- Paginated (50 per page)
- Click row to open detail modal

**Table Structure:**
| Company | Title | Date Applied | Status | Last Note |
|---------|-------|--------------|--------|-----------|
| Tech Co | SWE   | 2024-01-01   | 🟢 Applied | Great... |

#### 3.5 Job Detail Modal (NEW: `src/popup/components/job-detail.js`)
**Features:**
- Display job info (title, company, date, URL link)
- Status dropdown with color preview
- Notes list (newest first, with timestamps)
- Add new note (textarea + button)
- Delete note button (with confirmation)
- Save/Close buttons

**Status Change Flow:**
1. User selects new status from dropdown
2. Confirm dialog: "Change status to Interviewing?"
3. Update storage: `updateStatus(jobId, newStatus)`
4. Add to statusHistory array
5. Update UI + refresh list
6. Apply new color to LinkedIn page (if open)

---

### Phase 4: Export & Import (Week 5)

#### 4.1 Export Functionality (NEW: `src/utils/export.js`)
**Critical File #6**

**CSV Export:**
```javascript
function exportToCSV(jobs) {
  const headers = ['Job ID', 'Company', 'Title', 'Date Applied', 'Status', 'URL', 'Notes'];
  const rows = jobs.map(job => [
    job.id,
    job.company,
    job.title,
    formatDate(job.dateApplied),
    job.status,
    job.url,
    job.notes.map(n => n.text).join('; ')
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  downloadFile('linkedin-jobs.csv', csv, 'text/csv');
}
```

**JSON Export:**
```javascript
function exportToJSON(jobs, settings, stats) {
  const backup = {
    version: 2,
    exportDate: new Date().toISOString(),
    jobs,
    settings,
    statistics: stats
  };

  downloadFile('linkedin-jobs-backup.json',
    JSON.stringify(backup, null, 2),
    'application/json'
  );
}
```

**Excel Export (Optional - using SheetJS):**
- Requires adding xlsx library (~500KB)
- Multiple sheets: Jobs, Statistics
- Formatted with colors and filters

**Download Helper:**
```javascript
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: true });
}
```

#### 4.2 Import Functionality (NEW: `src/utils/import.js`)
**Features:**
- Support CSV and JSON
- Validate file structure
- Preview data before import
- Merge strategy: skip duplicates or update existing
- Error handling for malformed data

**Import Flow:**
1. User selects file via `<input type="file">`
2. Parse file (CSV parser or JSON.parse)
3. Validate structure and required fields
4. Show preview table: X jobs to import, Y duplicates found
5. User confirms
6. Merge into storage
7. Show success message

---

### Phase 5: Options Page & Themes (Week 6)

#### 5.1 Options Page HTML (NEW: `src/options/options.html`)
**Layout:**
```html
<div class="options-container">
  <h1>LinkedIn Jobs Tracker - Settings</h1>

  <section class="theme-section">
    <h2>Theme</h2>
    <select id="themeSelect">
      <option value="default">Default (Red)</option>
      <option value="dark">Dark Mode</option>
      <option value="professional">Professional</option>
      <option value="custom">Custom</option>
    </select>
    <div class="preview-card">Preview</div>
  </section>

  <section class="custom-colors" id="customSection" style="display:none">
    <h2>Custom Colors</h2>
    <label>Applied: <input type="color" id="appliedColor" /></label>
    <label>Interviewing: <input type="color" id="interviewingColor" /></label>
    <label>Offer: <input type="color" id="offerColor" /></label>
    <label>Rejected: <input type="color" id="rejectedColor" /></label>
  </section>

  <section class="ui-preferences">
    <h2>UI Preferences</h2>
    <label><input type="checkbox" id="showBadges" /> Show status badges</label>
    <label><input type="checkbox" id="compactMode" /> Compact mode</label>
  </section>

  <button id="saveSettings">Save Settings</button>
  <button id="resetDefaults">Reset to Defaults</button>
</div>
```

#### 5.2 Theme Manager (NEW: `src/shared/theme-manager.js`)
**Responsibilities:**
- Load theme from settings
- Apply theme to content script (inject CSS variables)
- Apply theme to popup/options pages
- Built-in themes as JSON objects

**Built-in Themes:**
1. **Default** - Current red highlighting
2. **Dark** - Dark backgrounds, light text, muted status colors
3. **Professional** - Subtle blues/grays, business-appropriate

**Theme Application:**
```javascript
async function applyTheme(themeName) {
  const theme = await getTheme(themeName);

  // Inject CSS variables
  document.documentElement.style.setProperty('--status-applied', theme.colors.applied);
  document.documentElement.style.setProperty('--status-interviewing', theme.colors.interviewing);
  // ... more colors

  // Save to settings
  await storageManager.updateSettings({ theme: themeName, customColors: theme.colors });
}
```

---

### Phase 6: Background Service Worker (Week 7)

#### 6.1 Service Worker (NEW: `src/background/service-worker.js`)
**Responsibilities:**
- Handle extension lifecycle (install, update)
- Run migration on install
- Update badge counter
- Context menu integration
- Notification scheduler (optional)

**Badge Counter:**
```javascript
async function updateBadge() {
  const jobs = await storageManager.getAllJobs();
  const count = jobs.length;
  chrome.action.setBadgeText({ text: String(count) });
  chrome.action.setBadgeBackgroundColor({ color: '#772a2a' });
}

// Update on storage change
chrome.storage.onChanged.addListener(updateBadge);
```

**Context Menu:**
```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'markApplied',
    title: 'Mark as Applied',
    contexts: ['link'],
    targetUrlPatterns: ['*://www.linkedin.com/jobs/view/*']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'markApplied') {
    const jobId = extractJobIdFromUrl(info.linkUrl);
    storageManager.saveJob({ id: jobId, dateApplied: Date.now(), status: 'applied' });
  }
});
```

**Notifications (Optional):**
```javascript
// Weekly summary
chrome.alarms.create('weeklySummary', { periodInMinutes: 10080 }); // 7 days

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'weeklySummary') {
    const stats = await storageManager.getStatistics();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon128.png',
      title: 'Weekly Application Summary',
      message: `You applied to ${stats.thisWeek} jobs this week!`
    });
  }
});
```

---

### Phase 7: Manifest Updates

#### 7.1 Updated manifest.json
**Changes:**
```json
{
  "manifest_version": 3,
  "name": "LinkedIn Jobs Tracker Pro",
  "version": "2.0.0",
  "description": "Track, organize, and analyze your LinkedIn job applications with notes, status tracking, and statistics.",

  "permissions": [
    "storage",
    "alarms",
    "contextMenus"
  ],

  "optional_permissions": [
    "notifications"
  ],

  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },

  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "32": "assets/icons/icon32.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },

  "options_ui": {
    "page": "src/options/options.html",
    "open_in_tab": true
  },

  "content_scripts": [
    {
      "matches": ["*://www.linkedin.com/jobs/*"],
      "js": [
        "src/shared/constants.js",
        "src/shared/storage.js",
        "src/content/job-detector.js",
        "src/content/ui-injector.js",
        "src/content/content.js"
      ],
      "css": ["src/content/content.css"],
      "run_at": "document_idle"
    }
  ],

  "icons": {
    "16": "assets/icons/icon16.png",
    "32": "assets/icons/icon32.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  },

  "browser_specific_settings": {
    "gecko": {
      "id": "li-applied-highlighter@jasur",
      "strict_min_version": "109.0"
    }
  }
}
```

---

### Phase 8: Chrome Compatibility

#### 8.1 Browser API Compatibility
**Both Chrome and Firefox support:**
- ✅ Manifest V3
- ✅ chrome.storage API (Firefox aliases it)
- ✅ Service workers
- ✅ Content scripts
- ✅ Chart.js and all web APIs

**Add Browser Polyfill (NEW: `src/shared/browser-polyfill.js`):**
```javascript
// Handle Chrome vs Firefox API differences
export const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
```

**No major compatibility issues expected!**

#### 8.2 Chrome Web Store Requirements
**Required Assets:**
1. **Extension Icons** (16x16, 32x32, 48x48, 128x128 PNG)
2. **Store Screenshots** (1280x800, minimum 3 images)
3. **Privacy Policy** (`PRIVACY_POLICY.md`)
4. **Detailed Description** (for store listing)

**Create: `PRIVACY_POLICY.md`**
```markdown
# Privacy Policy

LinkedIn Jobs Tracker Pro respects your privacy:

- **No data collection**: We don't collect any personal data
- **Local storage only**: All job data stored locally in your browser
- **No external servers**: No data sent to external servers
- **No tracking**: No analytics or user tracking
- **Open source**: Code is publicly available on GitHub

Permissions explained:
- storage: Store your job applications locally
- alarms: Schedule optional reminder notifications
- contextMenus: Add right-click menu options
- notifications: Show optional weekly summaries
- linkedin.com/jobs/*: Access LinkedIn job pages to highlight applied jobs
```

---

### Phase 9: Testing Strategy

#### 9.1 Migration Testing
**Test Cases:**
1. Fresh install (no data) → should create v2 schema
2. Upgrade from v1 with 5 jobs → all jobs migrated with correct timestamps
3. Upgrade from v1 with 100+ jobs → performance test
4. Corrupted data → handle gracefully, skip invalid entries

#### 9.2 Feature Testing
**Dashboard:**
- [ ] Stats display correctly (total, week, month)
- [ ] Charts render with correct data
- [ ] Charts responsive to window resize

**Job Management:**
- [ ] Add note to job → appears in list
- [ ] Change status → color updates on LinkedIn page
- [ ] Delete note → confirmation dialog works
- [ ] Job list filtering by status works
- [ ] Job search works

**Export/Import:**
- [ ] CSV export contains all fields
- [ ] JSON export creates valid backup
- [ ] Import CSV validates and merges correctly
- [ ] Import handles duplicates properly

**Themes:**
- [ ] Theme switcher applies immediately
- [ ] Custom colors persist after restart
- [ ] Dark mode works correctly
- [ ] Theme applies to LinkedIn page

#### 9.3 Cross-Browser Testing
- [ ] Test all features on Chrome
- [ ] Test all features on Firefox
- [ ] Compare visual rendering
- [ ] Test on Windows, Mac, Linux

---

## Implementation Order (Prioritized)

### Week 1: Core Foundation
1. ✅ Create directory structure
2. ✅ Implement `src/shared/storage.js` (StorageManager class)
3. ✅ Implement `src/utils/migration.js`
4. ✅ Create `src/shared/constants.js`
5. ✅ Write tests for storage and migration

### Week 2: Content Script
6. ✅ Refactor `content.js` → split into modules
7. ✅ Implement `src/content/job-detector.js`
8. ✅ Implement `src/content/ui-injector.js` with status colors
9. ✅ Update CSS with theme variables

### Week 3-4: Popup Dashboard
10. ✅ Create `src/popup/popup.html` structure
11. ✅ Implement `src/popup/popup.js` (main controller)
12. ✅ Integrate Chart.js
13. ✅ Implement dashboard stats calculation
14. ✅ Implement job list with filters
15. ✅ Implement job detail modal with notes
16. ✅ Style popup with responsive CSS

### Week 5: Export/Import
17. ✅ Implement `src/utils/export.js` (CSV + JSON)
18. ✅ Implement `src/utils/import.js`
19. ✅ Add export/import UI in popup
20. ✅ Test with large datasets (100+ jobs)

### Week 6: Themes & Options
21. ✅ Create `src/options/options.html`
22. ✅ Implement `src/shared/theme-manager.js`
23. ✅ Create built-in themes (default, dark, professional)
24. ✅ Implement custom color picker
25. ✅ Theme preview functionality

### Week 7: Background Worker
26. ✅ Implement `src/background/service-worker.js`
27. ✅ Add badge counter
28. ✅ Add context menu integration
29. ✅ Add optional notifications

### Week 8: Polish & Icons
30. ✅ Create extension icons (16, 32, 48, 128)
31. ✅ Update manifest.json completely
32. ✅ Cross-browser testing
33. ✅ Performance optimization
34. ✅ Bug fixes

### Week 9: Store Preparation
35. ✅ Create privacy policy
36. ✅ Prepare store screenshots
37. ✅ Write detailed store description
38. ✅ Update README with new features
39. ✅ Submit to Chrome Web Store
40. ✅ Update Firefox Add-ons listing

---

## Critical Files Summary

**Must Create (Priority Order):**
1. `src/shared/storage.js` - Storage abstraction layer (~200 lines)
2. `src/utils/migration.js` - v1→v2 migration (~100 lines)
3. `src/popup/popup.js` - Main popup controller (~300 lines)
4. `src/popup/popup.html` - Popup UI structure (~150 lines)
5. `src/content/content.js` - Refactored content script (~80 lines)

**Must Modify:**
- `manifest.json` - Add permissions, popup, options, background worker
- `README.md` - Update with new features and screenshots
- `.gitignore` - Add node_modules if using build tools

**Must Create (Supporting):**
- `src/popup/popup.css` - Dashboard styling
- `src/content/job-detector.js` - Job detection logic
- `src/content/ui-injector.js` - UI injection logic
- `src/utils/export.js` - Export functionality
- `src/options/options.html` - Settings page
- `src/shared/theme-manager.js` - Theme management
- `assets/icons/` - Extension icons
- `PRIVACY_POLICY.md` - Privacy policy for stores

---

## Important Note: Git Commits

**User Requirement:** All git commits should NOT include Claude Code attribution or co-author lines.
- Remove "🤖 Generated with Claude Code" footer
- Remove "Co-Authored-By: Claude Sonnet 4.5" line
- Standard commit messages only

## Success Criteria

**Technical:**
- ✅ 100% backward compatibility (all v1 data migrates successfully)
- ✅ Works on both Chrome and Firefox
- ✅ No console errors
- ✅ Popup loads in <100ms
- ✅ Handles 500+ jobs without performance issues

**Features:**
- ✅ Dashboard shows accurate statistics and charts
- ✅ Notes and status tracking works flawlessly
- ✅ Export to CSV/JSON works correctly
- ✅ Import validates and merges data properly
- ✅ Themes apply to both LinkedIn page and popup
- ✅ Context menu integration works

**User Experience:**
- ✅ Intuitive UI/UX
- ✅ Responsive design
- ✅ Clear visual feedback
- ✅ Helpful error messages

**Distribution:**
- ✅ Published on Chrome Web Store
- ✅ Updated on Firefox Add-ons
- ✅ Professional store listing with screenshots
- ✅ 4.5+ star rating

---

## Risk Mitigation

**Risk 1: LinkedIn DOM Changes**
- Mitigation: Multiple selector fallbacks, version tracking

**Risk 2: Storage Limits (10MB Chrome limit)**
- Mitigation: Warn at 8MB, implement archival, suggest export

**Risk 3: Migration Failures**
- Mitigation: Backup before migration, validation, rollback capability

**Risk 4: Performance with Large Datasets**
- Mitigation: Pagination, virtual scrolling, lazy loading, caching

---

## Next Steps After Implementation

**Future Features (v2.1):**
- Follow-up reminders (7/14/30 day notifications)
- Company research notes section
- Interview preparation checklist
- Salary comparison charts
- Application templates

**Future Features (v3.0):**
- AI-powered insights
- Integration with other job boards (Indeed, Glassdoor)
- Mobile companion app
- Cloud sync (optional, with user account)

---

## Estimated Timeline

**Total: 8-9 weeks for full implementation**
- Weeks 1-2: Foundation (storage, migration, content script)
- Weeks 3-4: Popup dashboard (UI, charts, job management)
- Week 5: Export/import functionality
- Week 6: Options page and themes
- Week 7: Background service worker
- Week 8: Testing, polish, icons
- Week 9: Store preparation and submission

**MVP (Minimum Viable Product) Timeline: 4-5 weeks**
- Focus on: Storage, migration, basic popup, notes, status, CSV export, one extra theme
