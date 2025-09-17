# Setup Guide - Local Text Improver Chrome Extension

Complete setup instructions for the Local Text Improver Chrome Extension that uses Ollama AI models for text improvement.

## Prerequisites

### 1. Install Ollama
- Download and install from [ollama.ai](https://ollama.ai)
- Follow the installation instructions for your operating system
- Verify installation: `ollama --version`

### 2. Install Node.js
- Download and install from [nodejs.org](https://nodejs.org)
- Recommended version: Node.js 18+ or latest LTS
- Verify installation: `node --version` and `npm --version`

### 3. Install Required Ollama Models
```bash
# Pull the fast model for short text (≤20 words)
ollama pull llama3.2:3b

# Pull the quality model for longer text
ollama pull qwen2.5:7b

# Verify models are installed
ollama list
```

### 4. Start Ollama Service
```bash
# Start Ollama service (if not already running)
ollama serve

# Verify Ollama is accessible
curl http://localhost:11434/api/tags
```

## Installation Steps

### 1. Clone/Download Project
```bash
# If using git
git clone <repository-url>
cd grammerly-extension

# Or download and extract the ZIP file
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Extension
```bash
npm run build
```

### 4. Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right corner)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. The extension should now appear in your extensions list

## Development Setup

### Auto-Build Development Server
```bash
npm run dev
```
This command:
- Watches TypeScript files for changes
- Automatically rebuilds the extension
- Runs the extension in a temporary Chrome profile

### Manual Development
```bash
# Build once
npm run build

# Build and watch for changes
npm run build-watch
```

### Testing Ollama Connection
```bash
# Test if Ollama is running and accessible
npm run test-ollama
```

## Usage Instructions

### Basic Usage
1. **Navigate to any webpage** with input fields or textareas
2. **Type or select text** (minimum 3 characters)
3. **Look for the ping icon** (✨) that appears next to the input field
4. **Click the ping icon** to get AI-powered text suggestions
5. **Review the suggestion** in the overlay panel
6. **Apply changes** using "Copy" or "Replace" buttons

### Advanced Features
- **Smart Model Selection**: Automatically chooses between fast (llama3.2:3b) and quality (qwen2.5:7b) models
- **Text Selection**: Only processes selected text, not entire input
- **Professional UI**: Grammarly-style suggestion panel with highlighted changes
- **Settings Management**: Configure models and parameters via extension popup

## Configuration

### Access Settings
1. Click the extension icon in Chrome toolbar
2. Configure the following options:

### Model Settings
- **Fast Model**: For short text (≤20 words) - default: llama3.2:3b
- **Quality Model**: For longer text - default: qwen2.5:7b
- **Temperature**: Controls randomness (0.0-1.0)
- **Top P**: Controls diversity (0.0-1.0)

### UI Settings
- **Ping Icon Position**: Left or right side of input
- **Theme**: Light or dark mode
- **Highlight Preferences**: Color and style options

### Storage
- Settings are automatically saved to Chrome storage
- Preferences sync across devices when signed into Chrome

## Troubleshooting

### Ollama Connection Issues

#### "Checking Ollama..." Stuck
1. **Verify Ollama is running**:
   ```bash
   ollama serve
   ```

2. **Test connectivity**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. **Check models are available**:
   ```bash
   ollama list
   ```

4. **Reload extension** in `chrome://extensions/`

#### Ollama Not Found
- Ensure Ollama is installed and running
- Check Ollama is accessible at `http://localhost:11434`
- Verify required models are pulled: `ollama list`
- Try restarting Ollama service: `ollama serve`

### Extension Issues

#### Extension Not Working
1. **Check browser console** (F12 → Console tab)
2. **Check extension console**: 
   - Go to `chrome://extensions/`
   - Click "Details" on the extension
   - Click "Inspect views: background page"
3. **Verify permissions**: Ensure extension has proper permissions
4. **Reload extension**: Click the reload button in `chrome://extensions/`

#### Build Issues
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript compilation errors
- Verify all files are in correct locations
- Try deleting `node_modules` and running `npm install` again

#### Ping Icons Not Appearing
- Ensure you have at least 3 characters in the input field
- Check if the webpage has restrictive content security policies
- Verify the content script is loaded (check browser console)
- Try refreshing the webpage

### Performance Issues
- **Slow responses**: Check if Ollama models are loaded and running
- **High CPU usage**: Consider using smaller models or adjusting parameters
- **Memory issues**: Restart Ollama service if needed

## Project Structure

```
src/
├── manifest.json          # Extension manifest and permissions
├── background/            # Background script for Ollama communication
│   └── background.ts     # Service worker
├── content/              # Content script modules
│   ├── content.ts       # Main orchestrator
│   ├── content.css      # UI element styles
│   ├── ping-icon.ts     # Ping icon management
│   └── improvement-panel.ts # Suggestion panel
├── popup/                # Extension popup interface
│   ├── popup.html       # Popup HTML
│   ├── popup.ts         # Settings management
│   └── popup.css        # Popup styles
└── icons/                # Extension icons
    ├── icon.svg
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Security & Privacy

- **100% Local Processing**: All text processing happens on your machine
- **No Data Collection**: No text is sent to external servers
- **Secure Communication**: Only communicates with local Ollama instance
- **Open Source**: Full source code available for review and modification

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for error messages
2. Verify Ollama is running and models are available
3. Ensure all prerequisites are properly installed
4. Try reloading the extension and refreshing the webpage
5. Review the troubleshooting section above

For additional help, refer to the main README.md file or check the project documentation.
