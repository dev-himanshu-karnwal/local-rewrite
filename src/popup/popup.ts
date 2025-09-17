/**
 * Popup Script for Local Text Improver Extension
 * 
 * This script manages the extension's popup interface where users can:
 * - Check Ollama connection status
 * - Configure AI model settings
 * - Adjust temperature and top_p parameters
 * - Save and load user preferences
 * 
 * Key responsibilities:
 * - Ollama status monitoring and display
 * - Model selection and configuration
 * - Settings persistence and validation
 * - User interface state management
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User preferences and settings structure
 */
interface UserSettings {
  fastModel: ModelConfig;
  qualityModel: ModelConfig;
  autoShowPing: boolean;
  pingIconPosition: 'right' | 'left';
  theme: 'light' | 'dark';
  highlightChanges: boolean;
}

/**
 * AI model configuration parameters
 */
interface ModelConfig {
  name: string;
  temperature: number;
  top_p: number;
}

/**
 * Message structure for extension communication
 */
interface ExtensionMessage {
  action: 'improveText' | 'checkOllama' | 'getModels' | 'saveSettings' | 'loadSettings';
  text?: string;
  isShort?: boolean;
  settings?: UserSettings;
}

/**
 * Response structure for extension communication
 */
interface ExtensionResponse {
  success?: boolean;
  result?: string;
  error?: string;
  status?: boolean;
  models?: string[];
  settings?: UserSettings;
}

// ============================================================================
// POPUP CONTROLLER CLASS
// ============================================================================

/**
 * Main controller class for the popup interface
 * Manages all UI interactions and communication with background script
 */
class PopupController {
  // UI Elements
  private statusIndicator!: HTMLElement;
  private statusDot!: HTMLElement;
  private statusText!: HTMLElement;
  private statusCard!: HTMLElement;
  private modelsSection!: HTMLElement;
  private errorSection!: HTMLElement;
  private fastModelSelect!: HTMLSelectElement;
  private qualityModelSelect!: HTMLSelectElement;
  private saveBtn!: HTMLButtonElement;
  private refreshBtn!: HTMLButtonElement;

