# Testing Guide - LinkedIn Jobs Tracker

## Overview
This guide will help you test the storage system, migration functionality, and all new features as we build them.

---

## Prerequisites

1. **Browser:** Chrome or Firefox (latest version)
2. **Developer Tools:** Know how to open Developer Console (F12)
3. **Extension:** Loaded as unpacked extension

---

## Part 1: Testing Storage & Migration

### Step 1: Load Extension as Unpacked

#### For Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `linkedin-highlighter` folder
5. Note the Extension ID

#### For Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the `linkedin-highlighter` folder

### Step 2: Test with the Test Page

1. Open `test-storage.html` in your browser
2. The page won't work directly due to extension context requirements
3. Instead, we'll test via the extension's background context

#### Alternative Testing Method: Using Extension Console

**For Chrome:**
1. Go to `chrome://extensions/`
2. Find "LinkedIn Jobs Tracker"
3. Click "Inspect views: background page" (or service worker)
4. In the console, you can directly test the storage APIs

**For Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Inspect" next to your extension
3. Use the console to test

### Step 3: Manual Testing via Console

Open the extension console and run these commands:

```javascript
// Import the storage manager (will be available once we update manifest)
// For now, test basic chrome.storage

// 1. Test V1 Data Creation
const v1Data = {
  '1234567890': 1704067200000,
  '9876543210': 1704153600000,
  '1111111111': 1704240000000
};
await chrome.storage.local.set({ 'appliedJobIds': v1Data });
console.log('V1 data created');

// 2. Verify V1 data
const result = await chrome.storage.local.get('appliedJobIds');
console.log('V1 data:', result);

// 3. Check all storage
const allData = await chrome.storage.local.get(null);
console.log('All storage:', allData);
```

---

## Part 2: Testing on LinkedIn

### Step 1: Basic Highlighting Test

1. Load the extension (as unpacked)
2. Go to https://linkedin.com/jobs/
3. Search for any jobs
4. Apply to a few jobs (or mark them as applied manually)
5. Refresh the page
6. **Expected:** Previously applied jobs should be highlighted in red

### Step 2: Test "Mark as Applied" Button

1. Click on any job posting to open the detail view
2. Look for the "Mark as Applied" button
3. Click the button
4. **Expected:**
   - Button text changes to "Marked ✓"
   - Job is saved to storage
   - If you go back to search results, that job should now be highlighted

### Step 3: Verify Data Persistence

1. After marking some jobs as applied, close the browser
2. Reopen the browser
3. Go back to LinkedIn jobs
4. **Expected:** Your previously applied jobs should still be highlighted

---

## Part 3: Testing Migration (V1 → V2)

### Scenario 1: Fresh Install (No Data)

1. **Clear all extension data:**
   ```javascript
   await chrome.storage.local.clear();
   ```

2. **Reload extension**

3. **Check storage:**
   ```javascript
   const data = await chrome.storage.local.get(null);
   console.log('Fresh install data:', data);
   // Expected: schemaVersion: 2, settings: {...}
   ```

### Scenario 2: Upgrade from V1 (With Data)

1. **Create V1 test data:**
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
   console.log('V1 data created');
   ```

2. **Verify V1 data exists:**
   ```javascript
   const check = await chrome.storage.local.get('appliedJobIds');
   console.log('V1 data:', check);
   ```

3. **Reload extension** (this should trigger migration)

4. **Check migrated data:**
   ```javascript
   const result = await chrome.storage.local.get(null);
   console.log('After migration:', result);
   // Expected:
   // - schemaVersion: 2
   // - jobs: { jobId: { full job object }, ... }
   // - appliedJobIds_backup: {...}
   // - settings: {...}
   // - statistics: {...}
   ```

5. **Verify job count:**
   ```javascript
   const data = await chrome.storage.local.get('jobs');
   const jobCount = Object.keys(data.jobs || {}).length;
   console.log(`Migrated ${jobCount} jobs (expected: 5)`);
   ```

### Scenario 3: Test Rollback

1. **After migration, test rollback:**
   ```javascript
   // This will restore V1 data from backup
   // (Implementation pending - will be added when we integrate migration)
   ```

---

## Part 4: Testing Storage Operations

Once the storage system is integrated, test these operations:

### Test Adding Jobs

```javascript
// Add a job
await storageManager.saveJob({
  id: '1234567890',
  title: 'Senior Software Engineer',
  company: 'Google',
  dateApplied: Date.now()
});

