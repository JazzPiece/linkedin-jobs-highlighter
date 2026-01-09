import { storageManager } from './src/shared/storage.js';
import { migrationManager, runMigrationIfNeeded } from './src/utils/migration.js';
import { JOB_STATUS } from './src/shared/constants.js';

// Make functions globally available
window.storageManager = storageManager;
window.migrationManager = migrationManager;
window.runMigrationIfNeeded = runMigrationIfNeeded;
window.JOB_STATUS = JOB_STATUS;

function log(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  const className = isError ? 'error' : 'success';
  const timestamp = new Date().toLocaleTimeString();
  element.innerHTML = `[${timestamp}] <span class="${className}">${message}</span>\n` + element.innerHTML;
}

// Migration Functions
window.createV1Data = async function() {
  try {
    const v1Data = {
      '1234567890': 1704067200000, // 2024-01-01
      '9876543210': 1704153600000, // 2024-01-02
      '1111111111': 1704240000000, // 2024-01-03
      '2222222222': 1704326400000, // 2024-01-04
      '3333333333': 1704412800000  // 2024-01-05
    };

    await chrome.storage.local.set({ 'appliedJobIds': v1Data });
    log('migration-output', '✅ Created V1 sample data with 5 jobs');
    console.log('V1 Data created:', v1Data);
  } catch (error) {
    log('migration-output', `❌ Error: ${error.message}`, true);
  }
};