  // Configuration constants
  private readonly requestTimeout: number = 10000; // 10 seconds
  private readonly modelsTimeout: number = 5000; // 5 seconds

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.checkOllamaStatus();
  }

  /**
   * Initializes all DOM element references
   * Must be called after DOM is loaded
   */
  private initializeElements(): void {
    this.statusIndicator = document.getElementById('lre__statusIndicator')!;
    this.statusDot = this.statusIndicator.querySelector('.lre__status-dot')!;
    this.statusText = this.statusIndicator.querySelector('.lre__status-text')!;
    this.statusCard = document.getElementById('lre__statusCard')!;
    this.modelsSection = document.getElementById('lre__modelsSection')!;
    this.errorSection = document.getElementById('lre__errorSection')!;
    this.fastModelSelect = document.getElementById('lre__fastModelSelect') as HTMLSelectElement;
    this.qualityModelSelect = document.getElementById('lre__qualityModelSelect') as HTMLSelectElement;
    this.saveBtn = document.getElementById('lre__saveSettings') as HTMLButtonElement;
    this.refreshBtn = document.getElementById('lre__refreshStatus') as HTMLButtonElement;
  }

  /**
   * Sets up all event listeners for UI interactions
   */
  private setupEventListeners(): void {
    this.saveBtn.addEventListener('click', () => this.saveSettings());
    this.refreshBtn.addEventListener('click', () => this.checkOllamaStatus());
    
    // Temperature and Top P sliders
    this.setupSliderListeners('fast');
    this.setupSliderListeners('quality');
  }

  /**
   * Sets up slider event listeners for model configuration
   * @param type - Model type ('fast' or 'quality')
   */
  private setupSliderListeners(type: 'fast' | 'quality'): void {
    const tempSlider = document.getElementById(`lre__${type}TempSlider`) as HTMLInputElement;
    const tempValue = document.getElementById(`lre__${type}TempValue`) as HTMLElement;
    const topPSlider = document.getElementById(`lre__${type}TopPSlider`) as HTMLInputElement;
    const topPValue = document.getElementById(`lre__${type}TopPValue`) as HTMLElement;

    tempSlider.addEventListener('input', () => {
      tempValue.textContent = tempSlider.value;
    });

    topPSlider.addEventListener('input', () => {
      topPValue.textContent = topPSlider.value;
    });
  }

  /**
   * Checks Ollama connection status and updates UI accordingly
   */
  private async checkOllamaStatus(): Promise<void> {
    this.setStatus('checking', 'Checking Ollama...');
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), this.requestTimeout);
      });
      
      const messagePromise = chrome.runtime.sendMessage({ action: 'checkOllama' });
      
      const response = await Promise.race([messagePromise, timeoutPromise]) as ExtensionResponse;
      
      if (response && response.status) {
        this.setStatus('connected', 'Ollama Connected');
        await this.loadAvailableModels();
        await this.loadUserSettings();
        this.showModelsSection();
      } else {
        this.setStatus('error', 'Ollama Not Found');
        this.showErrorSection();
      }
    } catch (error) {
      console.error('Ollama check failed:', error);
      this.setStatus('error', 'Connection Failed');
      this.showErrorSection();
    }
  }

  /**
   * Loads available models from Ollama and populates select elements
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), this.modelsTimeout);
      });
      
      const messagePromise = chrome.runtime.sendMessage({ action: 'getModels' });
      const response = await Promise.race([messagePromise, timeoutPromise]) as ExtensionResponse;
      
      const models = response?.models || [];
      
      if (models.length === 0) {
        this.showNoModelsError();
        return;
      }
      
      this.populateModelSelect(this.fastModelSelect, models);
      this.populateModelSelect(this.qualityModelSelect, models);
      
      // Auto-select first model for both fast and quality
      this.fastModelSelect.value = models[0];
      this.qualityModelSelect.value = models[0];
      
    } catch (error) {
      console.error('Failed to load models:', error);
      this.setStatus('error', 'Failed to load models');
    }
  }

  /**
   * Loads user settings from storage and applies them to the UI
   */
  private async loadUserSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'loadSettings' });
      if (response.success && response.settings) {
        const settings = response.settings as UserSettings;
        this.populateSettings(settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Populates a model select element with available models
   * @param select - Select element to populate
   * @param models - Array of model names
   */
  private populateModelSelect(select: HTMLSelectElement, models: string[]): void {
    select.innerHTML = '';
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      select.appendChild(option);
    });
  }

  /**
   * Applies user settings to the UI elements
   * @param settings - User settings to apply
   */
  private populateSettings(settings: UserSettings): void {
    // Model settings - only set if the model exists in the select options
    const fastModelExists = Array.from(this.fastModelSelect.options).some(option => option.value === settings.fastModel.name);
    const qualityModelExists = Array.from(this.qualityModelSelect.options).some(option => option.value === settings.qualityModel.name);
    
    if (fastModelExists) {
      this.fastModelSelect.value = settings.fastModel.name;
    }
    if (qualityModelExists) {
      this.qualityModelSelect.value = settings.qualityModel.name;
    }
    
    this.updateSliderValues('fast', settings.fastModel);
    this.updateSliderValues('quality', settings.qualityModel);
  }

  /**
   * Updates slider values for a specific model type
   * @param type - Model type ('fast' or 'quality')
   * @param config - Model configuration with temperature and top_p values
   */
  private updateSliderValues(type: 'fast' | 'quality', config: ModelConfig): void {
    const tempSlider = document.getElementById(`lre__${type}TempSlider`) as HTMLInputElement;
    const tempValue = document.getElementById(`lre__${type}TempValue`) as HTMLElement;
    const topPSlider = document.getElementById(`lre__${type}TopPSlider`) as HTMLInputElement;
    const topPValue = document.getElementById(`lre__${type}TopPValue`) as HTMLElement;

    tempSlider.value = config.temperature.toString();
    tempValue.textContent = config.temperature.toString();
    topPSlider.value = config.top_p.toString();
    topPValue.textContent = config.top_p.toString();
  }

  /**
   * Saves user settings to storage
   */
  private async saveSettings(): Promise<void> {
    const fastModel = this.fastModelSelect.value;
    const qualityModel = this.qualityModelSelect.value;
    
    if (!fastModel || !qualityModel) {
      alert('Please select both fast and quality models.');
      return;
    }

    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Saving...';

    try {
      const fastConfig: ModelConfig = {
        name: fastModel,
        temperature: parseFloat((document.getElementById('lre__fastTempSlider') as HTMLInputElement).value),
        top_p: parseFloat((document.getElementById('lre__fastTopPSlider') as HTMLInputElement).value)
      };

      const qualityConfig: ModelConfig = {
        name: qualityModel,
        temperature: parseFloat((document.getElementById('lre__qualityTempSlider') as HTMLInputElement).value),
        top_p: parseFloat((document.getElementById('lre__qualityTopPSlider') as HTMLInputElement).value)
      };

      const settings: UserSettings = {
        fastModel: fastConfig,
        qualityModel: qualityConfig,
        autoShowPing: true,
        pingIconPosition: 'right',
        theme: 'light',
        highlightChanges: true
      };

      const response = await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings
      });

      if (response.success) {
        this.saveBtn.textContent = 'Saved!';
        setTimeout(() => {
          this.saveBtn.textContent = 'Save Settings';
          this.saveBtn.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }

    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = 'Save Settings';
    }
  }

  /**
   * Updates the status display with appropriate styling and content
   * @param type - Status type ('checking', 'connected', or 'error')
   * @param text - Status text to display
   */
  private setStatus(type: 'checking' | 'connected' | 'error', text: string): void {
    this.statusText.textContent = text;
    this.statusDot.className = `lre__status-dot lre__${type}`;
    
    const statusIcon = this.statusCard.querySelector('.lre__status-icon') as HTMLElement;
    const statusTitle = this.statusCard.querySelector('.lre__status-title') as HTMLElement;
    const statusDescription = this.statusCard.querySelector('.lre__status-description') as HTMLElement;

    switch (type) {
      case 'checking':
        statusIcon.textContent = '🔍';
        statusTitle.textContent = 'Checking Ollama Connection';
        statusDescription.textContent = 'Verifying local Ollama service...';
        break;
      case 'connected':
        statusIcon.textContent = '✅';
        statusTitle.textContent = 'Ollama Connected';
        statusDescription.textContent = 'Ready to improve text with local AI models';
        break;
      case 'error':
        statusIcon.textContent = '❌';
        statusTitle.textContent = 'Ollama Not Found';
        statusDescription.textContent = 'Please install and start Ollama to continue';
        break;
    }
  }

  /**
   * Shows the models configuration section
   */
  private showModelsSection(): void {
    this.modelsSection.style.display = 'block';
    this.errorSection.style.display = 'none';
  }

  /**
   * Shows the error section
   */
  private showErrorSection(): void {
    this.modelsSection.style.display = 'none';
    this.errorSection.style.display = 'block';
  }

  /**
   * Shows error when no models are installed
   */
  private showNoModelsError(): void {
    this.setStatus('error', 'No Models Installed');
    this.updateErrorContent(
      'No Models Found',
      'Ollama is running but no models are installed. Please install at least one model:',
      [
        'Open terminal/command prompt',
        'Run: <code>ollama pull llama3.2:3b</code>',
        'Run: <code>ollama pull qwen2.5:7b</code>',
        'Refresh this popup after installation'
      ]
    );
    this.showErrorSection();
  }

  /**
   * Updates error section content with custom title, description, and steps
   * @param title - Error title
   * @param description - Error description
   * @param steps - Array of step instructions
   */
  private updateErrorContent(title: string, description: string, steps: string[]): void {
    const errorTitle = this.errorSection.querySelector('h2') as HTMLElement;
    const errorDescription = this.errorSection.querySelector('p') as HTMLElement;
    const errorSteps = this.errorSection.querySelector('ol') as HTMLElement;

    errorTitle.textContent = title;
    errorDescription.textContent = description;
    
    errorSteps.innerHTML = '';
    steps.forEach(step => {
      const li = document.createElement('li');
      li.innerHTML = step;
      errorSteps.appendChild(li);
    });
  }
}

// ============================================================================
// POPUP INITIALIZATION
// ============================================================================

/**
 * Initialize popup when DOM is loaded
 * Creates and starts the popup controller
 */
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
