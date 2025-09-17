// Shared constants and configuration

export const OLLAMA_BASE_URL = 'http://localhost:11434';

export const DEFAULT_MODELS: ModelConfig[] = [
  { name: 'llama3.2:3b', temperature: 0.3, top_p: 0.9 },
  { name: 'qwen2.5:7b', temperature: 0.4, top_p: 0.95 }
];

export const DEFAULT_SETTINGS: UserSettings = {
  fastModel: DEFAULT_MODELS[0],
  qualityModel: DEFAULT_MODELS[1],
  autoShowPing: true,
  pingIconPosition: 'right',
  theme: 'light',
  highlightChanges: true
};

export const STORAGE_KEYS = {
  USER_SETTINGS: 'userSettings',
  FAST_MODEL: 'fastModel',
  QUALITY_MODEL: 'qualityModel'
} as const;

export const SELECTORS = {
  INPUT_FIELDS: 'input[type="text"], input[type="email"], input[type="search"], textarea',
  PING_ICON: '.text-improvement-ping',
  PANEL: '.text-improvement-panel'
} as const;

export const CSS_CLASSES = {
  PING_ICON: 'text-improvement-ping',
  PANEL: 'text-improvement-panel',
  PANEL_VISIBLE: 'visible',
  INPUT_REPLACED: 'input-replaced',
  HIGHLIGHT_CHANGE: 'highlight-change'
} as const;

export const EVENTS = {
  CLICK: 'click',
  KEYDOWN: 'keydown',
  MOUSEUP: 'mouseup',
  KEYUP: 'keyup',
  SELECT: 'select',
  FOCUS: 'focus',
  BLUR: 'blur',
  INPUT: 'input',
  CHANGE: 'change'
} as const;

import { ModelConfig, UserSettings } from './types';
