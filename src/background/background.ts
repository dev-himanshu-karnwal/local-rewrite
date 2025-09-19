/**
 * Background Script for Local Text Improver Extension
 * 
 * This script handles communication with the Ollama API and manages
 * message routing between content scripts and the popup interface.
 * 
 * Key responsibilities:
 * - Ollama API communication and status checking
 * - Text improvement processing using local AI models
 * - User settings management and persistence
 * - Model configuration and selection
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Response structure from Ollama API generate endpoint
 */
interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Request structure for Ollama API generate endpoint
 */
interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
  };
}

/**
 * Message structure for extension internal communication
 */
interface ExtensionMessage {
  action: 'improveText' | 'checkOllama' | 'getModels' | 'saveSettings' | 'loadSettings';
  text?: string;
  isShort?: boolean;
  settings?: UserSettings;
}

/**
 * Response structure for extension internal communication
 */
interface ExtensionResponse {
  result?: string;
  purpose?: string;
  error?: string;
  status?: boolean;
  models?: string[];
  settings?: UserSettings;
  isSuccess?: boolean;
}

/**
 * Configuration for AI model parameters
 */
interface ModelConfig {
  name: string;
  temperature: number;
  top_p: number;
}

/**
 * User preferences and settings
 */
interface UserSettings {
  fastModel: ModelConfig;
  qualityModel: ModelConfig;
  autoShowPing: boolean;
  pingIconPosition: 'right' | 'left';
  theme: 'light' | 'dark';
  highlightChanges: boolean;
}

// ============================================================================
// OLLAMA SERVICE CLASS
// ============================================================================

/**
 * Service class for communicating with the Ollama API
 * Handles all interactions with the local Ollama instance
 */
class OllamaService {
  private readonly baseUrl: string = 'http://localhost:11434';
  private readonly requestTimeout: number = 5000; // 5 seconds

  /**
   * Checks if Ollama service is running and accessible
   * @returns Promise<boolean> - true if Ollama is available, false otherwise
   */
  async checkOllamaStatus(): Promise<boolean> {
    try {
      console.log('Checking Ollama status at:', `${this.baseUrl}/api/tags`);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
      console.log('Ollama response status:', response.status);
      console.log('Ollama response headers:', {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods')
      });
      
      return response.ok;
    } catch (error) {
      console.error('Ollama not available:', error);
      return false;
    }
  }

