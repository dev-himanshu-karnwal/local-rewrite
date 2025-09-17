// Background script for Ollama communication and message handling

import { OllamaService } from '../shared/ollama-service';
import { StorageManager } from '../shared/storage';
import { ExtensionMessage, ExtensionResponse } from '../shared/types';

const ollamaService = new OllamaService();

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request: ExtensionMessage, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  switch (request.action) {
    case 'improveText':
      handleImproveText(request, sendResponse);
      break;
    case 'checkOllama':
      handleCheckOllama(sendResponse);
      break;
    case 'getModels':
      handleGetModels(sendResponse);
      break;
    case 'saveSettings':
      handleSaveSettings(request, sendResponse);
      break;
    case 'loadSettings':
      handleLoadSettings(sendResponse);
      break;
    default:
      console.warn('Unknown action:', request.action);
      sendResponse({ error: 'Unknown action' });
      return false;
  }
  
  return true; // Keep message channel open for async response
});

async function handleImproveText(request: ExtensionMessage, sendResponse: (response: ExtensionResponse) => void) {
  try {
    const result = await ollamaService.improveText(request.text!, request.isShort);
    console.log('Text improvement successful');
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Text improvement failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleCheckOllama(sendResponse: (response: ExtensionResponse) => void) {
  try {
    console.log('Checking Ollama status...');
    const status = await ollamaService.checkOllamaStatus();
    console.log('Ollama status:', status);
    sendResponse({ status });
  } catch (error) {
    console.error('Ollama check failed:', error);
    sendResponse({ status: false });
  }
}

async function handleGetModels(sendResponse: (response: ExtensionResponse) => void) {
  try {
    console.log('Getting available models...');
    const models = await ollamaService.getAvailableModels();
    console.log('Available models:', models);
    sendResponse({ models });
  } catch (error) {
    console.error('Failed to get models:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ models: [], error: errorMessage });
  }
}

async function handleSaveSettings(request: ExtensionMessage, sendResponse: (response: ExtensionResponse) => void) {
  try {
    console.log('Saving settings...');
    await StorageManager.saveUserSettings(request.settings!);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleLoadSettings(sendResponse: (response: ExtensionResponse) => void) {
  try {
    console.log('Loading settings...');
    const settings = await StorageManager.getUserSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Failed to load settings:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
  }
}
