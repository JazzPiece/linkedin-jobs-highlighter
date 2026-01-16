# Chrome Web Store Submission Checklist

## ✅ Pre-Submission Tasks

### 1. Update Privacy Policy with Your Email
- [ ] Open `privacy-policy.html`
- [ ] Replace `[YOUR EMAIL HERE]` with your actual email address
- [ ] Save the file

### 2. Host Privacy Policy on GitHub Pages
- [ ] Push `privacy-policy.html` to your GitHub repository
- [ ] Go to GitHub repository Settings → Pages
- [ ] Enable GitHub Pages (select main branch, root folder)
- [ ] Wait 2-3 minutes for deployment
- [ ] Test URL: `https://jazzpiece.github.io/linkedin-job-filter-highlighter/privacy-policy.html`
- [ ] Verify privacy policy displays correctly

### 3. Create Extension ZIP Package
- [ ] Run PowerShell script: `.\create-extension-zip.ps1`
- [ ] Verify `linkedin-job-filter-highlighter.zip` was created
- [ ] Check file size (should be under 10MB)
- [ ] Keep this ZIP file ready for upload

### 4. Verify Email in Chrome Web Store
- [ ] Go to Chrome Web Store Developer Dashboard
- [ ] Click Account tab
- [ ] Enter your contact email
- [ ] Click "Send verification email"
- [ ] Check your inbox for verification email
- [ ] Click verification link in email
- [ ] Confirm email is verified in dashboard

---

## 📝 Chrome Web Store Form Fields

### Privacy Practices Tab

#### Single Purpose Description
- [ ] Copy from `CHROME-STORE-SUBMISSION-GUIDE.md` → Section 1
- [ ] Paste into "Single Purpose" field
- [ ] Character limit: 900 characters ✓

#### Host Permission Justification
- [ ] Copy "Host Permission Justification" from guide
- [ ] Paste into `*://www.linkedin.com/*` justification field

#### Storage Permission Justification
- [ ] Copy "Storage Permission Justification" from guide
- [ ] Paste into storage permission justification field

#### Tabs Permission Justification
- [ ] Copy "Tabs Permission Justification" from guide
- [ ] Paste into tabs permission justification field

#### Remote Code Justification
- [ ] Copy "Remote Code Justification" from guide
- [ ] Paste into remote code field
- [ ] Or select "Does not use remote code" checkbox

#### Data Usage Certification
- [ ] Check: "I certify that my item's use of data complies with the Chrome Web Store User Data Policy"
- [ ] Check: "I certify that my item does not use remote code"

#### Privacy Policy URL
- [ ] Enter: `https://jazzpiece.github.io/linkedin-job-filter-highlighter/privacy-policy.html`
- [ ] Click "Test URL" to verify it works

---

## 📦 Package Upload

### Upload Extension ZIP
- [ ] Go to "Package" or "Upload" tab
- [ ] Click "Upload new package"
- [ ] Select `linkedin-job-filter-highlighter.zip`
- [ ] Wait for upload to complete
- [ ] Verify no errors appear

---

## 🖼️ Store Listing (Verify/Update)

### Basic Information
- [ ] Title: `LinkedIn Job Filter & Highlighter`
- [ ] Summary: (132 chars) Already filled ✓
- [ ] Description: Already filled ✓
- [ ] Category: `Productivity`
- [ ] Language: `English (United States)`

### Icons (Verify Uploaded)
- [ ] 128x128 icon uploaded ✓
- [ ] 48x48 icon uploaded ✓
- [ ] 16x16 icon uploaded ✓

### Screenshots
- [ ] Upload all 5 screenshots from `assets/screenshots/resized/`:
  - [ ] `01-filterworking.png`
  - [ ] `02-hidecollapse.png`
  - [ ] `03-hidesettings.png`
  - [ ] `04-highlightList.png`
  - [ ] `05-highlightsetting.png`
- [ ] Add captions (optional but recommended):
  - Screenshot 1: "Smart filtering - hide jobs by work type, salary, and more"
  - Screenshot 2: "Collapsed view for hidden jobs"
  - Screenshot 3: "Customizable settings panel"
  - Screenshot 4: "Highlighted job list with visual indicators"
  - Screenshot 5: "Custom highlight colors for different job states"

