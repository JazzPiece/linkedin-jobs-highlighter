import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION, JOB_STATUS } from '../shared/constants.js';
import { storageManager } from '../shared/storage.js';

/**
 * Migration Manager - Handles data migration from v1 to v2 schema
 */
export class MigrationManager {
  constructor() {
    this.storageAPI = chrome.storage.local;
  }

  /**
   * Check if migration is needed and perform it
   * @returns {Promise<Object>} Migration result with status and details
   */
  async checkAndMigrate() {
    try {
      const data = await this.storageAPI.get([
        STORAGE_KEYS.SCHEMA_VERSION,
        STORAGE_KEYS.LEGACY_APPLIED_IDS
      ]);

      const schemaVersion = data[STORAGE_KEYS.SCHEMA_VERSION];
      const legacyData = data[STORAGE_KEYS.LEGACY_APPLIED_IDS];

      // No migration needed if already on v2 or no legacy data
      if (schemaVersion === CURRENT_SCHEMA_VERSION) {
        return {
          success: true,
          migrated: false,
          message: 'Already on latest schema version'
        };
      }

      // Check if we have v1 data to migrate
      if (!legacyData || Object.keys(legacyData).length === 0) {
        // Fresh install, just initialize
        await storageManager.initialize();
        return {
          success: true,
          migrated: false,
          message: 'Fresh install, no migration needed'
        };
      }

      // Perform migration
      console.log('[Migration] Starting migration from v1 to v2...');
      const result = await this.migrateV1ToV2(legacyData);

      return result;
    } catch (error) {
      console.error('[Migration] Error during migration check:', error);
      return {
        success: false,
        migrated: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate from v1 schema to v2
   * V1: { "appliedJobIds": { "jobId": timestamp } }
   * V2: { "jobs": { "jobId": { full job object } } }
   * @param {Object} legacyData - V1 data object
   * @returns {Promise<Object>} Migration result
   */
  async migrateV1ToV2(legacyData) {
    try {
      // Step 1: Backup legacy data
      console.log('[Migration] Creating backup of v1 data...');
      await this.storageAPI.set({
        [`${STORAGE_KEYS.LEGACY_APPLIED_IDS}_backup`]: {
          data: legacyData,
          timestamp: Date.now()
        }
      });

      // Step 2: Transform data
      console.log('[Migration] Transforming data...');
      const migratedJobs = {};
      let successCount = 0;
      let errorCount = 0;

      for (const [jobId, timestamp] of Object.entries(legacyData)) {
        try {
          // Validate job ID
          if (!jobId || typeof jobId !== 'string' || !this.isValidJobId(jobId)) {
            console.warn(`[Migration] Skipping invalid job ID: ${jobId}`);
            errorCount++;
            continue;
          }

          // Validate timestamp
          const validTimestamp = this.isValidTimestamp(timestamp) ? timestamp : Date.now();

          // Create v2 job object
          migratedJobs[jobId] = {
            id: jobId,
            title: '', // Will be populated when user visits the job
            company: '',
            url: `https://www.linkedin.com/jobs/view/${jobId}`,
            dateApplied: validTimestamp,
            dateAdded: validTimestamp,
            status: JOB_STATUS.APPLIED,
            notes: [],
            statusHistory: [
              {
                status: JOB_STATUS.APPLIED,
                timestamp: validTimestamp
              }
            ],
            metadata: {
              location: '',
              salary: '',
              remote: false
            }
          };

          successCount++;
        } catch (error) {
          console.error(`[Migration] Error migrating job ${jobId}:`, error);
          errorCount++;
        }
      }

      // Step 3: Save migrated data
      console.log('[Migration] Saving migrated data...');
      await this.storageAPI.set({
        [STORAGE_KEYS.JOBS]: migratedJobs,
        [STORAGE_KEYS.SCHEMA_VERSION]: CURRENT_SCHEMA_VERSION
      });

      // Step 4: Initialize settings and statistics
      await storageManager.initialize();
      await storageManager.updateStatistics();

      // Step 5: Remove old data key (keep backup)
      await this.storageAPI.remove(STORAGE_KEYS.LEGACY_APPLIED_IDS);

      console.log(`[Migration] Migration complete! Migrated ${successCount} jobs, ${errorCount} errors`);

      return {
        success: true,
        migrated: true,
        message: `Successfully migrated ${successCount} jobs`,
        details: {
          totalJobs: Object.keys(legacyData).length,
          successCount,
          errorCount
        }
      };
    } catch (error) {
      console.error('[Migration] Fatal error during migration:', error);

      // Attempt rollback
      try {
        await this.rollback();
      } catch (rollbackError) {
        console.error('[Migration] Rollback failed:', rollbackError);
      }

      return {
        success: false,
        migrated: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback migration (restore from backup)
   * @returns {Promise<void>}
   */
  async rollback() {
    console.log('[Migration] Attempting rollback...');

    const backup = await this.storageAPI.get(`${STORAGE_KEYS.LEGACY_APPLIED_IDS}_backup`);
    const backupData = backup[`${STORAGE_KEYS.LEGACY_APPLIED_IDS}_backup`];

    if (!backupData) {
      throw new Error('No backup found for rollback');
    }

    // Restore legacy data
    await this.storageAPI.set({
      [STORAGE_KEYS.LEGACY_APPLIED_IDS]: backupData.data
    });

    // Remove v2 data
    await this.storageAPI.remove([
      STORAGE_KEYS.JOBS,
      STORAGE_KEYS.SCHEMA_VERSION,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.STATISTICS
    ]);

    console.log('[Migration] Rollback complete');
  }

  /**
   * Validate job ID format
   * @param {string} jobId
   * @returns {boolean}
   */
  isValidJobId(jobId) {
    // LinkedIn job IDs are numeric strings, typically 10 digits
    return /^\d{5,}$/.test(jobId);
  }

  /**
   * Validate timestamp
   * @param {number} timestamp
   * @returns {boolean}
   */
  isValidTimestamp(timestamp) {
    if (typeof timestamp !== 'number') return false;
    // Check if timestamp is reasonable (between 2020 and 2050)
    const date = new Date(timestamp);
    const year = date.getFullYear();
    return year >= 2020 && year <= 2050;
  }

  /**
   * Get migration status
   * @returns {Promise<Object>}
   */
  async getMigrationStatus() {
    const data = await this.storageAPI.get([
      STORAGE_KEYS.SCHEMA_VERSION,
      STORAGE_KEYS.LEGACY_APPLIED_IDS,
      `${STORAGE_KEYS.LEGACY_APPLIED_IDS}_backup`
    ]);

    const schemaVersion = data[STORAGE_KEYS.SCHEMA_VERSION];
    const hasLegacyData = !!data[STORAGE_KEYS.LEGACY_APPLIED_IDS];
    const hasBackup = !!data[`${STORAGE_KEYS.LEGACY_APPLIED_IDS}_backup`];

    return {
      currentVersion: schemaVersion || 1,
      targetVersion: CURRENT_SCHEMA_VERSION,
      needsMigration: !schemaVersion && hasLegacyData,
      hasLegacyData,
      hasBackup
    };
  }

  /**
   * Clean up backup data (after confirming migration success)
   * @returns {Promise<void>}
   */
  async cleanupBackup() {
    console.log('[Migration] Cleaning up backup data...');
    await this.storageAPI.remove(`${STORAGE_KEYS.LEGACY_APPLIED_IDS}_backup`);
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();

/**
 * Run migration on extension startup
 * This should be called from background script or content script init
 */
export async function runMigrationIfNeeded() {
  const result = await migrationManager.checkAndMigrate();

  if (result.success && result.migrated) {
    console.log('[Migration] Migration successful:', result.message);

    // Show notification to user (optional)
    if (chrome.notifications) {
      try {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
          title: 'LinkedIn Jobs Tracker Updated',
          message: `Successfully migrated ${result.details?.successCount || 0} job applications to the new version!`
        });
      } catch (e) {
        // Notifications permission might not be granted
        console.log('[Migration] Could not show notification:', e);
      }
    }
  } else if (!result.success) {
    console.error('[Migration] Migration failed:', result.error);
  }

  return result;
}
