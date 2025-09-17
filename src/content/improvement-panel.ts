// Text improvement panel management

import { TextImprovementPanel } from '../shared/types';
import { CSS_CLASSES, EVENTS } from '../shared/constants';
import { TextUtils, DOMUtils } from '../shared/utils';

export class ImprovementPanelManager {
  private panel: TextImprovementPanel | null = null;
  private currentInputText = '';
  private currentInputElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private isProcessing = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener(EVENTS.CLICK, this.handleClick.bind(this));
    document.addEventListener(EVENTS.KEYDOWN, this.handleKeydown.bind(this));
    document.addEventListener('textImprovementRequest', this.handleTextImprovementRequest.bind(this) as EventListener);
  }

  private handleClick(event: MouseEvent): void {
    // Hide panel if clicking outside of it
    if (this.panel && !this.panel.element.contains(event.target as Node)) {
      this.hidePanel();
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Hide panel on Escape key
    if (event.key === 'Escape') {
      this.hidePanel();
    }
  }

  private handleTextImprovementRequest(event: CustomEvent): void {
    const { text, inputElement } = event.detail;
    this.currentInputText = text;
    this.currentInputElement = inputElement;
    this.showPanel(inputElement);
    this.improveText(text);
  }

  private showPanel(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    this.hidePanel(); // Remove existing panel

    const rect = inputElement.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    this.panel = this.createPanel();
    this.panel.show(this.currentInputText, {
      x: rect.left + scrollX,
      y: rect.top + scrollY - 10 // Position above the input
    });
  }

  private hidePanel(): void {
    if (this.panel) {
      this.panel.hide();
      this.panel = null;
    }
    console.log('hide panel');
  }

  private createPanel(): TextImprovementPanel {
    const panel = document.createElement('div');
    panel.className = CSS_CLASSES.PANEL;
    panel.innerHTML = `
      <div class="panel-header">
        <div class="header-left">
          <span class="star-icon">⭐</span>
          <span class="panel-title">Pro suggestion</span>
          <span class="separator">•</span>
          <span class="sample-text">Free sample</span>
        </div>
        <button class="close-btn" aria-label="Close">×</button>
      </div>
      <div class="panel-content">
        <div class="suggestion-purpose">Fix grammar, spelling, and phrasing for clarity</div>
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Improving text...</span>
        </div>
        <div class="suggestion-content" style="display: none;">
          <div class="suggestion-text-container">
            <div class="suggestion-indicator"></div>
            <div class="suggestion-text"></div>
          </div>
          <div class="suggestion-actions">
            <button class="action-btn accept-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
              Accept
            </button>
            <div class="feedback-options">
              <span class="feedback-text">Feedback</span>
              <span class="more-options">⋯</span>
              <span class="google-icon">G</span>
            </div>
          </div>
        </div>
        <div class="error-state" style="display: none;">
          <div class="error-message"></div>
          <button class="retry-btn">Retry</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    const closeBtn = panel.querySelector('.close-btn') as HTMLButtonElement;
    const acceptBtn = panel.querySelector('.accept-btn') as HTMLButtonElement;
    const retryBtn = panel.querySelector('.retry-btn') as HTMLButtonElement;

    closeBtn.addEventListener(EVENTS.CLICK, () => this.hidePanel());
    acceptBtn.addEventListener(EVENTS.CLICK, () => this.replaceSelection());
    retryBtn.addEventListener(EVENTS.CLICK, () => this.improveText(this.currentInputText));

    return {
      element: panel,
      show: (text: string, position: { x: number; y: number }) => {
        panel.style.left = `${position.x}px`;
        panel.style.top = `${position.y}px`;
        panel.style.display = 'block';
        panel.classList.add(CSS_CLASSES.PANEL_VISIBLE);
      },
      hide: () => {
        panel.classList.remove(CSS_CLASSES.PANEL_VISIBLE);
        setTimeout(() => {
          panel.style.display = 'none';
        }, 200);
      },
      destroy: () => {
        panel.remove();
      }
    };
  }

  private async improveText(text: string): Promise<void> {
    if (this.isProcessing || !this.panel) return;

    this.isProcessing = true;
    this.showLoadingState();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'improveText',
        text,
        isShort: TextUtils.isShortText(text)
      });

      if (response.success) {
        this.showSuggestion(response.result);
      } else {
        this.showError(response.error);
      }
    } catch (error) {
      this.showError('Failed to improve text. Please check if Ollama is running.');
    } finally {
      this.isProcessing = false;
    }
  }

  private showLoadingState(): void {
    if (!this.panel) return;

    const loadingState = this.panel.element.querySelector('.loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.suggestion-content') as HTMLElement;
    const errorState = this.panel.element.querySelector('.error-state') as HTMLElement;

    loadingState.style.display = 'flex';
    suggestionContent.style.display = 'none';
    errorState.style.display = 'none';
  }

  private showSuggestion(suggestion: string): void {
    if (!this.panel) return;

    const loadingState = this.panel.element.querySelector('.loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.suggestion-content') as HTMLElement;
    const suggestionText = this.panel.element.querySelector('.suggestion-text') as HTMLElement;
    const errorState = this.panel.element.querySelector('.error-state') as HTMLElement;

    // Highlight changes in the suggestion text
    const highlightedSuggestion = TextUtils.highlightChanges(this.currentInputText, suggestion);
    suggestionText.innerHTML = highlightedSuggestion;
    
    loadingState.style.display = 'none';
    suggestionContent.style.display = 'block';
    errorState.style.display = 'none';
  }

  private showError(error: string): void {
    if (!this.panel) return;

    const loadingState = this.panel.element.querySelector('.loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.suggestion-content') as HTMLElement;
    const errorState = this.panel.element.querySelector('.error-state') as HTMLElement;
    const errorMessage = this.panel.element.querySelector('.error-message') as HTMLElement;

    errorMessage.textContent = error;
    loadingState.style.display = 'none';
    suggestionContent.style.display = 'none';
    errorState.style.display = 'block';
  }

  private replaceSelection(): void {
    const suggestionText = this.panel?.element.querySelector('.suggestion-text') as HTMLElement;
    const text = suggestionText?.textContent || '';

    console.log('Text to replace:', text);
    console.log('Current input element:', this.currentInputElement);

    if (text && this.currentInputElement) {
      // Replace only the selected text in the input element
      const start = this.currentInputElement.selectionStart || 0;
      const end = this.currentInputElement.selectionEnd || 0;
      
      // Replace the selected text with the suggestion
      const beforeSelection = this.currentInputElement.value.substring(0, start);
      const afterSelection = this.currentInputElement.value.substring(end);
      this.currentInputElement.value = beforeSelection + text + afterSelection;
      
      // Set cursor position after the replaced text
      const newCursorPos = start + text.length;
      this.currentInputElement.setSelectionRange(newCursorPos, newCursorPos);
      
      // Add visual feedback
      DOMUtils.addVisualFeedback(this.currentInputElement, CSS_CLASSES.INPUT_REPLACED);
      
      // Trigger input event to notify any listeners (like form validation)
      DOMUtils.triggerInputEvents(this.currentInputElement);
      
      // Focus the input element
      this.currentInputElement.focus();
      
      // Hide the panel
      this.hidePanel();
      
      console.log('Text replaced successfully:', text);
    } else {
      console.error('Cannot replace text: missing suggestion text or input element');
    }
  }

  public cleanup(): void {
    // Clean up panel
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
  }
}