### URLs
- [ ] Homepage URL: `https://github.com/JazzPiece/linkedin-job-filter-highlighter`
- [ ] Support URL: `https://github.com/JazzPiece/linkedin-job-filter-highlighter/issues`

---

## 🎯 Final Review

### Before Submitting
- [ ] Review all form fields for typos
- [ ] Test privacy policy URL one more time
- [ ] Verify email is confirmed (Account tab shows green checkmark)
- [ ] Read through extension description for accuracy
- [ ] Check all 5 screenshots are uploaded and display correctly
- [ ] Verify ZIP package uploaded successfully

### Double-Check Required Fields
- [ ] ✓ Single purpose description filled
- [ ] ✓ All permission justifications filled
- [ ] ✓ Privacy policy URL entered and working
- [ ] ✓ Data usage certification boxes checked
- [ ] ✓ Contact email verified
- [ ] ✓ Extension package uploaded
- [ ] ✓ All screenshots uploaded

---

## 🚀 Submit for Review

### Submission
- [ ] Click "Submit for review" button
- [ ] Review submission summary
- [ ] Confirm submission

### After Submission
- [ ] Note submission date and time
- [ ] Save confirmation email from Chrome Web Store
- [ ] Monitor email for review updates
- [ ] Check developer dashboard daily for status

---

## 📊 Expected Timeline

**Review Process:**
- Automated checks: 1-2 hours
- Manual review: 2-5 business days
- **Total time:** 3-7 days typically

**Status Updates:**
- "Pending Review" - Waiting for manual review
- "In Review" - Being reviewed by Google team
- "Approved" - Live on Chrome Web Store! 🎉
- "Changes Requested" - Need to fix something and resubmit

---

## 🔧 If Changes Are Requested

If Google requests changes:
1. Read their feedback carefully
2. Make required changes to code/listing
3. Update ZIP package if code changes needed
4. Re-upload package
5. Update any requested listing information
6. Resubmit for review

Common reasons for rejection:
- Privacy policy issues
- Permission justifications unclear
- Misleading screenshots or description
- Code violates policies
- Functionality doesn't match description

---

## ✅ After Approval

### Immediate Actions
- [ ] Test extension from Chrome Web Store (install it fresh)
- [ ] Verify all features work correctly
- [ ] Take screenshot of live store listing

### Marketing & Promotion
- [ ] Update GitHub README with Chrome Web Store badge
- [ ] Share on LinkedIn (with #jobsearch #productivity tags)
- [ ] Post on Reddit:
  - [ ] r/jobs
  - [ ] r/jobseekers
  - [ ] r/cscareerquestions (if tech-focused)
- [ ] Consider Product Hunt launch
- [ ] Tweet about it (if applicable)

### Monitoring
- [ ] Set up Google Alert for extension name
- [ ] Monitor Chrome Web Store reviews weekly
- [ ] Respond to user reviews (especially negative ones)
- [ ] Track install count and ratings
- [ ] Collect user feedback for improvements

---

## 📞 Support

**If you encounter issues during submission:**

1. **Chrome Web Store Support:** Use "Contact Support" in developer dashboard
2. **Developer Documentation:** https://developer.chrome.com/docs/webstore/
3. **Policy Reference:** https://developer.chrome.com/docs/webstore/program-policies/
4. **Community Help:** Stack Overflow with tag [google-chrome-extension]

---

## 📁 Files Created for Submission

All necessary files are ready in your project:

✅ `CHROME-STORE-SUBMISSION-GUIDE.md` - Copy-paste content for all fields
✅ `chrome-store-privacy-justifications.md` - Detailed justifications
✅ `privacy-policy.html` - Privacy policy to host on GitHub Pages
✅ `create-extension-zip.ps1` - Script to create extension package
✅ `SUBMISSION-CHECKLIST.md` - This checklist
✅ `assets/screenshots/resized/` - All screenshots at 1280x800px

---

## 🎉 You're Ready to Submit!

Everything is prepared. Follow this checklist step by step and you'll have a smooth submission process.

**Good luck! 🚀**

---

**Last Updated:** January 15, 2026
