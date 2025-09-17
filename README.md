# Local Text Improver - Chrome Extension

A Chrome extension that helps improve text using local Ollama AI models. Small ping icons appear next to input fields and textareas - click them to get professional rewrites powered by your local AI models.

## Overview

The Local Text Improver is a privacy-first Chrome extension that brings AI-powered text improvement directly to your browser. Unlike cloud-based solutions, all processing happens locally on your machine using Ollama AI models, ensuring complete privacy and data security.

## Key Features

- **🔒 Privacy-First**: All text processing happens locally - no data leaves your machine
- **✨ Smart Ping Icons**: Small icons appear next to input fields and textareas
- **🤖 AI-Powered**: Uses Ollama models for intelligent text improvement
- **⚡ Smart Model Selection**: 
  - Short text (≤20 words) → Fast model (llama3.2:3b)
  - Longer text → Quality model (qwen2.5:7b)
- **💼 Professional Quality**: Clear, concise, and professional text improvements
- **🎯 Selective Processing**: Only processes selected text, not entire inputs
- **🎨 Grammarly-Style UI**: Professional suggestion panel with highlighted changes
- **⚙️ Configurable**: Customize models, parameters, and UI preferences
- **🔄 Dynamic Detection**: Automatically detects new input fields as they appear
- **💾 Persistent Settings**: Settings saved and synced across devices

## How It Works

1. **Detection**: The extension monitors web pages for input fields and textareas
2. **Activation**: When you type or select text (3+ characters), a ping icon appears
3. **Processing**: Click the ping icon to send text to your local Ollama instance
4. **Smart Routing**: The system automatically chooses the appropriate model based on text length
5. **Presentation**: Suggestions appear in a professional overlay panel
6. **Application**: Choose to copy or replace the original text with improvements

## Quick Start

For detailed setup instructions, see [setup.md](setup.md).

**Prerequisites:**
- Ollama installed and running
- Required models: `llama3.2:3b` and `qwen2.5:7b`
- Node.js for development

**Basic Setup:**
```bash
npm install
npm run build
# Load the dist folder in Chrome extensions
```

## Development

### Development Commands

```bash
# Auto-build development server
npm run dev

# Manual build
npm run build

# Build and watch for changes
npm run build-watch
```

## Usage

1. **Navigate to any webpage** with input fields or textareas
2. **Type or select text** (minimum 3 characters)
3. **Look for the ping icon** (✨) that appears next to the input field
4. **Click the ping icon** to get AI-powered text suggestions
5. **Review the suggestion** in the overlay panel
6. **Apply changes** using "Copy" or "Replace" buttons

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

## Architecture

The extension follows a modular architecture with clear separation of concerns:

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

## Key Technologies

- **TypeScript**: Type-safe development
- **Chrome Extension APIs**: Manifest V3, Storage, Runtime
- **Ollama**: Local AI model inference
- **CSS3**: Modern styling and animations
- **Webpack**: Module bundling and development workflow

## Privacy & Security

- **🔒 100% Local**: All text processing happens on your machine
- **🚫 No Data Collection**: No text is sent to external servers
- **🛡️ Secure**: Only communicates with local Ollama instance
- **📖 Open Source**: Full source code available for review

## Support & Documentation

- **Setup Guide**: See [setup.md](setup.md) for detailed installation instructions
- **Troubleshooting**: Comprehensive troubleshooting guide in setup.md
- **Issues**: Report bugs and feature requests via GitHub issues

## Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Note**: This extension requires Ollama to be installed and running locally. For detailed setup instructions, please refer to [setup.md](setup.md).
