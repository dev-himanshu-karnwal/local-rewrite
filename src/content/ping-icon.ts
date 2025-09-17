// Ping icon management for input fields

import { PingIcon } from '../shared/types';
import { CSS_CLASSES, EVENTS, SELECTORS } from '../shared/constants';
import { TextUtils, DOMUtils, EventUtils } from '../shared/utils';

export class PingIconManager {
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
    if (TextUtils.isInputField(element)) {
      this.addPingIcon(element as HTMLInputElement | HTMLTextAreaElement);
    }

    // Check children for input fields
    const inputs = element.querySelectorAll(SELECTORS.INPUT_FIELDS);
    inputs.forEach(input => {
      this.addPingIcon(input as HTMLInputElement | HTMLTextAreaElement);
    });
  }

  private setupPingIcons(): void {
    // Find all existing input fields and textareas
    const inputs = document.querySelectorAll(SELECTORS.INPUT_FIELDS);
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
    pingIcon.className = CSS_CLASSES.PING_ICON;
    pingIcon.innerHTML = '✨';
    pingIcon.title = 'Improve selected text with AI';

    // Position the ping icon next to the input
    DOMUtils.positionElement(pingIcon, inputElement);

    // Add click handler
    pingIcon.addEventListener(EVENTS.CLICK, (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePingClick(inputElement);
    });

    // Show/hide ping icon based on text selection
    const updateVisibility = () => {
      const selection = TextUtils.getInputSelection(inputElement);
      const hasSelection = selection && selection.length >= 3;
      
      if (hasSelection) {
        pingIcon.style.display = 'block';
      } else {
        pingIcon.style.display = 'none';
      }
    };

    // Listen for selection changes
    EventUtils.addEventListenerWithCleanup(inputElement, EVENTS.MOUSEUP, updateVisibility, () => {});
    EventUtils.addEventListenerWithCleanup(inputElement, EVENTS.KEYUP, updateVisibility, () => {});
    EventUtils.addEventListenerWithCleanup(inputElement, EVENTS.SELECT, updateVisibility, () => {});
    EventUtils.addEventListenerWithCleanup(inputElement, EVENTS.FOCUS, updateVisibility, () => {});
    EventUtils.addEventListenerWithCleanup(inputElement, EVENTS.BLUR, () => {
      setTimeout(() => pingIcon.style.display = 'none', 200);
    }, () => {});

    // Initial visibility check
    updateVisibility();

    document.body.appendChild(pingIcon);

    return {
      element: pingIcon,
      inputElement,
      show: () => pingIcon.style.display = 'block',
      hide: () => pingIcon.style.display = 'none',
      destroy: () => {
        EventUtils.cleanupEventListeners(pingIcon);
        pingIcon.remove();
      }
    };
  }

  private handlePingClick(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    const selectedText = TextUtils.getInputSelection(inputElement);
    if (selectedText.length < 3) {
      return;
    }

    // Dispatch custom event for text improvement
    const event = new CustomEvent('textImprovementRequest', {
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