// Verify
const job = await storageManager.getJob('1234567890');
console.log('Added job:', job);
```

### Test Updating Job Status

```javascript
// Update status
await storageManager.updateStatus('1234567890', 'interviewing');

// Verify
const job = await storageManager.getJob('1234567890');
console.log('Updated job status:', job.status); // Should be 'interviewing'
console.log('Status history:', job.statusHistory);
```

### Test Adding Notes

```javascript
// Add note
await storageManager.addNote('1234567890', 'Had a great phone screen with the hiring manager');

// Verify
const job = await storageManager.getJob('1234567890');
console.log('Job notes:', job.notes);
```

### Test Statistics Calculation

```javascript
// Get statistics
const stats = await storageManager.getStatistics();
console.log('Statistics:', stats);
// Expected: totalApplications, statusBreakdown, weeklyTrends
```

---

## Part 5: Performance Testing

### Test with Large Dataset

1. **Create 100 sample jobs:**
   ```javascript
   // Run this in extension console
   for (let i = 0; i < 100; i++) {
     await storageManager.saveJob({
       id: `job${i}${Date.now()}`,
       title: `Job ${i}`,
       company: `Company ${i}`,
       dateApplied: Date.now() - (i * 24 * 60 * 60 * 1000) // Stagger dates
     });
   }
   console.log('Created 100 jobs');
   ```

2. **Check storage size:**
   ```javascript
   const size = await storageManager.getStorageSize();
   console.log(`Storage size: ${size} bytes (${(size/1024).toFixed(2)} KB)`);
   ```

3. **Test query performance:**
   ```javascript
   console.time('getAllJobs');
   const jobs = await storageManager.getAllJobs();
   console.timeEnd('getAllJobs');
   // Should be < 10ms
   ```

---

## Part 6: Error Handling Tests

### Test Invalid Data

```javascript
// Test with invalid job ID
try {
  await storageManager.updateStatus('invalid_id', 'interviewing');
} catch (error) {
  console.log('Caught error:', error.message); // Expected
}

// Test with empty note
try {
  await storageManager.addNote('1234567890', '');
} catch (error) {
  console.log('Caught error:', error.message);
}
```

---

## Troubleshooting

### Issue: "storageManager is not defined"

**Solution:** The storage manager needs to be imported in the context where you're testing. If testing in background script console, make sure the background script imports and initializes the storage manager.

### Issue: Migration not running

**Solution:**
1. Check console for migration logs
2. Verify V1 data exists: `await chrome.storage.local.get('appliedJobIds')`
3. Check schema version: `await chrome.storage.local.get('schemaVersion')`

### Issue: Data not persisting

**Solution:**
1. Check for console errors
2. Verify storage permissions in manifest.json
3. Check browser's extension storage quota

### Issue: Extension not loading

**Solution:**
1. Check for syntax errors in console
2. Verify all file paths in manifest.json
3. Reload the extension after code changes

---

## Next Steps

After confirming the storage and migration work:

1. ✅ Test storage operations
2. ✅ Test migration from V1 to V2
3. ✅ Test on LinkedIn (basic highlighting still works)
4. ➡️ **Next:** Build the popup dashboard UI
5. ➡️ **Next:** Add status tracking to content script

---

## Quick Reference: Useful Commands

```javascript
// View all storage data
const all = await chrome.storage.local.get(null);
console.log(JSON.stringify(all, null, 2));

// Clear all data
await chrome.storage.local.clear();

// Get specific keys
const data = await chrome.storage.local.get(['jobs', 'settings', 'statistics']);
console.log(data);

// Check storage size
if (chrome.storage.local.getBytesInUse) {
  const bytes = await chrome.storage.local.getBytesInUse();
  console.log(`Storage: ${bytes} bytes`);
}

// Export data to JSON
const data = await chrome.storage.local.get(null);
const json = JSON.stringify(data, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'extension-data-backup.json';
a.click();
```

---

## Success Criteria

✅ **Storage System:**
- Can save jobs with full metadata
- Can update job status
- Can add/delete notes
- Statistics calculate correctly
- Data persists across sessions

✅ **Migration:**
- V1 data migrates to V2 successfully
- All timestamps preserved
- No data loss
- Backup created successfully
- Rollback works if needed

✅ **Performance:**
- Operations complete in < 50ms
- Handles 100+ jobs without issues
- Storage size reasonable

---

**Questions?** Check the console logs - we've added detailed logging for debugging!
