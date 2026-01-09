# Testing Plan: LinkedIn Jobs Highlighter V2 Storage & Migration System

## Executive Summary

You've implemented a complete V2 storage and migration infrastructure for the LinkedIn Jobs Highlighter extension, but **it's not yet integrated** with the main content script ([content.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/content.js)). The new system adds:

- **Rich job metadata** (title, company, location, salary, remote status)
- **Job status lifecycle tracking** (applied → interviewing → offer → rejected → withdrawn)
- **Note-taking capability** with timestamps
- **Statistics & analytics** (weekly trends, status breakdown)
- **Safe V1→V2 migration** with rollback capability
- **Settings management** with theme support

**Current State:**
- ✅ V1 system is working (basic highlight on LinkedIn)
- ✅ V2 infrastructure is built ([storage.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/shared/storage.js), [migration.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/utils/migration.js), [constants.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/shared/constants.js))
- ⚠️ V2 is **NOT integrated** into content.js yet
- ✅ Testing infrastructure exists ([test-storage.html](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/test-storage.html), [TESTING_GUIDE.md](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/TESTING_GUIDE.md))

---

## Testing Approach

We'll test the new V2 features **in isolation** first (before integration), then verify the V1 system still works correctly.

### Phase 1: Isolated V2 Testing (Using test-storage.html)
Test the storage manager, migration logic, and all new APIs independently.

### Phase 2: V1 Regression Testing (On LinkedIn)
Ensure the current V1 highlighting functionality still works perfectly.

### Phase 3: Manual Console Testing
Directly test the V2 modules via browser dev tools console.

---

## Phase 1: Isolated V2 Testing

### Prerequisites
1. Load extension as unpacked in Firefox/Chrome
2. Open [test-storage.html](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/test-storage.html) in browser
3. Open DevTools console (F12)

### Critical Files to Test
- [src/shared/storage.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/shared/storage.js) - StorageManager class
- [src/utils/migration.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/utils/migration.js) - MigrationManager class
- [src/shared/constants.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/shared/constants.js) - Configuration constants

### Test Scenarios

#### 1.1 Fresh Install (No Existing Data)
**Goal:** Verify V2 initializes correctly with default schema and settings.

**Steps:**
1. Clear all extension storage: `chrome.storage.local.clear()`
2. Reload extension
3. Check storage contains:
   - `schemaVersion: 2`
   - `settings` object with default values
   - Empty `jobs` object

**Expected Result:**
```javascript
{
  schemaVersion: 2,
  jobs: {},
  settings: { theme: "default", notifications: {...}, ui: {...} }
}
```

**Verification Command:**
```javascript
const data = await chrome.storage.local.get(null);
console.log(data);
```

---

#### 1.2 V1 to V2 Migration (With Existing Data)
**Goal:** Verify safe migration of V1 job IDs to V2 structured format.

**Steps:**
1. Create V1 test data (5 jobs):
   ```javascript
   const v1Data = {
     '1234567890': 1704067200000,
     '9876543210': 1704153600000,
     '1111111111': 1704240000000,
     '2222222222': 1704326400000,
     '3333333333': 1704412800000
   };
   await chrome.storage.local.clear();
   await chrome.storage.local.set({ 'appliedJobIds': v1Data });
   ```

2. Use test-storage.html "Run Migration" button OR manually trigger migration

3. Verify migrated data:
   - All 5 jobs exist in `jobs` object
   - Each job has full structure (id, title, company, dateApplied, status, etc.)
   - Original timestamps preserved in `dateApplied` field
   - `appliedJobIds_backup` exists (for rollback)
   - `schemaVersion` updated to 2
   - `settings` initialized

**Expected Result:**
```javascript
{
  schemaVersion: 2,
  jobs: {
    "1234567890": {
      id: "1234567890",
      title: "Unknown Position",
      company: "Unknown Company",
      url: "https://www.linkedin.com/jobs/view/1234567890",
      dateApplied: 1704067200000,
      dateAdded: 1704067200000,
      status: "applied",
      notes: [],
      statusHistory: [{status: "applied", timestamp: 1704067200000}],
      metadata: {}
    },
    // ... 4 more jobs
  },
  settings: {...},
  statistics: {...},
  appliedJobIds_backup: { /* original V1 data */ }
}
```

