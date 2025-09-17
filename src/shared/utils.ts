// Shared utility functions

import { ModelConfig } from './types';

export class TextUtils {
  static getInputSelection(inputElement: HTMLInputElement | HTMLTextAreaElement): string {
    const start = inputElement.selectionStart || 0;
    const end = inputElement.selectionEnd || 0;
    return inputElement.value.substring(start, end);
  }

  static isInputField(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const inputType = (element as HTMLInputElement).type?.toLowerCase();
    
    return (
      (tagName === 'input' && ['text', 'email', 'search'].includes(inputType || '')) ||
      tagName === 'textarea'
    );
  }

  static highlightChanges(original: string, improved: string): string {
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
        highlighted += `<span class="highlight-change">${improvedWords[j]}</span> `;
        j++;
      }
    }
    
    // Add remaining improved words
    while (j < improvedWords.length) {
      highlighted += `<span class="highlight-change">${improvedWords[j]}</span> `;
      j++;
    }
    
    return highlighted.trim();
  }

  static createPrompt(text: string): string {
    return `You are a professional writing assistant. Rewrite the following text to make it clearer, more concise, and more professional. Only improve grammar, style, and clarity. Do not add new facts or change the meaning. Return only the improved text without any explanations or additional text.

Original text: "${text}"

Improved text:`;
  }

  static isShortText(text: string): boolean {
    return text.split(' ').length <= 20;
  }
}

export class DOMUtils {
  static positionElement(
    element: HTMLElement, 
    inputElement: HTMLInputElement | HTMLTextAreaElement,
    position: 'right' | 'left' = 'right'
  ): void {
    const rect = inputElement.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    element.style.position = 'absolute';
    element.style.zIndex = '10000';

    if (position === 'right') {
      element.style.left = `${rect.right + scrollX + 8}px`;
    } else {
      element.style.left = `${rect.left + scrollX - element.offsetWidth - 8}px`;
    }
    
    element.style.top = `${rect.top + scrollY + (rect.height / 2) - 12}px`;
  }

  static addVisualFeedback(
    inputElement: HTMLInputElement | HTMLTextAreaElement,
    className: string,
    duration: number = 1000
  ): void {
    inputElement.classList.add(className);
    setTimeout(() => {
      inputElement.classList.remove(className);
    }, duration);
  }

  static triggerInputEvents(inputElement: HTMLInputElement | HTMLTextAreaElement): void {
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export class EventUtils {
  static addEventListenerWithCleanup(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    cleanup: () => void
  ): void {
    element.addEventListener(event, handler);
    // Store cleanup function for later use
    (element as any).__cleanupFunctions = (element as any).__cleanupFunctions || [];
    (element as any).__cleanupFunctions.push(() => {
      element.removeEventListener(event, handler);
      cleanup();
    });
  }

  static cleanupEventListeners(element: HTMLElement): void {
    const cleanupFunctions = (element as any).__cleanupFunctions || [];
    cleanupFunctions.forEach((fn: () => void) => fn());
    delete (element as any).__cleanupFunctions;
  }
}
