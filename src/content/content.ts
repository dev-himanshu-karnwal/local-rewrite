/**
 * Content Script for Local Text Improver Extension
 * 
 * This script manages the user interface elements on web pages:
 * - Ping icons that appear next to input fields
 * - Text improvement panels with suggestions
 * - User interaction handling and text replacement
 * 
 * Key responsibilities:
 * - Detecting input fields and adding ping icons
 * - Managing text selection and improvement requests
 * - Displaying improvement suggestions and handling user actions
 * - Communicating with background script for AI processing
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Interface for ping icon management
 * Represents a clickable icon that appears next to input fields
 */
interface PingIcon {
  element: HTMLElement;
  inputElement: HTMLInputElement | HTMLTextAreaElement;
  show: () => void;
  hide: () => void;
  destroy: () => void;
}

/**
 * Interface for text improvement panel management
 * Represents the popup panel that shows AI suggestions
 */
interface TextImprovementPanel {
  element: HTMLElement;
  show: (text: string, position: { x: number; y: number }) => void;
  hide: () => void;
  destroy: () => void;
}

// ============================================================================
// PING ICON MANAGER CLASS
// ============================================================================

/**
 * Manages ping icons that appear next to input fields
 * Handles detection of input elements and icon positioning
 */
class PingIconManager {
  private pingIcons: PingIcon[] = [];
  private observer: MutationObserver | null = null;
  private readonly minSelectionLength: number = 3;

  constructor() {
    this.setupMutationObserver();
    this.setupPingIcons();
  }

  /**
   * Sets up mutation observer to detect new input fields
   * Automatically adds ping icons to dynamically created inputs
   */
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

  /**
   * Checks an element and its children for input fields
   * @param element - Element to check for input fields
   */
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

  /**
   * Determines if an element is a supported input field
   * @param element - Element to check
   * @returns boolean - true if element is a supported input field
   */
  private isInputField(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const inputType = (element as HTMLInputElement).type?.toLowerCase();
    
    return (
      (tagName === 'input' && ['text', 'email', 'search'].includes(inputType || '')) ||
      tagName === 'textarea'
    );
  }

