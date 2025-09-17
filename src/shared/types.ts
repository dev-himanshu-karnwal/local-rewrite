// Shared types and interfaces for the extension

export interface TextImprovementPanel {
  element: HTMLElement;
  show: (text: string, position: { x: number; y: number }) => void;
  hide: () => void;
  destroy: () => void;
}

export interface PingIcon {
  element: HTMLElement;
  inputElement: HTMLInputElement | HTMLTextAreaElement;
  show: () => void;
  hide: () => void;
  destroy: () => void;
}

export interface ModelConfig {
  name: string;
  temperature: number;
  top_p: number;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
  };
}

export interface ExtensionMessage {
  action: 'improveText' | 'checkOllama' | 'getModels' | 'saveSettings' | 'loadSettings';
  text?: string;
  isShort?: boolean;
  settings?: UserSettings;
}

export interface ExtensionResponse {
  success?: boolean;
  result?: string;
  error?: string;
  status?: boolean;
  models?: string[];
  settings?: UserSettings;
}

export interface UserSettings {
  fastModel: ModelConfig;
  qualityModel: ModelConfig;
  autoShowPing: boolean;
  pingIconPosition: 'right' | 'left';
  theme: 'light' | 'dark';
  highlightChanges: boolean;
}
