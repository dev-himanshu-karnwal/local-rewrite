# Local Text Improver - Chrome Extension

A Chrome extension that helps improve text using local Ollama AI models. Small ping icons appear next to input fields and textareas - click them to get professional rewrites powered by your local AI models.

## Features

- **Ping Icon Integration**: Small ✨ icons appear next to input fields and textareas
- **One-Click Improvement**: Click the ping icon to get AI-powered text suggestions
- **Local AI Processing**: Uses Ollama models running on your machine
- **Smart Model Selection**: 
  - Short text (≤20 words) → Fast model (llama3.2:3b)
  - Longer text → Quality model (qwen2.5:7b)
- **Professional Rewrites**: Clear, concise, and professional text improvements
- **Easy Actions**: Copy or replace text with one click
- **Privacy-First**: No data leaves your machine
- **Dynamic Detection**: Automatically detects new input fields as they appear

## Prerequisites

1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Pull Required Models**:
   ```bash
   ollama pull llama3.2:3b
   ollama pull qwen2.5:7b
   ```
3. **Start Ollama Service**: Make sure Ollama is running on localhost:11434

## Installation

1. **Clone or Download** this repository
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Build the Extension**:
   ```bash
   npm run build
   ```
4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Development

### Auto-Build Development Server
```bash
npm run dev
```
This watches for file changes and automatically rebuilds the extension.

### Manual Development
```bash
npm run build-watch
```
Builds the extension and watches for changes.

### Run Extension in Development
```bash
npm run dev-ext
```
Builds and runs the extension in a temporary Chrome profile.

## Usage

1. **Type Text**: Type in any input field or textarea on any webpage
2. **Look for Ping Icon**: A small ✨ icon will appear next to the input when you have 3+ characters
3. **Click Ping Icon**: Click the ping icon to get AI-powered suggestions
4. **Review Suggestion**: See the professional rewrite in the overlay panel
5. **Apply Changes**: Choose "Copy" to copy the text or "Replace" to replace the original

## Configuration

Click the extension icon to open the popup and configure:

- **Model Selection**: Choose different models for fast vs quality processing
- **Parameters**: Adjust temperature and top_p for each model
- **UI Settings**: Configure ping icon position, theme, and highlight preferences
- **Chrome Storage**: User preferences are saved and synced across devices
- **Connection Status**: Verify Ollama is running and accessible

## Project Structure

```
src/
├── manifest.json          # Extension manifest
├── shared/                # Shared modules and utilities
│   ├── types.ts          # TypeScript interfaces and types
│   ├── constants.ts      # Constants and configuration
│   ├── storage.ts        # Chrome storage utilities
│   ├── utils.ts          # Shared utility functions
│   └── ollama-service.ts # Ollama API service
├── background/            # Background script
│   └── background.ts     # Service worker for Ollama communication
├── content/              # Content script modules
│   ├── content.ts       # Main content script orchestrator
│   ├── content.css      # Styles for injected UI elements
│   ├── ping-icon.ts     # Ping icon management
│   └── improvement-panel.ts # Text improvement panel
├── popup/                # Extension popup
│   ├── popup.html       # Popup HTML
│   ├── popup.ts         # Popup script for settings
│   └── popup.css        # Popup styles
└── icons/                # Extension icons
    ├── icon.svg
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Architecture

The extension follows a modular architecture with clear separation of concerns:

### Shared Modules (`src/shared/`)
- **types.ts**: TypeScript interfaces and type definitions
- **constants.ts**: Configuration constants and default values
- **storage.ts**: Chrome storage API wrapper for user preferences
- **utils.ts**: Shared utility functions for text processing and DOM manipulation
- **ollama-service.ts**: Ollama API communication service

### Background Script (`src/background/`)
- Handles communication with Ollama API
- Manages message passing between content scripts and popup
- Processes text improvement requests

### Content Scripts (`src/content/`)
- **content.ts**: Main orchestrator that initializes other modules
- **ping-icon.ts**: Manages ping icon creation, positioning, and visibility
- **improvement-panel.ts**: Handles the Grammarly-style suggestion panel
- **content.css**: Styles for injected UI elements

### Popup (`src/popup/`)
- Settings interface for model configuration
- UI preferences management
- Ollama connection status monitoring

## Troubleshooting

### Popup Stuck on "Checking Ollama..."
This usually means Ollama isn't running or accessible. Try these steps:

1. **Test Ollama connectivity**:
   ```bash
   npm run test-ollama
   ```

2. **Start Ollama service**:
   ```bash
   ollama serve
   ```

3. **Check if Ollama is running**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

4. **Reload the extension** in `chrome://extensions/`

### Ollama Not Found
- Ensure Ollama is installed and running
- Check that Ollama is accessible at `http://localhost:11434`
- Verify the required models are pulled: `ollama list`

### Extension Not Working
- Check browser console for errors (F12 → Console)
- Check extension console: `chrome://extensions/` → Details → Inspect views: background page
- Ensure the extension has proper permissions
- Verify Ollama models are available: `ollama list`

### Build Issues
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript compilation errors
- Verify all files are in the correct locations

## Privacy & Security

- **100% Local**: All text processing happens on your machine
- **No Data Collection**: No text is sent to external servers
- **Secure**: Only communicates with local Ollama instance
- **Open Source**: Full source code available for review

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
