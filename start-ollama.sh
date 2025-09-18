#!/bin/bash

# Start Ollama with CORS headers enabled for Chrome extension
echo "🚀 Starting Ollama with CORS headers for Chrome extension..."

# Kill any existing Ollama processes
pkill ollama 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

# Start Ollama with CORS origins enabled
OLLAMA_ORIGINS="*" ollama serve

echo "✅ Ollama started with CORS support"
