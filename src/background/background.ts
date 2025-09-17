// Background script for Ollama communication and message handling

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
  };
}

interface ExtensionMessage {
  action: 'improveText' | 'checkOllama' | 'getModels' | 'saveSettings' | 'loadSettings';
  text?: string;
  isShort?: boolean;
  settings?: UserSettings;
}

interface ExtensionResponse {
  success?: boolean;
  result?: string;
  purpose?: string;
  error?: string;
  status?: boolean;
  models?: string[];
  settings?: UserSettings;
}

interface ModelConfig {
  name: string;
  temperature: number;
  top_p: number;
}

interface UserSettings {
  fastModel: ModelConfig;
  qualityModel: ModelConfig;
  autoShowPing: boolean;
  pingIconPosition: 'right' | 'left';
  theme: 'light' | 'dark';
  highlightChanges: boolean;
}

class OllamaService {
  private baseUrl = 'http://localhost:11434';

  async checkOllamaStatus(): Promise<boolean> {
    try {
      console.log('Checking Ollama status at:', `${this.baseUrl}/api/tags`);
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(5000) // 5 second timeout
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

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  async improveText(text: string, isShort: boolean = false): Promise<{ result: string; purpose: string }> {
    const models = await this.getModelConfig();
    const model = isShort ? models.fast : models.quality;
    
    const prompt = this.createPrompt(text);
    
    const request: OllamaRequest = {
      model: model.name,
      prompt,
      stream: false,
      options: {
        temperature: model.temperature,
        top_p: model.top_p
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
        mode: 'cors',
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
        purpose: parsedResponse.purpose
      };
    } catch (error) {
      console.error('Error improving text:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to improve text: ${errorMessage}`);
    }
  }

  private createPrompt(text: string): string {
    return `You are a professional writing assistant. Rewrite the following text to make it clearer, more concise, and more professional. Only improve grammar, style, and clarity. Do not add new facts or change the meaning.
      IMPORTANT: You must respond with valid JSON only. No additional text before or after the JSON.
      Format: {
        "improved_text": "your improved text here",
        "purpose": "brief description of key changes made in 1 line"
      }
      Original text: "${text}"
      JSON response:`;
    }

  private parseOllamaResponse(responseText: string): { improved_text: string; purpose: string } {
    try {
      // Try to parse as JSON first
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.improved_text && parsed.purpose) {
          return {
            improved_text: parsed.improved_text.trim(),
            purpose: parsed.purpose.trim()
          };
        }
      }
      
      // Fallback: if JSON parsing fails, try to extract from text
      const lines = responseText.split('\n').map(line => line.trim()).filter(line => line);
      
      let improvedText = '';
      let purpose = 'Text improvements made';
      
      // Look for common patterns
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for "improved_text" or similar patterns
        if (line.includes('improved_text') || line.includes('improved text') || line.includes('Improved text')) {
          const textMatch = line.match(/["']([^"']+)["']/);
          if (textMatch) {
            improvedText = textMatch[1];
          }
        }
        
        // Look for "purpose" or similar patterns
        if (line.includes('purpose') || line.includes('changes') || line.includes('improvements')) {
          const purposeMatch = line.match(/["']([^"']+)["']/);
          if (purposeMatch) {
            purpose = purposeMatch[1];
          }
        }
      }
      
      // If we still don't have improved text, use the first non-empty line
      if (!improvedText && lines.length > 0) {
        improvedText = lines[0];
      }
      
      return {
        improved_text: improvedText || responseText,
        purpose: purpose
      };
      
    } catch (error) {
      console.error('Failed to parse Ollama response:', error);
      
      // Ultimate fallback: return the response as is
      return {
        improved_text: responseText,
        purpose: 'Text improvements made'
      };
    }
  }

  private async getModelConfig(): Promise<{ fast: ModelConfig; quality: ModelConfig }> {
    try {
      const settings = await this.getUserSettings();
      return {
        fast: settings.fastModel,
        quality: settings.qualityModel
      };
    } catch (error) {
      console.error('Failed to load model config:', error);
      return {
        fast: { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
        quality: { name: 'qwen2.5:7b', temperature: 0.4, top_p: 0.95 }
      };
    }
  }

  private async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get('userSettings');
      return result.userSettings || {
        fastModel: { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
        qualityModel: { name: 'qwen2.5:7b', temperature: 0.4, top_p: 0.95 },
        autoShowPing: true,
        pingIconPosition: 'right',
        theme: 'light',
        highlightChanges: true
      };
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return {
        fastModel: { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
        qualityModel: { name: 'qwen2.5:7b', temperature: 0.4, top_p: 0.95 },
        autoShowPing: true,
        pingIconPosition: 'right',
        theme: 'light',
        highlightChanges: true
      };
    }
  }
}

class SettingsManager {
  static async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get('userSettings');
      return result.userSettings || {
        fastModel: { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
        qualityModel: { name: 'qwen2.5:7b', temperature: 0.4, top_p: 0.95 },
        autoShowPing: true,
        pingIconPosition: 'right',
        theme: 'light',
        highlightChanges: true
      };
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return {
        fastModel: { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
        qualityModel: { name: 'qwen2.5:7b', temperature: 0.4, top_p: 0.95 },
        autoShowPing: true,
        pingIconPosition: 'right',
        theme: 'light',
        highlightChanges: true
      };
    }
  }

  static async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        userSettings: settings
      });
      console.log('User settings saved successfully');
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }
}

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
    sendResponse({ success: true, result: result.result, purpose: result.purpose });
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
    await SettingsManager.saveUserSettings(request.settings!);
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
    const settings = await SettingsManager.getUserSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Failed to load settings:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
  }
}
