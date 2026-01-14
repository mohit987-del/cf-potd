# Codeforces Problem of the Day - Chrome Extension

A Chrome extension that provides a daily problem from Codeforces with ratings between 1400-1900 from the last 50 contests.

## Features

- 🎯 Daily problem selection from recent Codeforces contests
- ⭐ Problems rated between 1400-1900
- 🔄 Option to get a new random problem
- 🏷️ Display problem tags and metadata
- 🎨 Clean and modern UI
- 💾 Caches problems for better performance

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `cf_potd` folder

## Usage

1. Click the extension icon in your Chrome toolbar
2. The extension will display today's problem
3. Click "Solve Problem" to open the problem on Codeforces
4. Click "🔄 New Problem" to get a different random problem

## How it works

- Fetches problems from Codeforces API
- Filters problems by rating (1400-1900) and recent contests (last 50)
- Selects one problem per day using date-based seeding
- Caches problems locally for better performance
- Shows problem details including tags, rating, and contest ID

## Technical Details

- **manifest.json**: Chrome extension configuration
- **popup.html**: Extension popup UI
- **popup.js**: Main logic and UI interactions
- **api.js**: Codeforces API integration
- **styles.css**: Styling for the extension

## API

Uses the official [Codeforces API](https://codeforces.com/apiHelp):
- `/problemset.problems` - Fetches all problems with their metadata

## Development

To modify the extension:
1. Edit the files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card to reload

## License

MIT
