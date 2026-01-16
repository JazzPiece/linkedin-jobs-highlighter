# Chrome Web Store Submission - Copy-Paste Guide

## 📋 Step-by-Step: What to Enter in Chrome Web Store Dashboard

---

## 1. Privacy Practices Tab

### Single Purpose Description
```
LinkedIn Job Filter & Highlighter helps job seekers track their LinkedIn job applications by automatically highlighting jobs they've already applied to, preventing duplicate applications. The extension provides visual indicators on job listings and a dashboard to manage application history.
```

---

### Host Permission Justification (`*://www.linkedin.com/*`)
```
This permission is required to detect and highlight job postings on LinkedIn that the user has already applied to, inject visual indicators (red highlights and badges) on job cards in search results, add "Mark as Applied" buttons on job detail pages, and parse job information from LinkedIn's DOM to save application data locally. The extension ONLY accesses LinkedIn.com pages and does not access any other websites. All data processing happens locally in the user's browser.
```

---

### Storage Permission Justification
```
This permission is required to persistently store job application data locally on the user's device (job IDs, titles, companies, dates applied), save user settings and preferences (highlight colors, filter options, company blacklist), and track the extension installation date for statistics display. All data is stored locally using Chrome's secure storage API. No data is ever transmitted to external servers. The extension is 100% privacy-focused with offline functionality.
```

---

### Tabs Permission Justification
```
This permission is required to open LinkedIn's "My Jobs" page when the user clicks "View All on LinkedIn" button in the extension popup, automatically refresh LinkedIn tabs when the user changes settings (improving user experience by applying settings immediately), and detect which browser tabs are LinkedIn pages to send settings update messages. The extension does NOT track browsing history, read tab content from non-LinkedIn sites, or monitor user activity across tabs.
```

---

### Remote Code Justification
```
This extension does NOT use remote code. All JavaScript, CSS, and HTML files are bundled within the extension package. There are no external script loads, no eval() or Function() constructor usage, no dynamically fetched code execution, and no third-party analytics or tracking scripts. All code is static, reviewed, and included in the extension package submitted to Chrome Web Store.
```

---

### Data Usage Certification
**Check the following boxes:**
- ✅ "I certify that my item's use of data complies with the Chrome Web Store User Data Policy"
- ✅ "I certify that my item does not use remote code"

---

## 2. Account Tab

### Contact Email
**Action Required:** Enter your email address and verify it

**Important:** You MUST verify your email before you can publish. Chrome will send you a verification email - click the link to verify.

---

## 3. Store Listing Tab

### Store Listing Content (Already Completed)
You should have already filled this out, but here's a quick reference:

**Title:**
```
LinkedIn Job Filter & Highlighter
```

**Summary (132 characters max):**
```
Filter and highlight LinkedIn jobs. Never apply twice! Hide jobs by company, location, salary. Track applications automatically.
```

**Category:** Productivity

**Language:** English (United States)

---

## 4. Privacy Policy URL

### Option A: Host on GitHub Pages (Recommended)
1. Add `privacy-policy.html` to your GitHub repository
2. Enable GitHub Pages in repository settings
3. Your privacy policy URL will be:
   ```
   https://jazzpiece.github.io/linkedin-job-filter-highlighter/privacy-policy.html
   ```

### Option B: Host on Your Own Website
Upload `privacy-policy.html` to your website and use that URL.

### Option C: Use GitHub Raw URL (Temporary)
```
https://raw.githubusercontent.com/JazzPiece/linkedin-job-filter-highlighter/main/privacy-policy.html
```

**⚠️ WARNING:** Before using GitHub Pages URL, make sure you've:
1. Pushed `privacy-policy.html` to your GitHub repo
2. Enabled GitHub Pages in repository Settings → Pages
3. Replaced `[YOUR EMAIL HERE]` in the privacy policy with your actual email

---

## 5. Pre-Submission Checklist

### ✅ Files to Check Before Submitting

**In privacy-policy.html:**
- [ ] Replace `[YOUR EMAIL HERE]` with your actual contact email

**In chrome-store-privacy-justifications.md:**
- [ ] Replace `[YOUR EMAIL HERE]` with your actual contact email