**Verification Commands:**
```javascript
const result = await chrome.storage.local.get(null);
console.log('Schema version:', result.schemaVersion);
console.log('Job count:', Object.keys(result.jobs || {}).length);
console.log('Backup exists:', !!result.appliedJobIds_backup);
console.log('Full data:', result);
```

---

#### 1.3 Migration Rollback
**Goal:** Verify ability to restore V1 data if migration fails.

**Steps:**
1. After completing test 1.2 (migration)
2. Trigger rollback (via test-storage.html or manually)
3. Verify:
   - `appliedJobIds` restored from backup
   - `schemaVersion` removed (or set to 1)
   - V2 data (`jobs`, `settings`) removed

**Expected Result:**
Storage should look like V1 format again:
```javascript
{
  appliedJobIds: {
    '1234567890': 1704067200000,
    // ... etc
  }
}
```

---

#### 1.4 Storage Operations (CRUD)
**Goal:** Test StorageManager's job management APIs.

**Tests:**

**A. Save Job**
```javascript
// Via test-storage.html "Add Job" section
// Input: jobId="5555555555", title="Senior Engineer", company="Google"
```
Expected: Job saved with full metadata structure

**B. Get Job**
```javascript
const job = await storageManager.getJob('5555555555');
console.log(job);
```
Expected: Returns full job object

**C. Get All Jobs**
```javascript
const jobs = await storageManager.getAllJobs();
console.log('Total jobs:', Object.keys(jobs).length);
```

**D. Delete Job**
```javascript
await storageManager.deleteJob('5555555555');
const jobs = await storageManager.getAllJobs();
console.log('Job deleted, remaining:', Object.keys(jobs).length);
```

---

#### 1.5 Status Updates & History Tracking
**Goal:** Verify status lifecycle and history tracking.

**Steps:**
1. Create a job (via test UI or console)
2. Update status: applied → interviewing
3. Update status: interviewing → offer
4. Retrieve job and check `statusHistory`

**Expected Result:**
```javascript
{
  status: "offer",
  statusHistory: [
    { status: "applied", timestamp: 1704067200000 },
    { status: "interviewing", timestamp: 1704153600000 },
    { status: "offer", timestamp: 1704240000000 }
  ]
}
```

**Commands:**
```javascript
// Create job
await storageManager.saveJob({
  id: '6666666666',
  title: 'Staff Engineer',
  company: 'Meta',
  dateApplied: Date.now()
});

// Update to interviewing
await storageManager.updateStatus('6666666666', 'interviewing');

// Update to offer
await storageManager.updateStatus('6666666666', 'offer');

// Verify
const job = await storageManager.getJob('6666666666');
console.log('Status:', job.status);
console.log('History:', job.statusHistory);
```

---

#### 1.6 Notes System
**Goal:** Test adding and managing job notes.

**Steps:**
1. Add multiple notes to a job
2. Verify notes have unique IDs and timestamps
3. Delete a specific note
4. Verify note removed

**Commands:**
```javascript
// Add notes
await storageManager.addNote('6666666666', 'Great phone screen with hiring manager');
await storageManager.addNote('6666666666', 'Onsite scheduled for next week');

// Retrieve
const job = await storageManager.getJob('6666666666');
console.log('Notes:', job.notes);

// Delete first note
const noteIdToDelete = job.notes[0].id;
await storageManager.deleteNote('6666666666', noteIdToDelete);

// Verify
const updatedJob = await storageManager.getJob('6666666666');
console.log('Notes after delete:', updatedJob.notes.length); // Should be 1
```

---

#### 1.7 Statistics Calculation
**Goal:** Verify statistics accurately reflect job data.

**Steps:**
1. Create 10 jobs with varied statuses:
   - 5 applied
   - 3 interviewing
   - 1 offer
   - 1 rejected
2. Get statistics
3. Verify counts match

