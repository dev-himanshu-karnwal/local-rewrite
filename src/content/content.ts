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
  inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Finds the effective z-index by checking the element and its ancestors
 * @param element - Element to check
 * @returns number - The highest z-index in the hierarchy, or 10000 if none found
 */
function getEffectiveZIndex(element: Element): number {
  let current: Element | null = element;
  let maxZIndex = 0;
  
  while (current && current !== document.body) {
    const zIndex = parseInt(window.getComputedStyle(current).zIndex);
    
    if (!isNaN(zIndex) && zIndex > maxZIndex) {
      maxZIndex = zIndex;
    }
    
    current = current.parentElement;
  }
  
  // Return found z-index + offset, or a high default value
  return maxZIndex > 0 ? maxZIndex + 10 : 10000;
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
   * Cleans up ping icons for removed input fields
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkForInputFields(node as Element);
          }
        });
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.cleanupRemovedInputs(node as Element);
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
    const inputs = element.querySelectorAll('input[type="text"], input[type="search"], textarea');    
    inputs.forEach(input => {
      this.addPingIcon(input as HTMLInputElement | HTMLTextAreaElement);
    });inputs.forEach(input => {
      this.addPingIcon(input as HTMLInputElement | HTMLTextAreaElement);
    });

    const editors = document.querySelectorAll<HTMLElement>('.ProseMirror[role="textbox"]');
    editors.forEach(editor => {
      this.addEditorPingIcon(editor);
    });
  }

  /**
   * Cleans up ping icons for removed input fields
   * @param removedElement - Element that was removed
   */
  private cleanupRemovedInputs(removedElement: Element): void {
    // Find and remove ping icons for inputs that were removed
    this.pingIcons = this.pingIcons.filter(icon => {
      if (!document.contains(icon.inputElement) || icon.inputElement === removedElement) {
        icon.destroy();
        return false;
      }
      return true;
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
      (tagName === 'input' && ['text', 'search'].includes(inputType || '')) ||
      tagName === 'textarea'
    );
  }

  /**
   * Sets up ping icons for all existing input fields on the page
   */
  private setupPingIcons(): void {
    // Find all existing input fields and textareas
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
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

    // Style the icon to appear inside input
    Object.assign(pingIcon.style, {
      position: 'fixed', // fixed relative to viewport
      width: '20px',
      height: '20px',
      lineHeight: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      pointerEvents: 'auto',
      zIndex: '9999',
      display: 'none',     
    });

    document.body.appendChild(pingIcon);

    // Function to update icon position dynamically
    const updatePosition = () => {
      const rect = inputElement.getBoundingClientRect();
      pingIcon.style.top = `${rect.top + 5}px`; // vertically center
      pingIcon.style.left = `${rect.right - 30}px`; // 4px inside right edge
    };

    // Show/hide icon based on selection
    const updateVisibility = () => {
      const selectionLength = (inputElement.selectionEnd || 0) - (inputElement.selectionStart || 0);
      if (selectionLength >= this.minSelectionLength) {
        pingIcon.style.display = 'block';
        updatePosition();
      } else {
        pingIcon.style.display = 'none';
      }
    };

    // Event listeners for input selection
    inputElement.addEventListener('mouseup', updateVisibility);
    inputElement.addEventListener('keyup', updateVisibility);
    inputElement.addEventListener('select', updateVisibility);
    inputElement.addEventListener('focus', updateVisibility);
    inputElement.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== pingIcon && !pingIcon.matches(':hover')) {
          pingIcon.style.display = 'none';
        }
      }, 100);
    });

    // Recalculate position on scroll or resize (works for modals too)
    window.addEventListener('scroll', () => {
      if (pingIcon.style.display === 'block') updatePosition();
    });
    window.addEventListener('resize', () => {
      if (pingIcon.style.display === 'block') updatePosition();
    });

    // Click handler
    pingIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.handlePingClick(inputElement);
    });

    return {
      element: pingIcon,
      inputElement,
      show: () => { pingIcon.style.display = 'block'; updatePosition(); },
      hide: () => { pingIcon.style.display = 'none'; },
      destroy: () => { pingIcon.remove(); }
    };
  }





  

  private addEditorPingIcon(editor: HTMLElement): void {
    // Avoid duplicates    
    if (this.pingIcons.some(icon => icon.inputElement === editor)) {
      return;
    }

    const pingIcon = this.createEditorPingIcon(editor);
    if (pingIcon) {
      this.pingIcons.push(pingIcon);
    }
  }

  private lastSelectionText: string = "";

  private createEditorPingIcon(editor: HTMLElement): PingIcon | null {
    const pingIcon = document.createElement('div');
    pingIcon.className = 'lre__text-improvement-ping';
    pingIcon.innerHTML = '✨';
    pingIcon.title = 'Improve selected text with AI';

    Object.assign(pingIcon.style, {
      position: 'absolute',
      width: '20px',
      height: '20px',
      lineHeight: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      pointerEvents: 'auto',
      zIndex: '9999',
      display: 'none',
    });

    // Find container (ProseMirror parent)
    const container = editor.closest('.ak-editor-content-area') as HTMLElement;
    if (!container) return null;

    // Ensure container is positioned
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(pingIcon);

    const updatePosition = () => {
      const rect = container.getBoundingClientRect();
      pingIcon.style.top = `8px`;
      pingIcon.style.left = `${rect.width - 28}px`;
    };

    const updateVisibility = () => {
      const selection = window.getSelection();
      console.log("Selection-->", selection);

      const selectedText = selection?.toString().trim() ?? "";
      console.log("selectedText", selectedText);

      if (
        selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        selectedText.length >= this.minSelectionLength && // 👈 only if some text is actually selected
        editor.contains(selection.anchorNode)
      ) {
        this.lastSelectionText = selection.toString();
        pingIcon.style.display = 'block';
        updatePosition();
      } else {
        pingIcon.style.display = 'none';
      }
    };

    // Attach listeners once
    const visibilityHandler = () => updateVisibility();
    const blurHandler = () => {
      setTimeout(() => {
        if (document.activeElement !== pingIcon && !pingIcon.matches(':hover')) {
          pingIcon.style.display = 'none';
        }
      }, 100);
    };

    editor.addEventListener('mouseup', visibilityHandler);
    editor.addEventListener('keyup', visibilityHandler);
    editor.addEventListener('focus', visibilityHandler);
    editor.addEventListener('blur', blurHandler);

    window.addEventListener('scroll', () => {
      if (pingIcon.style.display === 'block') updatePosition();
    });
    window.addEventListener('resize', () => {
      if (pingIcon.style.display === 'block') updatePosition();
    });

    pingIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleEditorPingIconClick(editor);
    });

    return {
      element: pingIcon,
      inputElement: editor,
      show: () => { pingIcon.style.display = 'block'; updatePosition(); },
      hide: () => { pingIcon.style.display = 'none'; },
      destroy: () => {
        pingIcon.remove();
        editor.removeEventListener('mouseup', visibilityHandler);
        editor.removeEventListener('keyup', visibilityHandler);
        editor.removeEventListener('focus', visibilityHandler);
        editor.removeEventListener('blur', blurHandler);
      }
    };
  }

  private handleEditorPingIconClick(inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement): void {  
    let selectedText = "";
    if (inputElement instanceof HTMLInputElement || inputElement instanceof HTMLTextAreaElement) {
      // For standard inputs
      selectedText = this.getInputSelection(inputElement);
    } else {
      // For ProseMirror / contentEditable
      selectedText = this.getSelectedTextFromProseMirror(inputElement);
      if(selectedText === "")      
        selectedText = this.lastSelectionText;
    }


    if (selectedText.length < this.minSelectionLength) {
      return;
    }

    const event = new CustomEvent('lre__textImprovementRequestForEditor', {
      detail: {
        text: selectedText,
        inputElement
      }
    });
    document.dispatchEvent(event);
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

  private getSelectedTextFromProseMirror(editor: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";

  const range = selection.getRangeAt(0);

  // Make sure the selection is inside the editor
  if (!editor.contains(range.commonAncestorContainer)) return "";

  return selection.toString();
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
  private proseMirrorEditor: HTMLElement | null = null;
  private changingProseMirror: string | null = null;

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
    document.addEventListener('lre__textImprovementRequestForEditor', this.handleTextImprovementRequestForEditor.bind(this) as EventListener);    

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

  private handleTextImprovementRequestForEditor(event: CustomEvent): void {    
    const { text, inputElement } = event.detail;
    this.currentInputText = text;
    this.currentInputElement = inputElement;
    this.showPanel(inputElement);
    this.improveTextAndHTML(text, inputElement);
  }

  private async improveTextAndHTML(text: string, inputElement: HTMLElement ): Promise<void> {
    if (this.isProcessing || !this.panel) return;
      this.isProcessing = true;
    
    this.showLoadingState();
    if (inputElement && inputElement.classList.contains('ProseMirror')) {
        this.proseMirrorEditor = inputElement;
        const elementHtml = inputElement.outerHTML; // ✅ whole element as string

        const response = await chrome.runtime.sendMessage({
          action: 'makeEditedElement',
          text,
          element: elementHtml
        });

        if (response.isSuccess) {
          console.log("response.result-->",response.result);
          
          const response_data = JSON.parse(response.result);
          this.changingProseMirror = response_data.markdown_content;          
          this.showSuggestion(response_data.improved_text, response_data.purpose);
        // this.showSuggestion(response.result, response.purpose);
      } else {
        this.showError(response.error);
      }
    }
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

    // Get effective z-index from input hierarchy
    const effectiveZIndex = getEffectiveZIndex(inputElement);

    this.panel = this.createPanel();
    
    // Set z-index for the panel (slightly higher than the input's hierarchy)
    this.panel.element.style.zIndex = `${effectiveZIndex + 5}`;

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
    this.proseMirrorEditor = null;
    if (this.isProcessing || !this.panel) return;
    
    this.isProcessing = true;
    this.showLoadingState();

    

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'improveText',
        text,
        isShort: text.split(' ').length <= this.shortTextThreshold
      });

      if (response.isSuccess) {
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
  private async replaceSelection(): Promise<void> {
    const suggestionText = this.panel?.element.querySelector('.lre__suggestion-text') as HTMLElement;
    const text = suggestionText?.textContent || '';

    console.log("this.proseMirrorEditor",this.proseMirrorEditor);
    // if(this.proseMirrorEditor && this.changingProseMirror){
    //   const parser = new DOMParser();
    //   const doc = parser.parseFromString(this.changingProseMirror, "text/html");
    //   const element = doc.body.firstChild as HTMLElement | null;
    //   if (element && this.proseMirrorEditor.parentNode) {
    //     this.proseMirrorEditor.parentNode.replaceChild(element, this.proseMirrorEditor);
    //     // Update the reference to point to the new element
    //     this.proseMirrorEditor = element;
    //     this.proseMirrorEditor.focus();
    //     this.hidePanel();
    //   }
    // }
     


    if (this.proseMirrorEditor && this.changingProseMirror) {
      const parent = this.proseMirrorEditor;

      // Ensure we have a string (await if Promise)
      const markdownContent: string = await Promise.resolve(this.changingProseMirror);

      // Basic Markdown → HTML converter
      const htmlString = markdownContent
        .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
        .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')   // bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')               // italics
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>') // links
        .replace(/^\s*\-\s+(.*)$/gim, '<li>$1</li>')       // unordered list items
        .replace(/\n/g, '<br>');                            // line breaks

      // Parse HTML into DOM nodes
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      const newNodes = Array.from(doc.body.childNodes);

      // Replace all children of the editor
      while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }
      newNodes.forEach(node => parent.appendChild(node));

      // Focus first child if exists
      const firstChild = parent.firstElementChild as HTMLElement | null;
      if (firstChild) firstChild.focus();

      // Optionally hide the panel
      this.hidePanel();
    }

    else if (text && this.currentInputElement) {
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
