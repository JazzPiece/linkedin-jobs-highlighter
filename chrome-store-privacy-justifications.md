# Chrome Web Store - Privacy Practices Justifications

## Single Purpose Description
**LinkedIn Job Filter & Highlighter** helps job seekers track their LinkedIn job applications by automatically highlighting jobs they've already applied to, preventing duplicate applications. The extension provides visual indicators on job listings and a dashboard to manage application history.

---

## Permission Justifications

### 1. Host Permission: `*://www.linkedin.com/*`
**Justification:**
This permission is required to:
- Detect and highlight job postings on LinkedIn that the user has already applied to
- Inject visual indicators (red highlights, badges) on job cards in search results
- Add "Mark as Applied" buttons on job detail pages
- Parse job information (title, company, location) from LinkedIn's DOM to save application data

The extension ONLY accesses LinkedIn.com pages and does not access any other websites. All data processing happens locally in the user's browser.

---

### 2. Storage Permission
**Justification:**
This permission is required to:
- Persistently store job application data locally on the user's device (job IDs, titles, companies, dates applied)
- Save user settings and preferences (highlight colors, filter options, company blacklist)
- Track installation date for statistics display
- Store user's company blacklist for smart filtering

**Important:** All data is stored locally using Chrome's secure storage API. No data is ever transmitted to external servers. The extension is 100% privacy-focused with offline functionality.

---

### 3. Tabs Permission
**Justification:**
This permission is required to:
- Open LinkedIn's "My Jobs" page when user clicks "View All on LinkedIn" button in popup
- Automatically refresh LinkedIn tabs when user changes settings in the extension popup (improves user experience by applying settings immediately)
- Detect which browser tabs are LinkedIn pages to send settings update messages

The extension does NOT track browsing history, read tab content from non-LinkedIn sites, or monitor user activity across tabs.

---

### 4. Remote Code Justification
**Justification:**
This extension does NOT use remote code. All JavaScript, CSS, and HTML files are bundled within the extension package. There are:
- No external script loads
- No eval() or Function() constructor usage
- No dynamically fetched code execution
- No third-party analytics or tracking scripts

All code is static, reviewed, and included in the extension package submitted to Chrome Web Store.

---

## Data Usage Compliance

### User Data Handling
**What data is collected:**
- Job application data (job titles, company names, locations, dates applied, job URLs)
- User settings (highlight colors, filter preferences, company blacklist)
- Extension install date (for "since" statistics display)

**Where data is stored:**
- 100% locally on user's device using Chrome's storage API
- ZERO data transmission to external servers
- ZERO tracking or analytics collection
- ZERO personal information collection (no emails, names, passwords, LinkedIn credentials)

**Data retention:**
- Data persists until user manually exports/clears it or uninstalls extension
- User can export data anytime (JSON/CSV format)
- User can clear all data via browser's extension storage management

**Data security:**
- All data stored using Chrome's secure storage API with built-in encryption
- No data leaves the user's computer
- No network requests to external servers (except LinkedIn.com for normal browsing)

### Privacy Policy Compliance
- Extension does NOT collect personal information
- Extension does NOT track user behavior
- Extension does NOT share data with third parties
- Extension does NOT use cookies or tracking pixels
- Extension does NOT access LinkedIn credentials or account information

---

## Chrome Web Store Developer Program Policies Compliance

✅ **Single Purpose:** Track LinkedIn job applications and prevent duplicates
✅ **User Data:** Stored locally only, never transmitted
✅ **Permissions:** Minimal permissions, clearly justified above
✅ **Functionality:** Works exactly as described, no hidden features
✅ **Privacy:** 100% private, no data collection or tracking
✅ **Transparency:** Open about what data is stored and why
✅ **User Control:** Users can export/delete data anytime

---

## Contact Information

**Developer Email:** [YOUR EMAIL HERE - REQUIRED]

**Support URL:** https://github.com/JazzPiece/linkedin-job-filter-highlighter/issues

**Homepage:** https://github.com/JazzPiece/linkedin-job-filter-highlighter

---

## Privacy Policy URL

**Privacy Policy:** [HOST THIS ON GITHUB PAGES OR YOUR WEBSITE]

### Privacy Policy Content (Minimal, Required by Chrome Web Store):

```
Privacy Policy for LinkedIn Job Filter & Highlighter

Last Updated: January 15, 2026

DATA COLLECTION
We do not collect, store, or transmit any user data to external servers.

DATA STORAGE
All job application data is stored locally on your device using Chrome's
secure storage API. This includes:
- Job titles, company names, locations, dates applied
- Your settings and preferences
- Company blacklist

DATA USAGE
Your data is used solely to:
- Highlight jobs you've applied to on LinkedIn
- Display application statistics in the extension popup
- Filter/hide jobs based on your preferences

DATA SHARING
We do not share, sell, or transmit your data to any third parties. Ever.

PERMISSIONS
- linkedin.com access: To detect and highlight applied jobs
- Storage: To save your application data locally
- Tabs: To open LinkedIn pages and refresh tabs when settings change

SECURITY
All data is stored using Chrome's encrypted storage API and never leaves
your computer.

CONTACT
For questions or concerns: [YOUR EMAIL]
Support: https://github.com/JazzPiece/linkedin-job-filter-highlighter/issues

CHANGES
We may update this policy. Check this page for updates.
```

---

## Summary for Chrome Web Store Review Team

**LinkedIn Job Filter & Highlighter** is a privacy-focused productivity tool that:

1. **Helps job seekers** avoid duplicate applications by visually highlighting jobs they've already applied to
2. **Stores data locally only** - no servers, no tracking, no data transmission
3. **Requests minimal permissions** - only LinkedIn.com access, local storage, and tabs for user-initiated actions
4. **Provides full user control** - export data anytime, clear data anytime
5. **Transparent operation** - open source, clear documentation, honest about functionality

The extension enhances LinkedIn's native job search experience without compromising user privacy or security.