  /**
   * Retrieves list of available models from Ollama
   * @returns Promise<string[]> - Array of model names
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  /**
   * Improves text using the appropriate Ollama model
   * @param text - The text to improve
   * @param isShort - Whether to use fast model for short text
   * @returns Promise<{result: string, purpose: string, isSuccess: boolean; error: string}> - Improved text and purpose
   */
  async improveText(text: string, isShort: boolean = false): Promise<{ result: string; purpose: string; isSuccess: boolean; error: string }> {
    const models = await this.getModelConfig();
    const selectedModel = isShort ? models.fast : models.quality;
    
    const prompt = this.createPrompt(text);
    
    const request: OllamaRequest = {
      model: selectedModel.name,
      prompt,
      stream: false,
      options: {
        temperature: selectedModel.temperature,
        top_p: selectedModel.top_p
      }
    };

    try {
      console.log('Sending request to Ollama:', request);
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request)
      });

      console.log('Ollama response status:', response.status);
      console.log('Ollama response headers:', {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods')
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API error response:', errorText);
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data: OllamaResponse = await response.json();
      console.log('Ollama response data:', data);
      
      const responseText = data.response.trim();
      console.log('Raw Ollama response:', responseText);
      
      const parsedResponse = this.parseOllamaResponse(responseText);
      console.log('Parsed response:', parsedResponse);
      
      return {
        result: parsedResponse.improved_text,
        purpose: parsedResponse.purpose,
        isSuccess: parsedResponse.isSuccess,
        error: parsedResponse.error
      };
    } catch (error) {
      console.error('Error improving text:', error);
      const errorMessage = this.getUserFriendlyErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Creates a structured prompt for text improvement
   * @param text - The original text to improve
   * @returns string - Formatted prompt for Ollama
   */
  private createPrompt(text: string): string {
    return `You are an advanced grammar, style, and clarity assistant designed to refine written text. 
      Your goal is to make the text clearer, more concise, grammatically correct, and professional—while strictly preserving its original meaning and intent.
      
      Guidelines:
        1. Correct grammar, punctuation, and spelling errors.
        2. Improve readability, clarity, and flow by simplifying awkward or wordy phrasing.
        3. Maintain the original meaning, facts, and tone. Do not add, remove, or reinterpret information.
        4. Respect format:
          - If input is a list (numbered, bulleted, or any structured list), return it in the same format.
          - Preserve line breaks where they naturally aid readability. Do not insert unnecessary breaks.
          - You can add two or more new lines to the text to make it more readable and formatted.
        5. If the text is already clear and professional, keep it unchanged.
        6. Be strict about JSON compliance. Do not output anything outside the required JSON format.
      
      Error Handling:
        - If the input is empty, gibberish, or cannot be improved, return "isSuccess": false and include a human-friendly "error".
      
      Output Format (must be valid JSON):
        {
          "improved_text": "the improved text here, or original text if no changes were needed",
          "purpose": "1-line summary of key improvements, or 'No change required' if unchanged",
          "isSuccess": true, // false only if text could not be processed
          "error": "human-friendly error if failed, omit if successful"
        }
      
      Original text: """${text}"""
    `;
  }
  

  /**
   * Parses Ollama response text to extract improved text and purpose
   * Handles both JSON and plain text responses with fallback strategies
   * @param responseText - Raw response text from Ollama
   * @returns {improved_text: string, purpose: string, isSuccess: boolean; error: string} - Parsed response data
   */
  private parseOllamaResponse(responseText: string): { improved_text: string; purpose: string; isSuccess: boolean; error: string } {
    const parsed = JSON.parse(responseText);
    return {
      improved_text: parsed.improved_text?.trim(),
      purpose: parsed.purpose?.trim(),
      isSuccess: parsed.isSuccess,
      error: parsed.error?.trim()
    };
  }

  /**
   * Gets model configuration from user settings or dynamically based on available models
   * @returns Promise<{fast: ModelConfig, quality: ModelConfig}> - Model configurations
   */
  private async getModelConfig(): Promise<{ fast: ModelConfig; quality: ModelConfig }> {
    try {
      const settings = await this.getUserSettings();
      const availableModels = await this.getAvailableModels();
      
      // Check if the configured models are still available
      const fastModelExists = availableModels.includes(settings.fastModel.name);
      const qualityModelExists = availableModels.includes(settings.qualityModel.name);
      
      if (fastModelExists && qualityModelExists) {
        // Both configured models are available, use them
        return {
          fast: settings.fastModel,
          quality: settings.qualityModel
        };
      } else {
        // One or both models are not available, get dynamic config
        return await this.getDynamicModelConfig();
      }
    } catch (error) {
      console.error('Failed to load model config:', error);
      return await this.getDynamicModelConfig();
    }
  }

  /**
   * Retrieves user settings from Chrome storage
   * @returns Promise<UserSettings> - User settings or defaults
   */
  private async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get('userSettings');
      return result.userSettings || this.getDefaultUserSettings();
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return this.getDefaultUserSettings();
    }
  }

  /**
   * Returns default model configuration
   * @returns {fast: ModelConfig, quality: ModelConfig} - Default model configs
   */
  private getDefaultModelConfig(): { fast: ModelConfig; quality: ModelConfig } {
    return {
      fast: { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
      quality: { name: 'qwen2.5:7b-instruct', temperature: 0.4, top_p: 0.95 }
    };
  }

  /**
   * Gets dynamic model configuration based on available models
   * If only one model is available, uses it for both fast and quality
   * @returns Promise<{fast: ModelConfig, quality: ModelConfig}> - Dynamic model configs
   */
  private async getDynamicModelConfig(): Promise<{ fast: ModelConfig; quality: ModelConfig }> {
    try {
      const availableModels = await this.getAvailableModels();
      
      if (availableModels.length === 0) {
        // No models available, return defaults
        return this.getDefaultModelConfig();
      } else if (availableModels.length === 1) {
        // Only one model available, use it for both fast and quality
        const singleModel = availableModels[0];
        return {
          fast: { name: singleModel, temperature: 0.3, top_p: 0.9 },
          quality: { name: singleModel, temperature: 0.4, top_p: 0.95 }
        };
      } else {
        // Multiple models available, try to use saved settings or defaults
        try {
          const settings = await this.getUserSettings();
          return {
            fast: settings.fastModel,
            quality: settings.qualityModel
          };
        } catch (error) {
          // Fallback to defaults if settings can't be loaded
          return this.getDefaultModelConfig();
        }
      }
    } catch (error) {
      console.error('Failed to get dynamic model config:', error);
      return this.getDefaultModelConfig();
    }
  }

  /**
   * Returns default user settings
   * @returns UserSettings - Default user settings
   */
  private getDefaultUserSettings(): UserSettings {
    const defaultModels = this.getDefaultModelConfig();
    return {
      fastModel: defaultModels.fast,
      qualityModel: defaultModels.quality,
      autoShowPing: true,
      pingIconPosition: 'right',
      theme: 'light',
      highlightChanges: true
    };
  }

  /**
   * Converts technical error messages to user-friendly messages
   * @param error - The original error
   * @returns string - User-friendly error message
   */
  private getUserFriendlyErrorMessage(error: unknown): string {
    const errorString = error instanceof Error ? error.message : String(error);
    
    // Handle common error patterns and convert to user-friendly messages
    if (errorString.includes('Failed to fetch') || errorString.includes('NetworkError')) {
      return 'Unable to connect to Ollama. Please make sure Ollama is running on your computer.';
    }
    
    if (errorString.includes('timeout') || errorString.includes('Timeout')) {
      return 'The request took too long to complete. Please try again or check if Ollama is running properly.';
    }
    
    if (errorString.includes('404') || errorString.includes('Not Found')) {
      return 'The AI model was not found. Please check if the model is installed in Ollama.';
    }
    
    if (errorString.includes('500') || errorString.includes('Internal Server Error')) {
      return 'Ollama encountered an internal error. Please try again in a moment.';
    }
    
    if (errorString.includes('JSON') || errorString.includes('parse')) {
      return 'The AI response was not in the expected format. Please try again.';
    }
    
    if (errorString.includes('model') && errorString.includes('not found')) {
      return 'The selected AI model is not available. Please check your model configuration.';
    }
    
    if (errorString.includes('connection') || errorString.includes('ECONNREFUSED')) {
      return 'Cannot connect to Ollama. Please make sure Ollama is installed and running.';
    }
    
    // Default user-friendly message for unknown errors
    return 'Something went wrong while improving your text. Please make sure Ollama is running and try again.';
  }
}