**Expected Result:**
```javascript
{
  totalApplications: 10,
  statusBreakdown: {
    applied: 5,
    interviewing: 3,
    offer: 1,
    rejected: 1,
    withdrawn: 0
  },
  weeklyTrends: { /* ISO week breakdown */ },
  lastUpdated: 1704067200000
}
```

**Commands:**
```javascript
// Create jobs (use loop or test UI)
for (let i = 0; i < 5; i++) {
  await storageManager.saveJob({
    id: `applied_${i}`,
    title: `Job ${i}`,
    company: `Company ${i}`,
    dateApplied: Date.now()
  });
}
// ... create more with different statuses

// Get stats
const stats = await storageManager.getStatistics();
console.log('Statistics:', stats);
```

---

#### 1.8 Weekly Trends Calculation
**Goal:** Verify weekly trend calculation for applications.

**Setup:** Create jobs with staggered dates across multiple weeks.

**Expected:** Weekly trends object with ISO week keys (e.g., "2024-W01": 3)

---

#### 1.9 Search Functionality
**Goal:** Test full-text search across job title, company, location.

**Commands:**
```javascript
const results = await storageManager.searchJobs('engineer');
console.log('Search results:', results);
```

---

#### 1.10 Storage Quota Check
**Goal:** Monitor storage size with large datasets.

**Commands:**
```javascript
const size = await storageManager.getStorageSize();
console.log(`Storage: ${size} bytes (${(size/1024).toFixed(2)} KB)`);
```

**Test:** Create 100 jobs and verify size remains reasonable (< 1MB).

---

#### 1.11 Settings Management
**Goal:** Test settings CRUD operations.

**Commands:**
```javascript
// Get settings
const settings = await storageManager.getSettings();
console.log('Current settings:', settings);

// Update settings
await storageManager.updateSettings({
  theme: 'dark',
  notifications: { enabled: true, reminderDays: 14 }
});

// Verify
const updated = await storageManager.getSettings();
console.log('Updated settings:', updated);
```

---

#### 1.12 Error Handling
**Goal:** Verify graceful error handling for invalid operations.

**Tests:**

**A. Invalid Job ID**
```javascript
try {
  await storageManager.updateStatus('invalid_id', 'interviewing');
} catch (error) {
  console.log('Caught error:', error.message); // Expected
}
```

**B. Empty Note**
```javascript
try {
  await storageManager.addNote('1234567890', '');
} catch (error) {
  console.log('Caught error:', error.message); // Expected
}
```

**C. Invalid Status**
```javascript
try {
  await storageManager.updateStatus('1234567890', 'invalid_status');
} catch (error) {
  console.log('Caught error:', error.message); // Expected
}
```

---

#### 1.13 Data Persistence
**Goal:** Verify data survives browser restart.

**Steps:**
1. Create several jobs with notes and status updates
2. Close browser completely
3. Reopen browser
4. Open extension console and check storage

**Expected:** All data intact.

---

## Phase 2: V1 Regression Testing (LinkedIn Live)

**Goal:** Ensure current V1 highlighting functionality still works perfectly.

### Test Environment
- Real LinkedIn job search pages
- Firefox or Chrome with extension loaded

### Test Cases

#### 2.1 Automatic Detection
**Steps:**
1. Go to https://www.linkedin.com/jobs/
2. Search for any jobs (e.g., "software engineer")
3. Apply to 2-3 jobs through LinkedIn
4. Refresh the page

**Expected:**
- Previously applied jobs are highlighted with red background/border
- "Applied" badge appears next to job title
- Highlight persists across page refreshes

---

#### 2.2 Manual "Mark as Applied" Button
**Steps:**
1. Click on any job posting (detail view)
2. Look for "Mark as Applied" button
3. Click the button

**Expected:**
- Button text changes to "Marked ✓"
- Job ID saved to storage
- When returning to search results, that job is now highlighted

---

#### 2.3 Dynamic Content (Infinite Scroll)
**Steps:**
1. On job search results page, scroll down
2. Wait for new jobs to load dynamically
3. Apply to a newly loaded job
4. Scroll up and back down

