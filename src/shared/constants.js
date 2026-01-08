// Application Constants

// Storage Keys
export const STORAGE_KEYS = {
  JOBS: 'jobs',
  SETTINGS: 'settings',
  STATISTICS: 'statistics',
  SCHEMA_VERSION: 'schemaVersion',
  // Legacy key for migration
  LEGACY_APPLIED_IDS: 'appliedJobIds'
};

// Current schema version
export const CURRENT_SCHEMA_VERSION = 2;

// Job Status Types
export const JOB_STATUS = {
  APPLIED: 'applied',
  INTERVIEWING: 'interviewing',
  OFFER: 'offer',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

// Default Theme Colors
export const DEFAULT_COLORS = {
  [JOB_STATUS.APPLIED]: '#772a2a',
  [JOB_STATUS.INTERVIEWING]: '#2a4577',
  [JOB_STATUS.OFFER]: '#2a7745',
  [JOB_STATUS.REJECTED]: '#666666',
  [JOB_STATUS.WITHDRAWN]: '#999999'
};

// Theme Types
export const THEMES = {
  DEFAULT: 'default',
  DARK: 'dark',
  PROFESSIONAL: 'professional',
  CUSTOM: 'custom'
};

// UI Constants
export const UI_CONSTANTS = {
  MAX_NOTE_LENGTH: 1000,
  JOBS_PER_PAGE: 50,
  CHART_WEEKS_BACK: 12,
  BADGE_TEXT_MAX_LENGTH: 4
};

// Default Settings
export const DEFAULT_SETTINGS = {
  theme: THEMES.DEFAULT,
  customColors: { ...DEFAULT_COLORS },
  notifications: {
    enabled: false,
    reminderDays: 7
  },
  ui: {
    showBadges: true,
    showStatusColors: true,
    compactMode: false
  }
};

// LinkedIn Selectors (for job detection)
export const LINKEDIN_SELECTORS = {
  JOB_CARD_CONTAINERS: [
    'li',
    'div.jobs-search-results__list-item',
    'div.job-card-container',
    'div.jobs-search__results-list li'
  ],
  JOB_LINKS: 'a[href*="/jobs/view/"]',
  APPLIED_TEXT_PATTERNS: /\b(applied|you applied|application submitted|applied on)\b/i,
  JOB_DETAIL_CONTAINER: '[data-test-id="job-details"]',
  JOB_BUTTONS_CONTAINER: '[data-test-id="top-card-buttons-container"]'
};

// Date format helpers
export const DATE_FORMAT = {
  ISO_WEEK: 'YYYY-[W]WW',
  DISPLAY_SHORT: 'MMM D, YYYY',
  DISPLAY_LONG: 'MMMM D, YYYY [at] h:mm A'
};
