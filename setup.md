# Quick Setup Guide

## Prerequisites
1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Install Node.js**: Download from [nodejs.org](https://nodejs.org)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Icons
```bash
npm run icons
```

### 3. Build Extension
```bash
npm run build
```

### 4. Pull Ollama Models
```bash
ollama pull llama3.2:3b
ollama pull qwen2.5:7b
```

### 5. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

## Development

### Auto-build on file changes:
```bash
npm run dev
```

### Manual build:
```bash
npm run build
```

## Usage
1. Select text (3+ characters) in any input field or textarea on any webpage
2. Look for the small ✨ ping icon that appears next to the input
3. Click the ping icon to get AI-powered suggestions
4. Click "Accept" to replace only the selected text with the improved version

## Features
- **Text Selection**: Only processes selected text, not entire input
- **Smart Models**: Uses fast model for short text, quality model for longer text
- **Grammarly-style UI**: Professional suggestion panel with highlighted changes
- **Chrome Storage**: Settings are saved and synced across devices
- **Modular Architecture**: Clean, maintainable code structure

## Troubleshooting

### Ollama Not Found
- Ensure Ollama is running: `ollama serve`
- Check models are available: `ollama list`
- Verify Ollama is accessible at `http://localhost:11434`

### Extension Issues
- Check browser console for errors
- Ensure extension has proper permissions
- Try refreshing the extension in `chrome://extensions/`
