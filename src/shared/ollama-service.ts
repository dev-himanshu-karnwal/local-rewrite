// Ollama API service for text improvement

import { OllamaRequest, OllamaResponse, ModelConfig } from './types';
import { OLLAMA_BASE_URL } from './constants';
import { StorageManager } from './storage';
import { TextUtils } from './utils';

export class OllamaService {
  private baseUrl = OLLAMA_BASE_URL;

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

  async improveText(text: string, isShort: boolean = false): Promise<string> {
    const models = await StorageManager.getModelConfig();
    const model = isShort ? models.fast : models.quality;
    
    const prompt = TextUtils.createPrompt(text);
    
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
      return data.response.trim();
    } catch (error) {
      console.error('Error improving text:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to improve text: ${errorMessage}`);
    }
  }
}