**Expected:**
- Newly applied jobs get highlighted as they load
- MutationObserver detects and processes new DOM elements

---

#### 2.4 Cross-Tab Sync
**Steps:**
1. Open LinkedIn jobs in two browser tabs
2. In Tab 1, mark a job as applied
3. Switch to Tab 2

**Expected:**
- Tab 2 automatically highlights the newly marked job (via storage change listener)

---

#### 2.5 Data Verification
**Steps:**
1. After marking several jobs as applied, open extension console
2. Run: `chrome.storage.local.get('appliedJobIds')`

**Expected:**
```javascript
{
  appliedJobIds: {
    "1234567890": 1704067200000,
    "9876543210": 1704153600000
  }
}
```

---

## Phase 3: Manual Console Testing (Extension Context)

### Access Extension Console

**Chrome:**
1. Go to `chrome://extensions/`
2. Find "LinkedIn Jobs — Applied Highlighter"
3. Click "Inspect views: service worker" or "background page"

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Inspect" next to the extension

### Test Modules Directly

Since test-storage.html uses ES6 modules, you can also test by loading modules in extension context:

```javascript
// Import modules (if manifest allows)
// Note: This may require updating manifest.json to include background script

// Direct storage API test
const v1Data = {
  '7777777777': Date.now(),
  '8888888888': Date.now()
};
await chrome.storage.local.set({ 'appliedJobIds': v1Data });

// Verify
const check = await chrome.storage.local.get('appliedJobIds');
console.log('V1 data:', check);
```

---

## Phase 4: Performance & Scale Testing

### Test with Large Dataset

**Goal:** Ensure system handles 100+ jobs efficiently.

**Steps:**
1. Create 100 jobs programmatically
2. Measure operation times:
   - `getAllJobs()` should complete in < 10ms
   - `updateStatistics()` should complete in < 50ms
   - `searchJobs()` should complete in < 20ms

**Commands:**
```javascript
// Create 100 jobs
console.time('create-100-jobs');
for (let i = 0; i < 100; i++) {
  await storageManager.saveJob({
    id: `perf_test_${i}_${Date.now()}`,
    title: `Performance Test Job ${i}`,
    company: `Test Company ${i}`,
    dateApplied: Date.now() - (i * 24 * 60 * 60 * 1000)
  });
}
console.timeEnd('create-100-jobs');

// Test retrieval speed
console.time('getAllJobs');
const jobs = await storageManager.getAllJobs();
console.timeEnd('getAllJobs');
console.log('Job count:', Object.keys(jobs).length);

// Test stats calculation
console.time('getStatistics');
const stats = await storageManager.getStatistics();
console.timeEnd('getStatistics');

// Check storage size
const size = await storageManager.getStorageSize();
console.log(`Storage: ${(size/1024).toFixed(2)} KB`);
```

**Acceptance Criteria:**
- Operations complete within time limits
- Storage size < 1 MB for 100 jobs
- No browser console errors
- UI remains responsive

---

## Success Criteria Checklist

### ✅ Storage System
- [ ] Fresh install initializes V2 schema correctly
- [ ] Can save jobs with full metadata
- [ ] Can retrieve individual jobs by ID
- [ ] Can get all jobs at once
- [ ] Can update job status with history tracking
- [ ] Can add timestamped notes to jobs
- [ ] Can delete specific notes
- [ ] Can delete entire jobs
- [ ] Settings can be read and updated
- [ ] Data persists across browser sessions

### ✅ Migration System
- [ ] V1 data migrates to V2 successfully
- [ ] All job IDs and timestamps preserved
- [ ] Backup created automatically
- [ ] Rollback restores V1 data correctly
- [ ] Invalid timestamps handled gracefully
- [ ] Invalid job IDs handled gracefully
- [ ] Migration status reporting works

### ✅ Statistics & Analytics
- [ ] Statistics calculate correctly for all statuses
- [ ] Total application count accurate
- [ ] Status breakdown matches actual data
- [ ] Weekly trends calculated correctly using ISO weeks
- [ ] Statistics update when jobs change