  /**
   * Sets up ping icons for all existing input fields on the page
   */
  private setupPingIcons(): void {
    // Find all existing input fields and textareas
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="search"], textarea');
    inputs.forEach(input => {
      this.addPingIcon(input as HTMLInputElement | HTMLTextAreaElement);
    });
  }

  /**
   * Adds a ping icon to an input element if one doesn't already exist
   * @param inputElement - Input element to add ping icon to
   */
  private addPingIcon(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    // Check if ping icon already exists for this input
    if (this.pingIcons.some(icon => icon.inputElement === inputElement)) {
      return;
    }

    const pingIcon = this.createPingIcon(inputElement);
    this.pingIcons.push(pingIcon);
  }

  /**
   * Creates a ping icon for an input element
   * @param inputElement - Input element to create ping icon for
   * @returns PingIcon - Created ping icon object
   */
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
      const hasSelection = selection && selection.length >= this.minSelectionLength;
      
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

  /**
   * Gets the currently selected text from an input element
   * @param inputElement - Input element to get selection from
   * @returns string - Selected text
   */
  private getInputSelection(inputElement: HTMLInputElement | HTMLTextAreaElement): string {
    const start = inputElement.selectionStart || 0;
    const end = inputElement.selectionEnd || 0;
    return inputElement.value.substring(start, end);
  }

  /**
   * Positions a ping icon next to an input element
   * @param pingIcon - Ping icon element to position
   * @param inputElement - Input element to position relative to
   */
  private positionPingIcon(pingIcon: HTMLElement, inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    const rect = inputElement.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    pingIcon.style.position = 'absolute';
    pingIcon.style.left = `${rect.right + scrollX - 32}px`; // 24px icon + 8px padding
    pingIcon.style.top = `${rect.top + scrollY + 6}px`;
    pingIcon.style.zIndex = '10000';
  }

  /**
   * Handles click events on ping icons
   * @param inputElement - Input element associated with the clicked ping icon
   */
  private handlePingClick(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    const selectedText = this.getInputSelection(inputElement);
    if (selectedText.length < this.minSelectionLength) {
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

  /**
   * Cleans up ping icons and mutation observer
   * Should be called when the extension is disabled or page unloads
   */
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

// ============================================================================
// IMPROVEMENT PANEL MANAGER CLASS
// ============================================================================

/**
 * Manages the text improvement panel that shows AI suggestions
 * Handles panel creation, positioning, and user interactions
 */
class ImprovementPanelManager {
  private panel: TextImprovementPanel | null = null;
  private currentInputText = '';
  private currentInputElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private isProcessing = false;
  private readonly shortTextThreshold: number = 20; // words

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for panel interactions
   */
  private setupEventListeners(): void {
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    document.addEventListener('lre__textImprovementRequest', this.handleTextImprovementRequest.bind(this) as EventListener);
  }

  /**
   * Handles click events to hide panel when clicking outside
   * @param event - Mouse click event
   */
  private handleClick(event: MouseEvent): void {
    // Hide panel if clicking outside of it
    if (this.panel && !this.panel.element.contains(event.target as Node)) {
      this.hidePanel();
    }
  }

  /**
   * Handles keyboard events for panel control
   * @param event - Keyboard event
   */
  private handleKeydown(event: KeyboardEvent): void {
    // Hide panel on Escape key
    if (event.key === 'Escape') {
      this.hidePanel();
    }
  }

  /**
   * Handles text improvement requests from ping icons
   * @param event - Custom event containing text and input element
   */
  private handleTextImprovementRequest(event: CustomEvent): void {
    const { text, inputElement } = event.detail;
    this.currentInputText = text;
    this.currentInputElement = inputElement;
    this.showPanel(inputElement);
    this.improveText(text);
  }

  /**
   * Shows the improvement panel positioned relative to an input element
   * @param inputElement - Input element to position panel relative to
   */
  private showPanel(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    this.hidePanel(); // Remove existing panel

    const rect = inputElement.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // Check if input is in top 1/3 of screen to determine panel position
    const screenHeight = window.innerHeight;
    const inputTopRatio = rect.top / screenHeight;
    const showBelow = inputTopRatio < 0.33;

    this.panel = this.createPanel();
    this.panel.show(this.currentInputText, {
      x: rect.left + scrollX,
      y: showBelow ? rect.bottom + scrollY + 8 : rect.top + scrollY - 8
    });
  }

  /**
   * Hides the improvement panel
   */
  private hidePanel(): void {
    if (this.panel) {
      this.panel.hide();
      this.panel = null;
    }
  }

  /**
   * Creates the text improvement panel with all UI elements
   * @returns TextImprovementPanel - Created panel object
   */
  private createPanel(): TextImprovementPanel {
    const panel = document.createElement('div');
    panel.className = 'lre__text-improvement-panel';
    panel.innerHTML = `
      <div class="lre__panel-header">
        <div class="lre__header-left">
          <span class="lre__panel-title">Local Text Improver</span>
        </div>
        <button class="lre__close-btn" aria-label="Close">×</button>
      </div>
      <div class="lre__panel-content">
        <div class="lre__suggestion-purpose" style="display: none;">Analyzing text improvements...</div>
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
            <button class="lre__action-btn lre__replace-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
              Replace
            </button>
            <button class="lre__action-btn lre__copy-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              Copy
            </button>
          </div>
        </div>
        <div class="lre__error-state" style="display: none;">
          <div class="lre__error-message"></div>
          <button class="lre__retry-btn">Retry</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners for panel controls
    const closeBtn = panel.querySelector('.lre__close-btn') as HTMLButtonElement;
    const replaceBtn = panel.querySelector('.lre__replace-btn') as HTMLButtonElement;
    const copyBtn = panel.querySelector('.lre__copy-btn') as HTMLButtonElement;
    const retryBtn = panel.querySelector('.lre__retry-btn') as HTMLButtonElement;

    closeBtn.addEventListener('click', () => this.hidePanel());
    replaceBtn.addEventListener('click', () => this.replaceSelection());
    copyBtn.addEventListener('click', () => this.copySuggestion());
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

  /**
   * Sends text improvement request to background script
   * @param text - Text to improve
   */
  private async improveText(text: string): Promise<void> {
    if (this.isProcessing || !this.panel) return;

    this.isProcessing = true;
    this.showLoadingState();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'improveText',
        text,
        isShort: text.split(' ').length <= this.shortTextThreshold
      });

      if (response.success) {
        this.showSuggestion(response.result, response.purpose);
      } else {
        this.showError(response.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to improve text. Please check if Ollama is running.';
      this.showError(errorMessage);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Shows loading state in the panel
   */
  private showLoadingState(): void {
    if (!this.panel) return;

    const loadingState = this.panel.element.querySelector('.lre__loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.lre__suggestion-content') as HTMLElement;
    const errorState = this.panel.element.querySelector('.lre__error-state') as HTMLElement;

    loadingState.style.display = 'flex';
    suggestionContent.style.display = 'none';
    errorState.style.display = 'none';
  }

  /**
   * Shows the improved text suggestion in the panel
   * @param suggestion - Improved text from AI
   * @param purpose - Optional description of changes made
   */
  private showSuggestion(suggestion: string, purpose?: string): void {
    if (!this.panel) return;

    const loadingState = this.panel.element.querySelector('.lre__loading-state') as HTMLElement;
    const suggestionContent = this.panel.element.querySelector('.lre__suggestion-content') as HTMLElement;
    const suggestionText = this.panel.element.querySelector('.lre__suggestion-text') as HTMLElement;
    const suggestionPurpose = this.panel.element.querySelector('.lre__suggestion-purpose') as HTMLElement;
    const errorState = this.panel.element.querySelector('.lre__error-state') as HTMLElement;

    // Update purpose text if provided and show it
    if (purpose) {
      suggestionPurpose.textContent = purpose;
      suggestionPurpose.style.display = 'block';
    }

    // Remove quotes from suggestion if present
    const cleanSuggestion = suggestion.replace(/^["']|["']$/g, '');

    // Highlight changes in the suggestion text
    const highlightedSuggestion = this.highlightChanges(this.currentInputText, cleanSuggestion);
    suggestionText.innerHTML = highlightedSuggestion;
    
    loadingState.style.display = 'none';
    suggestionContent.style.display = 'block';
    errorState.style.display = 'none';
  }

  /**
   * Highlights differences between original and improved text
   * @param original - Original text
   * @param improved - Improved text
   * @returns string - HTML with highlighted changes
   */
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

  /**
   * Shows error state in the panel
   * @param error - Error message to display
   */
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

  /**
   * Replaces the selected text in the input element with the suggestion
   */
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

  /**
   * Copies the suggestion text to clipboard
   */
  private copySuggestion(): void {
    const suggestionText = this.panel?.element.querySelector('.lre__suggestion-text') as HTMLElement;
    const text = suggestionText?.textContent || '';

    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        // Show brief feedback
        const copyBtn = this.panel?.element.querySelector('.lre__copy-btn') as HTMLButtonElement;
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#28a745';
        copyBtn.style.color = 'white';
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 1500);
      }).catch(err => {
        console.error('Failed to copy text:', err);
        alert('Failed to copy text to clipboard');
      });
    }
  }

  /**
   * Cleans up the improvement panel
   * Should be called when the extension is disabled or page unloads
   */
  public cleanup(): void {
    // Clean up panel
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
  }
}

// ============================================================================
// MAIN EXTENSION CLASS AND INITIALIZATION
// ============================================================================

/**
 * Main extension class that coordinates ping icons and improvement panels
 * Acts as the central controller for the content script functionality
 */
class TextImprovementExtension {
  private pingIconManager: PingIconManager;
  private panelManager: ImprovementPanelManager;

  constructor() {
    this.pingIconManager = new PingIconManager();
    this.panelManager = new ImprovementPanelManager();
  }

  /**
   * Cleans up all extension resources
   * Should be called when the extension is disabled or page unloads
   */
  public cleanup(): void {
    this.pingIconManager.cleanup();
    this.panelManager.cleanup();
  }
}

// ============================================================================
// EXTENSION INITIALIZATION
// ============================================================================

// Global extension instance
let extension: TextImprovementExtension | null = null;

/**
 * Initialize the extension when the page loads
 * Handles both immediate initialization and DOM ready states
 */
function initializeExtension(): void {
  extension = new TextImprovementExtension();
}

// Initialize based on document ready state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
  if (extension) {
    extension.cleanup();
  }
});
