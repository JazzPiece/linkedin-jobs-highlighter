import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, JOB_STATUS } from './constants.js';

/**
 * StorageManager - Handles all storage operations for the extension
 * Provides a clean API for CRUD operations on jobs, settings, and statistics
 */
export class StorageManager {
  constructor() {
    this.storageAPI = chrome.storage.local;
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize storage with default values if needed
   */
  async initialize() {
    const data = await this.storageAPI.get([
      STORAGE_KEYS.SCHEMA_VERSION,
      STORAGE_KEYS.SETTINGS
    ]);

    // Set schema version if not present
    if (!data[STORAGE_KEYS.SCHEMA_VERSION]) {
      await this.storageAPI.set({
        [STORAGE_KEYS.SCHEMA_VERSION]: CURRENT_SCHEMA_VERSION
      });
    }

    // Set default settings if not present
    if (!data[STORAGE_KEYS.SETTINGS]) {
      await this.storageAPI.set({
        [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
      });
    }
  }

  // ==================== JOBS CRUD ====================

  /**
   * Get all jobs
   * @returns {Promise<Object>} Object with jobId as keys
   */
  async getAllJobs() {
    const result = await this.storageAPI.get(STORAGE_KEYS.JOBS);
    return result[STORAGE_KEYS.JOBS] || {};
  }

  /**
   * Get a single job by ID
   * @param {string} jobId
   * @returns {Promise<Object|null>}
   */
  async getJob(jobId) {
    const jobs = await this.getAllJobs();
    return jobs[jobId] || null;
  }

  /**
   * Save or update a job
   * @param {Object} jobData - Job object with id, title, company, etc.
   * @returns {Promise<void>}
   */
  async saveJob(jobData) {
    const jobs = await this.getAllJobs();

    const now = Date.now();
    const existingJob = jobs[jobData.id];

    // Create new job object
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

    // Update statistics
    await this.updateStatistics();
  }

  /**
   * Delete a job
   * @param {string} jobId
   * @returns {Promise<void>}
   */
  async deleteJob(jobId) {
    const jobs = await this.getAllJobs();
    delete jobs[jobId];
    await this.storageAPI.set({ [STORAGE_KEYS.JOBS]: jobs });
    await this.updateStatistics();
  }

  /**
   * Update job status
   * @param {string} jobId
   * @param {string} newStatus
   * @returns {Promise<void>}
   */
  async updateStatus(jobId, newStatus) {
    const jobs = await this.getAllJobs();
    const job = jobs[jobId];

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const now = Date.now();
    job.status = newStatus;

    // Add to status history
    job.statusHistory = job.statusHistory || [];
    job.statusHistory.push({ status: newStatus, timestamp: now });

    jobs[jobId] = job;
    await this.storageAPI.set({ [STORAGE_KEYS.JOBS]: jobs });
    await this.updateStatistics();
  }

  /**
   * Add a note to a job
   * @param {string} jobId
   * @param {string} noteText
   * @returns {Promise<void>}
   */
  async addNote(jobId, noteText) {
    const jobs = await this.getAllJobs();
    const job = jobs[jobId];

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: noteText,
      timestamp: Date.now()
    };

    job.notes = job.notes || [];
    job.notes.push(note);

    jobs[jobId] = job;
    await this.storageAPI.set({ [STORAGE_KEYS.JOBS]: jobs });
  }

  /**
   * Delete a note from a job
   * @param {string} jobId
   * @param {string} noteId
   * @returns {Promise<void>}
   */
  async deleteNote(jobId, noteId) {
    const jobs = await this.getAllJobs();
    const job = jobs[jobId];

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.notes = (job.notes || []).filter(note => note.id !== noteId);

    jobs[jobId] = job;
    await this.storageAPI.set({ [STORAGE_KEYS.JOBS]: jobs });
  }

  // ==================== SETTINGS ====================

  /**
   * Get all settings
   * @returns {Promise<Object>}
   */
  async getSettings() {
    const result = await this.storageAPI.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  /**
   * Update settings (partial update)
   * @param {Object} settingsUpdate
   * @returns {Promise<void>}
   */
  async updateSettings(settingsUpdate) {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...settingsUpdate };
    await this.storageAPI.set({ [STORAGE_KEYS.SETTINGS]: newSettings });
  }

  // ==================== STATISTICS ====================

  /**
   * Calculate and store statistics
   * @returns {Promise<void>}
   */
  async updateStatistics() {
    const jobs = await this.getAllJobs();
    const jobsArray = Object.values(jobs);

    // Calculate total applications
    const totalApplications = jobsArray.length;

    // Calculate status breakdown
    const statusBreakdown = {};
    Object.values(JOB_STATUS).forEach(status => {
      statusBreakdown[status] = 0;
    });
    jobsArray.forEach(job => {
      if (statusBreakdown.hasOwnProperty(job.status)) {
        statusBreakdown[job.status]++;
      }
    });

    // Calculate weekly trends (last 12 weeks)
    const weeklyTrends = this.calculateWeeklyTrends(jobsArray);

    const statistics = {
      totalApplications,
      statusBreakdown,
      weeklyTrends,
      lastUpdated: Date.now()
    };

    await this.storageAPI.set({ [STORAGE_KEYS.STATISTICS]: statistics });
  }

  /**
   * Get statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    const result = await this.storageAPI.get(STORAGE_KEYS.STATISTICS);
    return result[STORAGE_KEYS.STATISTICS] || {
      totalApplications: 0,
      statusBreakdown: {},
      weeklyTrends: {},
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate weekly trends from jobs
   * @param {Array} jobs
   * @returns {Object} { "2024-W01": count, ... }
   */
  calculateWeeklyTrends(jobs) {
    const trends = {};
    const now = new Date();
    const weeksBack = 12;

    // Initialize last 12 weeks
    for (let i = 0; i < weeksBack; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      const weekKey = this.getISOWeek(date);
      trends[weekKey] = 0;
    }

    // Count jobs per week
    jobs.forEach(job => {
      const jobDate = new Date(job.dateApplied);
      const weekKey = this.getISOWeek(jobDate);
      if (trends.hasOwnProperty(weekKey)) {
        trends[weekKey]++;
      }
    });

    return trends;
  }

  /**
   * Get ISO week string (e.g., "2024-W01")
   * @param {Date} date
   * @returns {string}
   */
  getISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Check if a job exists
   * @param {string} jobId
   * @returns {Promise<boolean>}
   */
  async jobExists(jobId) {
    const job = await this.getJob(jobId);
    return job !== null;
  }

  /**
   * Get jobs by status
   * @param {string} status
   * @returns {Promise<Array>}
   */
  async getJobsByStatus(status) {
    const jobs = await this.getAllJobs();
    return Object.values(jobs).filter(job => job.status === status);
  }

  /**
   * Search jobs by text
   * @param {string} searchText
   * @returns {Promise<Array>}
   */
  async searchJobs(searchText) {
    const jobs = await this.getAllJobs();
    const lowerSearch = searchText.toLowerCase();

    return Object.values(jobs).filter(job => {
      return job.title?.toLowerCase().includes(lowerSearch) ||
             job.company?.toLowerCase().includes(lowerSearch) ||
             job.metadata?.location?.toLowerCase().includes(lowerSearch);
    });
  }

  /**
   * Get storage size in bytes
   * @returns {Promise<number>}
   */
  async getStorageSize() {
    if (chrome.storage.local.getBytesInUse) {
      return await chrome.storage.local.getBytesInUse();
    }
    return 0;
  }

  /**
   * Clear all data (for testing/reset)
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.storageAPI.clear();
    await this.initialize();
  }
}

// Export singleton instance
export const storageManager = new StorageManager();
