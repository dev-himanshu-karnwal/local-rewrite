// Content script - Ping icon management and improvement panel

interface PingIcon {
  element: HTMLElement;
  inputElement: HTMLInputElement | HTMLTextAreaElement;
  show: () => void;
  hide: () => void;
  destroy: () => void;
}

interface TextImprovementPanel {
  element: HTMLElement;
  show: (text: string, position: { x: number; y: number }) => void;
  hide: () => void;
  destroy: () => void;
}

class PingIconManager {
  private pingIcons: PingIcon[] = [];
  private observer: MutationObserver | null = null;

  constructor() {
    this.setupMutationObserver();
    this.setupPingIcons();
  }

  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            this.checkForInputFields(element);
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private checkForInputFields(element: Element): void {
    // Check if the element itself is an input or textarea
    if (this.isInputField(element)) {
      this.addPingIcon(element as HTMLInputElement | HTMLTextAreaElement);
    }

    // Check children for input fields
    const inputs = element.querySelectorAll('input[type="text"], input[type="email"], input[type="search"], textarea');
    inputs.forEach(input => {
      this.addPingIcon(input as HTMLInputElement | HTMLTextAreaElement);
    });
  }

  private isInputField(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const inputType = (element as HTMLInputElement).type?.toLowerCase();
    
    return (
      (tagName === 'input' && ['text', 'email', 'search'].includes(inputType || '')) ||
      tagName === 'textarea'
    );
  }

