# LinkedIn Jobs Applied Highlighter

> Never apply to the same job twice! A browser extension that visually highlights LinkedIn job postings you've already applied to.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Available-orange.svg)](https://addons.mozilla.org/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Coming%20Soon-blue.svg)](https://chrome.google.com/webstore)

## Overview

**LinkedIn Jobs Applied Highlighter** helps job seekers stay organized during their job search by automatically tracking and highlighting job postings they've already applied to. Say goodbye to duplicate applications and hello to a more efficient job search!

## Features

### Core Functionality
- **Automatic Detection**: Automatically detects when you've applied to a job based on LinkedIn's native "Applied" indicators
- **Visual Highlighting**: Applies a distinctive red highlight and "Applied" badge to job cards you've already applied to
- **Manual Marking**: Add a "Mark as Applied" button on job detail pages for jobs applied outside the platform
- **Persistent Storage**: Saves your application history locally in your browser
- **Real-time Updates**: Dynamically updates as you scroll through job listings
- **Cross-session Sync**: Your application history persists across browser sessions

### Technical Highlights
- **Lightweight**: Pure JavaScript with no external dependencies
- **Fast**: Minimal performance impact on LinkedIn's job search pages
- **Privacy-focused**: All data stored locally on your device
- **Smart Detection**: Uses multiple heuristics to identify job cards as LinkedIn updates their UI
- **Dynamic Support**: Handles infinite scrolling and dynamically loaded content

## Installation

### Firefox
1. Visit the [Firefox Add-ons Store](#)
2. Click "Add to Firefox"
3. Grant the necessary permissions
4. Start browsing LinkedIn jobs!

### Chrome (Coming Soon)
Chrome Web Store version is in development.

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/linkedin-highlighter.git
   cd linkedin-highlighter
   ```

2. **For Firefox:**
   - Open `about:debugging` in Firefox
   - Click "This Firefox" → "Load Temporary Add-on"
   - Select the `manifest.json` file

3. **For Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## How It Works

1. **Browse LinkedIn Jobs**: Visit any LinkedIn jobs search page
2. **Automatic Tracking**: The extension detects when LinkedIn shows you've already applied
3. **Visual Feedback**: Applied jobs are highlighted with a red background and border
4. **Manual Control**: Use the "Mark as Applied" button on job detail pages for external applications
5. **Stay Organized**: Never accidentally apply to the same position twice!

## Screenshots

### Job Listings with Highlighted Applied Jobs
*Red highlights show which positions you've already applied to*

### Manual Mark Button
*Mark jobs as applied directly from the job detail page*

## Technology Stack

- **JavaScript (ES6+)**: Core functionality
- **Chrome Storage API**: Persistent data storage
- **MutationObserver API**: Dynamic content detection
- **CSS3**: Visual styling
- **Manifest V3**: Modern extension architecture

## Project Structure

```
linkedin-highlighter/
├── manifest.json       # Extension configuration
├── content.js          # Main logic and functionality
├── styles.css          # Visual styling
├── README.md           # This file
└── .gitignore          # Git ignore rules
```

## Privacy & Permissions

This extension requires minimal permissions:

- **Storage**: To save your applied job IDs locally
- **Host Permissions**: Only access to `linkedin.com/jobs/*` pages

**We do not:**
- Collect any personal data
- Track your browsing history
- Send data to external servers
- Access your LinkedIn credentials

All data is stored locally on your device.

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/JazzPiece/linkedin-highlighter.git
cd linkedin-highlighter

# No build step required - pure JavaScript!
# Load as unpacked extension in your browser
```

### Testing
1. Make changes to the source files
2. Reload the extension in your browser
3. Visit LinkedIn jobs pages to test

## Roadmap

Future enhancements planned:

- [ ] Statistics dashboard (total applications, weekly trends)
- [ ] Application notes and status tracking
- [ ] Follow-up reminders
- [ ] Export data to CSV/Excel
- [ ] Customizable highlight colors and themes
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Chrome Web Store release

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

- GitHub: [@JazzPiece](https://github.com/JazzPiece)
- LinkedIn: [Jasur Iskandar](https://www.linkedin.com/in/jasuriskandar/)

## Acknowledgments

- Built to solve a real problem faced by job seekers worldwide
- Inspired by the need for better job search organization tools
- Thanks to the open-source community

## Support

If you find this extension helpful, please:
- ⭐ Star this repository
- 🐛 Report bugs via [GitHub Issues](https://github.com/yourusername/linkedin-highlighter/issues)
- 💡 Suggest features
- 📢 Share with other job seekers!

---

**Happy Job Hunting!** 🎯
