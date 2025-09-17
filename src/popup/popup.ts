// Popup script for settings and configuration

interface UserSettings {
  fastModel: ModelConfig;
  qualityModel: ModelConfig;
  autoShowPing: boolean;
  pingIconPosition: 'right' | 'left';
  theme: 'light' | 'dark';
  highlightChanges: boolean;
}

interface ModelConfig {
  name: string;
  temperature: number;
  top_p: number;
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
  error?: string;
  status?: boolean;
  models?: string[];
  settings?: UserSettings;
}

class PopupController {
  private statusIndicator!: HTMLElement;
  private statusDot!: HTMLElement;
  private statusText!: HTMLElement;
  private statusCard!: HTMLElement;
  private modelsSection!: HTMLElement;
  private uiSettingsSection!: HTMLElement;
  private errorSection!: HTMLElement;
  private fastModelSelect!: HTMLSelectElement;
  private qualityModelSelect!: HTMLSelectElement;
  private saveBtn!: HTMLButtonElement;
  private refreshBtn!: HTMLButtonElement;
  private autoShowPingCheckbox!: HTMLInputElement;
  private pingPositionSelect!: HTMLSelectElement;
  private themeSelect!: HTMLSelectElement;
  private highlightChangesCheckbox!: HTMLInputElement;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.checkOllamaStatus();
  }

  private initializeElements(): void {
    this.statusIndicator = document.getElementById('lre__statusIndicator')!;
    this.statusDot = this.statusIndicator.querySelector('.lre__status-dot')!;
    this.statusText = this.statusIndicator.querySelector('.lre__status-text')!;
    this.statusCard = document.getElementById('lre__statusCard')!;
    this.modelsSection = document.getElementById('lre__modelsSection')!;
    this.uiSettingsSection = document.getElementById('lre__uiSettingsSection')!;
    this.errorSection = document.getElementById('lre__errorSection')!;
    this.fastModelSelect = document.getElementById('lre__fastModelSelect') as HTMLSelectElement;
    this.qualityModelSelect = document.getElementById('lre__qualityModelSelect') as HTMLSelectElement;
    this.saveBtn = document.getElementById('lre__saveSettings') as HTMLButtonElement;
    this.refreshBtn = document.getElementById('lre__refreshStatus') as HTMLButtonElement;
    this.autoShowPingCheckbox = document.getElementById('lre__autoShowPing') as HTMLInputElement;
    this.pingPositionSelect = document.getElementById('lre__pingPosition') as HTMLSelectElement;
    this.themeSelect = document.getElementById('lre__theme') as HTMLSelectElement;
    this.highlightChangesCheckbox = document.getElementById('lre__highlightChanges') as HTMLInputElement;
  }

  private setupEventListeners(): void {
    this.saveBtn.addEventListener('click', () => this.saveSettings());
    this.refreshBtn.addEventListener('click', () => this.checkOllamaStatus());
    
    // Temperature and Top P sliders
    this.setupSliderListeners('fast');
    this.setupSliderListeners('quality');
  }

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

  private async checkOllamaStatus(): Promise<void> {
    this.setStatus('checking', 'Checking Ollama...');
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000); // 10 second timeout
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

  private async loadAvailableModels(): Promise<void> {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      
      const messagePromise = chrome.runtime.sendMessage({ action: 'getModels' });
      const response = await Promise.race([messagePromise, timeoutPromise]) as ExtensionResponse;
      
      const models = response?.models || [];
      
      this.populateModelSelect(this.fastModelSelect, models);
      this.populateModelSelect(this.qualityModelSelect, models);
      
    } catch (error) {
      console.error('Failed to load models:', error);
      this.setStatus('error', 'Failed to load models');
    }
  }

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

  private populateModelSelect(select: HTMLSelectElement, models: string[]): void {
    select.innerHTML = '<option value="">Select a model...</option>';
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      select.appendChild(option);
    });
  }

  private populateSettings(settings: UserSettings): void {
    // Model settings
    this.fastModelSelect.value = settings.fastModel.name;
    this.qualityModelSelect.value = settings.qualityModel.name;
    this.updateSliderValues('fast', settings.fastModel);
    this.updateSliderValues('quality', settings.qualityModel);

    // UI settings
    this.autoShowPingCheckbox.checked = settings.autoShowPing;
    this.pingPositionSelect.value = settings.pingIconPosition;
    this.themeSelect.value = settings.theme;
    this.highlightChangesCheckbox.checked = settings.highlightChanges;
  }

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
        autoShowPing: this.autoShowPingCheckbox.checked,
        pingIconPosition: this.pingPositionSelect.value as 'right' | 'left',
        theme: this.themeSelect.value as 'light' | 'dark',
        highlightChanges: this.highlightChangesCheckbox.checked
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

  private showModelsSection(): void {
    this.modelsSection.style.display = 'block';
    this.uiSettingsSection.style.display = 'block';
    this.errorSection.style.display = 'none';
  }

  private showErrorSection(): void {
    this.modelsSection.style.display = 'none';
    this.uiSettingsSection.style.display = 'none';
    this.errorSection.style.display = 'block';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