window.runMigration = async function() {
  try {
    log('migration-output', '⏳ Running migration...');
    const result = await runMigrationIfNeeded();
    log('migration-output', `✅ Migration result: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    log('migration-output', `❌ Error: ${error.message}`, true);
  }
};

window.getMigrationStatus = async function() {
  try {
    const status = await migrationManager.getMigrationStatus();
    log('migration-output', `📊 Migration Status:\n${JSON.stringify(status, null, 2)}`);
  } catch (error) {
    log('migration-output', `❌ Error: ${error.message}`, true);
  }
};

window.rollbackMigration = async function() {
  try {
    await migrationManager.rollback();
    log('migration-output', '✅ Rollback completed');
  } catch (error) {
    log('migration-output', `❌ Error: ${error.message}`, true);
  }
};

// Storage Functions
window.addJob = async function() {
  try {
    const jobId = document.getElementById('jobId').value;
    const title = document.getElementById('jobTitle').value;
    const company = document.getElementById('jobCompany').value;

    if (!jobId) {
      log('storage-output', '❌ Job ID is required', true);
      return;
    }

    await storageManager.saveJob({
      id: jobId,
      title: title || 'Software Engineer',
      company: company || 'Tech Company',
      dateApplied: Date.now()
    });

    log('storage-output', `✅ Added job: ${jobId} - ${title} at ${company}`);

    // Clear inputs
    document.getElementById('jobId').value = '';
    document.getElementById('jobTitle').value = '';
    document.getElementById('jobCompany').value = '';
  } catch (error) {
    log('storage-output', `❌ Error: ${error.message}`, true);
  }
};

window.getAllJobs = async function() {
  try {
    const jobs = await storageManager.getAllJobs();
    const count = Object.keys(jobs).length;
    log('storage-output', `📋 Found ${count} jobs:\n${JSON.stringify(jobs, null, 2)}`);
  } catch (error) {
    log('storage-output', `❌ Error: ${error.message}`, true);
  }
};

window.getStatistics = async function() {
  try {
    const stats = await storageManager.getStatistics();
    log('storage-output', `📊 Statistics:\n${JSON.stringify(stats, null, 2)}`);
  } catch (error) {
    log('storage-output', `❌ Error: ${error.message}`, true);
  }
};

window.getSettings = async function() {
  try {
    const settings = await storageManager.getSettings();
    log('storage-output', `⚙️ Settings:\n${JSON.stringify(settings, null, 2)}`);
  } catch (error) {
    log('storage-output', `❌ Error: ${error.message}`, true);
  }
};

// Job Operations
window.updateStatus = async function() {
  try {
    const jobId = document.getElementById('updateJobId').value;
    const newStatus = document.getElementById('newStatus').value;

    if (!jobId) {
      log('job-ops-output', '❌ Job ID is required', true);
      return;
    }

    await storageManager.updateStatus(jobId, newStatus);
    log('job-ops-output', `✅ Updated job ${jobId} status to: ${newStatus}`);
  } catch (error) {
    log('job-ops-output', `❌ Error: ${error.message}`, true);
  }
};

window.addNote = async function() {
  try {
    const jobId = document.getElementById('noteJobId').value;
    const noteText = document.getElementById('noteText').value;

    if (!jobId || !noteText) {
      log('job-ops-output', '❌ Job ID and note text are required', true);
      return;
    }

    await storageManager.addNote(jobId, noteText);
    log('job-ops-output', `✅ Added note to job ${jobId}: "${noteText}"`);

    document.getElementById('noteText').value = '';
  } catch (error) {
    log('job-ops-output', `❌ Error: ${error.message}`, true);
  }
};

// Utilities
window.viewAllData = async function() {
  try {
    const allData = await chrome.storage.local.get(null);
    log('utils-output', `🗂️ All Storage Data:\n${JSON.stringify(allData, null, 2)}`);
  } catch (error) {
    log('utils-output', `❌ Error: ${error.message}`, true);
  }
};

window.getStorageSize = async function() {
  try {
    const size = await storageManager.getStorageSize();
    const sizeKB = (size / 1024).toFixed(2);
    log('utils-output', `📦 Storage Size: ${size} bytes (${sizeKB} KB)`);
  } catch (error) {
    log('utils-output', `❌ Error: ${error.message}`, true);
  }
};

window.exportData = async function() {
  try {
    const jobs = await storageManager.getAllJobs();
    const settings = await storageManager.getSettings();
    const stats = await storageManager.getStatistics();

    const exportData = {
      version: 2,
      exportDate: new Date().toISOString(),
      jobs,
      settings,
      statistics: stats
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-jobs-backup-${Date.now()}.json`;
    a.click();

    log('utils-output', '✅ Data exported successfully');
  } catch (error) {
    log('utils-output', `❌ Error: ${error.message}`, true);
  }
};

window.clearAll = async function() {
  if (confirm('⚠️ Are you sure you want to clear ALL data? This cannot be undone!')) {
    try {
      await storageManager.clearAll();
      log('utils-output', '✅ All data cleared');
    } catch (error) {
      log('utils-output', `❌ Error: ${error.message}`, true);
    }
  }
};

// Attach event listeners to buttons
function attachEventListeners() {
  // Migration buttons
  document.getElementById('btn-create-v1')?.addEventListener('click', createV1Data);
  document.getElementById('btn-run-migration')?.addEventListener('click', runMigration);
  document.getElementById('btn-migration-status')?.addEventListener('click', getMigrationStatus);
  document.getElementById('btn-rollback')?.addEventListener('click', rollbackMigration);

  // Storage operation buttons
  document.getElementById('btn-add-job')?.addEventListener('click', addJob);
  document.getElementById('btn-get-jobs')?.addEventListener('click', getAllJobs);
  document.getElementById('btn-get-stats')?.addEventListener('click', getStatistics);
  document.getElementById('btn-get-settings')?.addEventListener('click', getSettings);

  // Job operation buttons
  document.getElementById('btn-update-status')?.addEventListener('click', updateStatus);
  document.getElementById('btn-add-note')?.addEventListener('click', addNote);

  // Utility buttons
  document.getElementById('btn-view-all')?.addEventListener('click', viewAllData);
  document.getElementById('btn-storage-size')?.addEventListener('click', getStorageSize);
  document.getElementById('btn-export')?.addEventListener('click', exportData);
  document.getElementById('btn-clear-all')?.addEventListener('click', clearAll);
}

// Initialize on load
window.addEventListener('load', async () => {
  console.log('Test page loaded');
  console.log('✅ StorageManager available:', typeof storageManager);
  console.log('✅ MigrationManager available:', typeof migrationManager);

  // Attach all event listeners
  attachEventListeners();

  log('migration-output', '✅ Test page ready. Try creating V1 data and running migration!');
});
