// Background service worker
import { runMigrationIfNeeded } from './src/utils/migration.js';

// Run migration on extension install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed/updated:', details.reason);

  try {
    const result = await runMigrationIfNeeded();
    if (result.migrated) {
      console.log('[Background] Migration successful:', result);
    }
  } catch (error) {
    console.error('[Background] Migration failed:', error);
  }
});

// Listen for extension icon click - open test page
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('test-storage.html')
  });
});

console.log('[Background] Service worker loaded');
