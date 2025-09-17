// Main content script - orchestrates ping icons and improvement panels

import { PingIconManager } from './ping-icon';
import { ImprovementPanelManager } from './improvement-panel';

class TextImprovementExtension {
  private pingIconManager: PingIconManager;
  private panelManager: ImprovementPanelManager;

  constructor() {
    this.pingIconManager = new PingIconManager();
    this.panelManager = new ImprovementPanelManager();
  }

  public cleanup(): void {
    this.pingIconManager.cleanup();
    this.panelManager.cleanup();
  }
}

// Initialize the extension when the page loads
let extension: TextImprovementExtension | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    extension = new TextImprovementExtension();
  });
} else {
  extension = new TextImprovementExtension();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (extension) {
    extension.cleanup();
  }
});