**In Chrome Web Store Dashboard:**
- [ ] Verify contact email (check your inbox for verification email)
- [ ] Upload all 5 resized screenshots from `assets/screenshots/resized/`
- [ ] Upload extension icons (16x16, 48x48, 128x128)
- [ ] Fill in all privacy justifications (copy from above)
- [ ] Enter privacy policy URL
- [ ] Check data usage certification boxes

---

## 6. Screenshots to Upload

**Location:** `assets/screenshots/resized/`

Upload these 5 screenshots in order:
1. `01-filterworking.png` - Shows filtering in action
2. `02-hidecollapse.png` - Shows hide/collapse feature
3. `03-hidesettings.png` - Shows settings panel
4. `04-highlightList.png` - Shows highlighted job list
5. `05-highlightsetting.png` - Shows highlight customization

All screenshots are now exactly 1280x800 pixels ✅

---

## 7. Extension Package to Upload

**Create a ZIP file containing:**
```
linkedin-job-filter-highlighter.zip
├── manifest.json
├── content-v2-bundled.js
├── background.js
├── popup.html
├── popup.js
├── styles.css
├── assets/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── src/
    ├── shared/
    │   ├── storage.js
    │   └── constants.js
    └── utils/
        └── migration.js
```

**⚠️ DO NOT INCLUDE:**
- `test-storage.html` (dev tool only)
- `test-launcher.html` (dev tool only)
- `resize-screenshots.ps1`
- `chrome-store-privacy-justifications.md`
- `CHROME-STORE-SUBMISSION-GUIDE.md`
- `.git/` folder
- `README.md` (optional - can include or exclude)
- Screenshot files (upload separately)

---

## 8. Expected Review Timeline

**Chrome Web Store Review Process:**
- Initial automated checks: 1-2 hours
- Manual review: 2-5 business days
- Total time: Usually 3-7 days

**After Submission:**
- You'll receive email notifications about review status
- Check Chrome Web Store Developer Dashboard for updates
- Be ready to respond to any review feedback

---

## 9. Post-Approval Steps

**After your extension is approved:**
1. Share the Chrome Web Store link on social media
2. Update your GitHub README with Chrome Web Store badge
3. Post on Reddit (r/jobs, r/jobseekers)
4. Consider Product Hunt launch
5. Monitor reviews and respond to user feedback

---

## 10. Quick Command to Create ZIP

Run this in PowerShell to create the extension ZIP:

```powershell
# Create extension package
$files = @(
  "manifest.json",
  "content-v2-bundled.js",
  "background.js",
  "popup.html",
  "popup.js",
  "styles.css",
  "assets",
  "src"
)

Compress-Archive -Path $files -DestinationPath "linkedin-job-filter-highlighter.zip" -Force

Write-Host "✅ Extension package created: linkedin-job-filter-highlighter.zip"
```

---

## ❗ CRITICAL - Before Submitting

### 1. Update Privacy Policy with Your Email
```bash
# Edit privacy-policy.html and replace:
[YOUR EMAIL HERE]
# with your actual email address
```

### 2. Host Privacy Policy
- Push `privacy-policy.html` to GitHub
- Enable GitHub Pages
- Test that the URL works: https://jazzpiece.github.io/linkedin-job-filter-highlighter/privacy-policy.html

### 3. Verify Email in Chrome Web Store
- Go to Account tab
- Enter your email
- Check inbox for verification email
- Click verification link

### 4. Create Extension ZIP
- Include only the files listed in section 7
- Do NOT include dev tools or documentation files
- Verify ZIP is under 10MB (should be around 500KB)

---

## 📧 Need Help?

If you encounter any issues during submission:
1. Check Chrome Web Store Developer Documentation
2. Review Chrome's Extension Developer Program Policies
3. Contact Chrome Web Store support through the dashboard
4. Or create a GitHub issue in your repository

---

## 🎉 You're Ready!

You now have everything needed to submit to Chrome Web Store:
- ✅ All privacy justifications written
- ✅ Screenshots resized to 1280x800
- ✅ Privacy policy created
- ✅ Extension files ready
- ✅ Copy-paste content for all required fields

**Next step:** Go to Chrome Web Store Developer Dashboard and start filling in the fields using the content above!

Good luck with your submission! 🚀