// ============================================================================
// SETTINGS MANAGER CLASS
// ============================================================================

/**
 * Static utility class for managing user settings persistence
 * Handles Chrome storage operations for user preferences
 */
class SettingsManager {
  private static readonly STORAGE_KEY = 'userSettings';

  /**
   * Retrieves user settings from Chrome storage
   * @returns Promise<UserSettings> - User settings or defaults
   */
  static async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || this.getDefaultUserSettings();
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return this.getDefaultUserSettings();
    }
  }

  /**
   * Saves user settings to Chrome storage
   * @param settings - User settings to save
   * @returns Promise<void>
   */
  static async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.STORAGE_KEY]: settings
      });
      console.log('User settings saved successfully');
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }

  /**
   * Returns default user settings
   * @returns UserSettings - Default user settings
   */
  private static getDefaultUserSettings(): UserSettings {
    return {
      fastModel: { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
      qualityModel: { name: 'qwen2.5:7b-instruct', temperature: 0.4, top_p: 0.95 },
      autoShowPing: true,
      pingIconPosition: 'right',
      theme: 'light',
      highlightChanges: true
    };
  }
}

// ============================================================================
// SERVICE INSTANCE AND MESSAGE HANDLING
// ============================================================================

// Create singleton instance of Ollama service
const ollamaService = new OllamaService();

/**
 * Main message handler for extension communication
 * Routes messages between content scripts, popup, and background services
 */
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

// ============================================================================
// MESSAGE HANDLER FUNCTIONS
// ============================================================================

/**
 * Handles text improvement requests from content scripts
 * @param request - Extension message containing text to improve
 * @param sendResponse - Callback function to send response
 */
async function handleImproveText(request: ExtensionMessage, sendResponse: (response: ExtensionResponse) => void): Promise<void> {
  try {
    const result = await ollamaService.improveText(request.text!, request.isShort);
    console.log('Text improvement successful');
    sendResponse({ result: result.result, purpose: result.purpose, isSuccess: result.isSuccess, error: result.error });
  } catch (error) {
    console.error('Text improvement failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ error: errorMessage, isSuccess: false });
  }
}

/**
 * Handles Ollama status check requests
 * @param sendResponse - Callback function to send response
 */
async function handleCheckOllama(sendResponse: (response: ExtensionResponse) => void): Promise<void> {
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

/**
 * Handles requests to get available Ollama models
 * @param sendResponse - Callback function to send response
 */
async function handleGetModels(sendResponse: (response: ExtensionResponse) => void): Promise<void> {
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

/**
 * Handles user settings save requests
 * @param request - Extension message containing settings to save
 * @param sendResponse - Callback function to send response
 */
async function handleSaveSettings(request: ExtensionMessage, sendResponse: (response: ExtensionResponse) => void): Promise<void> {
  try {
    console.log('Saving settings...');
    await SettingsManager.saveUserSettings(request.settings!);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
  }
}

/**
 * Handles user settings load requests
 * @param sendResponse - Callback function to send response
 */
async function handleLoadSettings(sendResponse: (response: ExtensionResponse) => void): Promise<void> {
  try {
    console.log('Loading settings...');
    const settings = await SettingsManager.getUserSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Failed to load settings:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
  }
}