### ✅ V1 Regression (LinkedIn)
- [ ] Job cards highlight correctly on search results
- [ ] "Applied" badge appears on highlighted jobs
- [ ] "Mark as Applied" button works on detail pages
- [ ] Infinite scroll detection works
- [ ] Cross-tab synchronization works
- [ ] MutationObserver catches dynamic updates

### ✅ Performance
- [ ] `getAllJobs()` completes in < 10ms
- [ ] `updateStatistics()` completes in < 50ms
- [ ] `searchJobs()` completes in < 20ms
- [ ] Handles 100+ jobs without performance degradation
- [ ] Storage size remains reasonable (< 1MB for 100 jobs)
- [ ] No memory leaks or console errors

### ✅ Error Handling
- [ ] Invalid job IDs throw appropriate errors
- [ ] Empty notes rejected
- [ ] Invalid statuses rejected
- [ ] Storage quota errors handled
- [ ] Network errors handled gracefully

---

## Known Limitations & Next Steps

### Current Limitations
1. **V2 not integrated with content.js** - New features not yet active on LinkedIn
2. **No popup UI** - No visual dashboard for statistics/notes yet
3. **No options page** - Settings management not exposed to users
4. **test-storage.html requires extension context** - Can't run standalone in browser

### Integration Roadmap (Post-Testing)
Once testing confirms V2 works correctly:

1. **Update content.js** to use StorageManager instead of direct chrome.storage calls
2. **Add migration trigger** to content.js initialization
3. **Build popup UI** for dashboard (statistics, job list, status management)
4. **Build options page** for settings/preferences
5. **Add service worker** if needed for background operations
6. **Update manifest.json** to include new files as modules

---

## Files to Monitor During Testing

### Critical Files
- [content.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/content.js) (141 lines) - Main V1 logic
- [src/shared/storage.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/shared/storage.js) (9,245 bytes) - StorageManager class
- [src/utils/migration.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/utils/migration.js) (8,916 bytes) - Migration logic
- [src/shared/constants.js](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/src/shared/constants.js) (1,644 bytes) - Configuration

### Testing Resources
- [test-storage.html](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/test-storage.html) - Interactive test UI
- [TESTING_GUIDE.md](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/TESTING_GUIDE.md) - Detailed instructions

### Configuration
- [manifest.json](../../../Users/young/OneDrive/Desktop/Learn/Code/linkedin-jobs-highlighter/manifest.json) - Extension config (needs update for V2 modules)

---

## Testing Timeline Recommendation

Suggested order for efficient testing:

1. **Start with V1 regression** (15 min) - Ensure current functionality works
2. **Fresh install V2 test** (5 min) - Verify initialization
3. **Migration test** (10 min) - Core V1→V2 migration
4. **Storage operations** (20 min) - CRUD operations
5. **Status & notes** (10 min) - Lifecycle tracking
6. **Statistics** (10 min) - Analytics calculation
7. **Error handling** (10 min) - Edge cases
8. **Performance testing** (15 min) - Large dataset
9. **Final integration check** (10 min) - Verify both systems coexist

**Total estimated time: ~2 hours**

---

## Verification Commands Quick Reference

```javascript
// View all storage
const all = await chrome.storage.local.get(null);
console.log(JSON.stringify(all, null, 2));

// Clear all data
await chrome.storage.local.clear();

// Check schema version
const version = await chrome.storage.local.get('schemaVersion');
console.log('Schema:', version.schemaVersion);

// Count jobs
const jobs = await storageManager.getAllJobs();
console.log('Total jobs:', Object.keys(jobs).length);

// Export data
const data = await chrome.storage.local.get(null);
const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'extension-backup.json';
a.click();
```

---

## Summary

Your LinkedIn Jobs Highlighter V2 architecture is well-designed and ready for comprehensive testing. The plan above tests:

1. **Isolation testing** of new V2 features via test-storage.html
2. **Regression testing** of existing V1 functionality on live LinkedIn
3. **Migration safety** with rollback capability
4. **Performance** with large datasets
5. **Error handling** for edge cases

Once testing confirms everything works, the next phase is integrating V2 into content.js and building the popup UI dashboard.