  private setupPingIcons(): void {
    // Find all existing input fields and textareas
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="search"], textarea');
    inputs.forEach(input => {
      this.addPingIcon(input as HTMLInputElement | HTMLTextAreaElement);
    });
  }

  private addPingIcon(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    // Check if ping icon already exists for this input
    if (this.pingIcons.some(icon => icon.inputElement === inputElement)) {
      return;
    }

    const pingIcon = this.createPingIcon(inputElement);
    this.pingIcons.push(pingIcon);
  }

  private createPingIcon(inputElement: HTMLInputElement | HTMLTextAreaElement): PingIcon {
    const pingIcon = document.createElement('div');
    pingIcon.className = 'lre__text-improvement-ping';
    pingIcon.innerHTML = '✨';
    pingIcon.title = 'Improve selected text with AI';

    // Position the ping icon next to the input
    this.positionPingIcon(pingIcon, inputElement);

    // Add click handler
    pingIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePingClick(inputElement);
    });

    // Show/hide ping icon based on text selection
    const updateVisibility = () => {
      const selection = this.getInputSelection(inputElement);
      const hasSelection = selection && selection.length >= 3;
      
      if (hasSelection) {
        pingIcon.style.display = 'block';
      } else {
        pingIcon.style.display = 'none';
      }
    };

    // Listen for selection changes
    inputElement.addEventListener('mouseup', updateVisibility);
    inputElement.addEventListener('keyup', updateVisibility);
    inputElement.addEventListener('select', updateVisibility);
    inputElement.addEventListener('focus', updateVisibility);
    inputElement.addEventListener('blur', () => {
      setTimeout(() => pingIcon.style.display = 'none', 200);
    });

    // Initial visibility check
    updateVisibility();

    document.body.appendChild(pingIcon);

    return {
      element: pingIcon,
      inputElement,
      show: () => pingIcon.style.display = 'block',
      hide: () => pingIcon.style.display = 'none',
      destroy: () => {
        pingIcon.remove();
      }
    };
  }

  private getInputSelection(inputElement: HTMLInputElement | HTMLTextAreaElement): string {
    const start = inputElement.selectionStart || 0;
    const end = inputElement.selectionEnd || 0;
    return inputElement.value.substring(start, end);
  }

  private positionPingIcon(pingIcon: HTMLElement, inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    const rect = inputElement.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    pingIcon.style.position = 'absolute';
    pingIcon.style.left = `${rect.right + scrollX + 8}px`;
    pingIcon.style.top = `${rect.top + scrollY + (rect.height / 2) - 12}px`;
    pingIcon.style.zIndex = '10000';
  }

  private handlePingClick(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    const selectedText = this.getInputSelection(inputElement);
    if (selectedText.length < 3) {
      return;
    }

    // Dispatch custom event for text improvement
    const event = new CustomEvent('lre__textImprovementRequest', {
      detail: {
        text: selectedText,
        inputElement: inputElement
      }
    });
    document.dispatchEvent(event);
  }

  public cleanup(): void {
    // Clean up ping icons
    this.pingIcons.forEach(icon => icon.destroy());
    this.pingIcons = [];

    // Clean up observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

class ImprovementPanelManager {
  private panel: TextImprovementPanel | null = null;
  private currentInputText = '';
  private currentInputElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private isProcessing = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    document.addEventListener('lre__textImprovementRequest', this.handleTextImprovementRequest.bind(this) as EventListener);
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
  }

  private createPanel(): TextImprovementPanel {
    const panel = document.createElement('div');
    panel.className = 'lre__text-improvement-panel';
    panel.innerHTML = `
      <div class="lre__panel-header">
        <div class="lre__header-left">
          <span class="lre__star-icon">⭐</span>
          <span class="lre__panel-title">Pro suggestion</span>
          <span class="lre__separator">•</span>
          <span class="lre__sample-text">Free sample</span>
        </div>
        <button class="lre__close-btn" aria-label="Close">×</button>
      </div>
      <div class="lre__panel-content">
        <div class="lre__suggestion-purpose">Fix grammar, spelling, and phrasing for clarity</div>
        <div class="lre__loading-state">
          <div class="lre__spinner"></div>
          <span>Improving text...</span>
        </div>
        <div class="lre__suggestion-content" style="display: none;">
          <div class="lre__suggestion-text-container">
            <div class="lre__suggestion-indicator"></div>
            <div class="lre__suggestion-text"></div>
          </div>
          <div class="lre__suggestion-actions">
            <button class="lre__action-btn lre__accept-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
              Accept
            </button>
            <div class="lre__feedback-options">
              <span class="lre__feedback-text">Feedback</span>
              <span class="lre__more-options">⋯</span>
              <span class="lre__google-icon">G</span>
            </div>
          </div>
        </div>
        <div class="lre__error-state" style="display: none;">
          <div class="lre__error-message"></div>
          <button class="lre__retry-btn">Retry</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    const closeBtn = panel.querySelector('.lre__close-btn') as HTMLButtonElement;
    const acceptBtn = panel.querySelector('.lre__accept-btn') as HTMLButtonElement;
    const retryBtn = panel.querySelector('.lre__retry-btn') as HTMLButtonElement;

    closeBtn.addEventListener('click', () => this.hidePanel());
    acceptBtn.addEventListener('click', () => this.replaceSelection());
    retryBtn.addEventListener('click', () => this.improveText(this.currentInputText));

    return {
      element: panel,
      show: (text: string, position: { x: number; y: number }) => {
        panel.style.left = `${position.x}px`;
        panel.style.top = `${position.y}px`;
        panel.style.display = 'block';
        panel.classList.add('lre__visible');
      },
      hide: () => {
        panel.classList.remove('lre__visible');
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
        isShort: text.split(' ').length <= 20
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

    const loadingState = this.panel.element.querySelector('.lre__loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.lre__suggestion-content') as HTMLElement;
    const errorState = this.panel.element.querySelector('.lre__error-state') as HTMLElement;

    loadingState.style.display = 'flex';
    suggestionContent.style.display = 'none';
    errorState.style.display = 'none';
  }

  private showSuggestion(suggestion: string): void {
    if (!this.panel) return;

    const loadingState = this.panel.element.querySelector('.lre__loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.lre__suggestion-content') as HTMLElement;
    const suggestionText = this.panel.element.querySelector('.lre__suggestion-text') as HTMLElement;
    const errorState = this.panel.element.querySelector('.lre__error-state') as HTMLElement;

    // Highlight changes in the suggestion text
    const highlightedSuggestion = this.highlightChanges(this.currentInputText, suggestion);
    suggestionText.innerHTML = highlightedSuggestion;
    
    loadingState.style.display = 'none';
    suggestionContent.style.display = 'block';
    errorState.style.display = 'none';
  }

  private highlightChanges(original: string, improved: string): string {
    // Simple word-by-word comparison to highlight changes
    const originalWords = original.split(' ');
    const improvedWords = improved.split(' ');
    
    let highlighted = '';
    let i = 0, j = 0;
    
    while (i < originalWords.length && j < improvedWords.length) {
      if (originalWords[i].toLowerCase() === improvedWords[j].toLowerCase()) {
        // Words are the same, no highlight
        highlighted += improvedWords[j] + ' ';
        i++;
        j++;
      } else {
        // Words are different, highlight the improved word
        highlighted += `<span class="lre__highlight-change">${improvedWords[j]}</span> `;
        j++;
      }
    }
    
    // Add remaining improved words
    while (j < improvedWords.length) {
      highlighted += `<span class="lre__highlight-change">${improvedWords[j]}</span> `;
      j++;
    }
    
    return highlighted.trim();
  }

  private showError(error: string): void {
    if (!this.panel) return;

    const loadingState = this.panel.element.querySelector('.lre__loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.lre__suggestion-content') as HTMLElement;
    const errorState = this.panel.element.querySelector('.lre__error-state') as HTMLElement;
    const errorMessage = this.panel.element.querySelector('.lre__error-message') as HTMLElement;

    errorMessage.textContent = error;
    loadingState.style.display = 'none';
    suggestionContent.style.display = 'none';
    errorState.style.display = 'block';
  }

  private replaceSelection(): void {
    const suggestionText = this.panel?.element.querySelector('.lre__suggestion-text') as HTMLElement;
    const text = suggestionText?.textContent || '';

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
      this.currentInputElement.classList.add('lre__input-replaced');
      setTimeout(() => {
        this.currentInputElement?.classList.remove('lre__input-replaced');
      }, 1000);
      
      // Trigger input event to notify any listeners (like form validation)
      this.currentInputElement.dispatchEvent(new Event('input', { bubbles: true }));
      this.currentInputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focus the input element
      this.currentInputElement.focus();
      
      // Hide the panel
      this.hidePanel();
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
