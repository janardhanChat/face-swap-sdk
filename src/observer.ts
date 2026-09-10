/**
 * Dynamic MutationObserver for Jewellery AI Try-On SDK
 * Detects newly injected or updated images in React, Next.js, Shopify, and SPA applications.
 */

import { getConfig } from './config';
import { processImage, scanDOM } from './scanner';

let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
let isObservingActive = false;

/**
 * Debounced queue of elements to scan
 */
const pendingElements = new Set<HTMLImageElement>();

function flushPendingQueue(): void {
  if (pendingElements.size === 0) return;

  const imagesToProcess = Array.from(pendingElements);
  pendingElements.clear();

  imagesToProcess.forEach((img) => {
    // If element is still connected in the DOM
    if (document.body.contains(img)) {
      processImage(img);
    }
  });
}

/**
 * Handles batch mutations
 */
function handleMutations(mutations: MutationRecord[]): void {
  let needsGeneralScan = false;

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.tagName === 'IMG') {
            pendingElements.add(el as HTMLImageElement);
          } else {
            const nestedImgs = el.querySelectorAll<HTMLImageElement>('img');
            nestedImgs.forEach((img) => pendingElements.add(img));
          }
        }
      });
    } else if (mutation.type === 'attributes') {
      const target = mutation.target as Element;
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        // If src changed or tryon attribute changed, reset processed state and re-evaluate
        delete img.dataset.tryonProcessed;
        pendingElements.add(img);
      }
    }
  }

  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    flushPendingQueue();
  }, 120);
}

/**
 * Starts observing DOM mutations
 */
export function startObserver(target: Node = document.body): void {
  if (observer) {
    observer.disconnect();
  }

  if (!target || typeof MutationObserver === 'undefined') {
    return;
  }

  observer = new MutationObserver(handleMutations);

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-tryon', 'data-product-id'],
  });

  isObservingActive = true;

  const config = getConfig();
  if (config.debug) {
    console.log('[TryOnSDK] Dynamic MutationObserver initialized.');
  }
}

/**
 * Stops observing DOM mutations
 */
export function stopObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingElements.clear();
  isObservingActive = false;
}

/**
 * Checks if observer is currently active
 */
export function isObserverActive(): boolean {
  return isObservingActive;
}
