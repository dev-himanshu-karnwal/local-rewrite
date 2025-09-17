// Chrome storage utilities for user preferences

import { UserSettings, ModelConfig } from './types';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants';

export class StorageManager {
  static async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_SETTINGS);
      return result[STORAGE_KEYS.USER_SETTINGS] || DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.USER_SETTINGS]: settings
      });
      console.log('User settings saved successfully');
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }

  static async getModelConfig(): Promise<{ fast: ModelConfig; quality: ModelConfig }> {
    try {
      const settings = await this.getUserSettings();
      return {
        fast: settings.fastModel,
        quality: settings.qualityModel
      };
    } catch (error) {
      console.error('Failed to load model config:', error);
      return {
        fast: DEFAULT_SETTINGS.fastModel,
        quality: DEFAULT_SETTINGS.qualityModel
      };
    }
  }

  static async saveModelConfig(fastModel: ModelConfig, qualityModel: ModelConfig): Promise<void> {
    try {
      const currentSettings = await this.getUserSettings();
      const updatedSettings: UserSettings = {
        ...currentSettings,
        fastModel,
        qualityModel
      };
      await this.saveUserSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save model config:', error);
      throw error;
    }
  }

  static async updateSetting<K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ): Promise<void> {
    try {
      const currentSettings = await this.getUserSettings();
      const updatedSettings: UserSettings = {
        ...currentSettings,
        [key]: value
      };
      await this.saveUserSettings(updatedSettings);
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  }

  static async resetToDefaults(): Promise<void> {
    try {
      await chrome.storage.sync.clear();
      console.log('Settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }
}
