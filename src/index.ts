/**
 * Jewellery AI Try-On Browser SDK
 * Entry Point & Orchestrator
 */

import { attachTryOnButton, refreshAllButtons, refreshButton, removeAllButtons, updateButtonState } from './button';
import { getConfig, initConfig, updateConfig } from './config';
import { events } from './events';
import { modal } from './modal';
import { isObserverActive, startObserver, stopObserver } from './observer';
import {
  getAllDiscoveredImages,
  getImageMeta,
  getImageMetaById,
  getImagesByProduct,
  processImage,
  resetScanner,
  scanDOM,
} from './scanner';
import { ButtonCustomStyle, EventCallback, ProductImageMeta, SDKConfig, SDKEventMap } from './types';

// In-Page Toggle Host Map (allows shopper to toggle Original vs Personalized on the live page)
const inPageToggleHosts = new Map<string, HTMLElement>();

/**
 * Attaches or updates an in-page comparison toggle pill on the product card
 */
function attachInPageTogglePill(meta: ProductImageMeta, personalizedUrl: string): void {
  const img = meta.element;
  if (!img || !img.parentElement) return;

  let host = inPageToggleHosts.get(meta.id);
  if (!host) {
    host = document.createElement('div');
    host.className = 'tryon-inpage-toggle-host';
    host.dataset.tryonImgId = meta.id;

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2147483640;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          user-select: none;
        }
        .toggle-pill {
          display: flex;
          background: rgba(15, 15, 18, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(212, 175, 55, 0.45);
          border-radius: 20px;
          padding: 3px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }
        .pill-opt {
          background: transparent;
          border: none;
          color: #aaa;
          padding: 4px 10px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pill-opt:hover {
          color: #fff;
        }
        .pill-opt.active {
          background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
          color: #111;
        }
      </style>
      <div class="toggle-pill">
        <button class="pill-opt" id="btn-orig">Original</button>
        <button class="pill-opt active" id="btn-pers">✨ Try-On</button>
      </div>
    `;

    const btnOrig = shadow.getElementById('btn-orig');
    const btnPers = shadow.getElementById('btn-pers');

    const applyOriginal = () => {
      btnOrig?.classList.add('active');
      btnPers?.classList.remove('active');
      img.style.transition = 'opacity 0.25s ease';
      img.style.opacity = '0.4';
      setTimeout(() => {
        img.src = meta.originalSrc;
        meta.currentSrc = meta.originalSrc;
        meta.isPersonalized = false;
        img.style.opacity = '1';
        events.emit('result:reverted', { imageMeta: meta });
      }, 150);
    };

    const applyPersonalized = () => {
      btnPers?.classList.add('active');
      btnOrig?.classList.remove('active');
      img.style.transition = 'opacity 0.25s ease';
      img.style.opacity = '0.4';
      setTimeout(() => {
        img.src = personalizedUrl;
        meta.currentSrc = personalizedUrl;
        meta.isPersonalized = true;
        img.style.opacity = '1';
        events.emit('result:applied', { imageMeta: meta, personalizedUrl });
      }, 150);
    };

    btnOrig?.addEventListener('click', (e) => {
      e.stopPropagation();
      applyOriginal();
    });

    btnPers?.addEventListener('click', (e) => {
      e.stopPropagation();
      applyPersonalized();
    });

    const parent = img.parentElement as HTMLElement;
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(host);
    inPageToggleHosts.set(meta.id, host);
  }
}

/**
 * Handle Result Application (swapping in-page image smoothly)
 */
function handleResultApplied(meta: ProductImageMeta, personalizedUrl: string): void {
  meta.personalizedSrc = personalizedUrl;
  meta.isPersonalized = true;

  // Smooth crossfade swap on target DOM image
  const img = meta.element;
  if (img) {
    img.style.transition = 'opacity 0.3s ease';
    img.style.opacity = '0.3';
    setTimeout(() => {
      img.src = personalizedUrl;
      meta.currentSrc = personalizedUrl;
      img.style.opacity = '1';
    }, 180);
  }

  // Update button state
  updateButtonState(meta);

  // Attach in-page comparison pill
  attachInPageTogglePill(meta, personalizedUrl);
}

/**
 * SDK Core API Object
 */
export const TryOnSDK = {
  version: '1.0.0',

  /**
   * Initializes or updates SDK with configuration
   */
  init(userConfig?: Partial<SDKConfig>): SDKConfig {
    const config = initConfig(userConfig);

    if (config.debug) {
      console.log('✨ [TryOnSDK] Initialized with config:', config);
    }

    // Initialize modal root in DOM
    modal.init();

    // Wire internal events
    events.on('image:discovered', ({ imageMeta }) => {
      attachTryOnButton(imageMeta);
    });

    events.on('button:click', ({ imageMeta }) => {
      modal.open(imageMeta);
    });

    events.on('result:applied', ({ imageMeta, personalizedUrl }) => {
      handleResultApplied(imageMeta, personalizedUrl);
    });

    if (config.autoScan) {
      scanDOM();
      startObserver();
    }

    events.emit('init', { config });
    return config;
  },

  /**
   * Triggers manual DOM scan for new images
   */
  scan(root?: Element): ProductImageMeta[] {
    return scanDOM(root);
  },

  /**
   * Manually opens Try-On modal for a specific image element or ID
   */
  open(target: HTMLImageElement | string): void {
    let meta: ProductImageMeta | undefined;
    if (typeof target === 'string') {
      meta = getImageMetaById(target);
    } else if (target instanceof HTMLImageElement) {
      meta = getImageMeta(target) || processImage(target) || undefined;
    }

    if (meta) {
      modal.open(meta);
    } else {
      console.warn('[TryOnSDK] Target image not found or not eligible for Try-On.');
    }
  },

  /**
   * Closes the active Try-On modal
   */
  close(): void {
    modal.close();
  },

  /**
   * Subscribe to SDK lifecycle events
   */
  on<K extends keyof SDKEventMap>(event: K, callback: EventCallback<SDKEventMap[K]>): () => void {
    return events.on(event, callback);
  },

  /**
   * Unsubscribe from SDK lifecycle events
   */
  off<K extends keyof SDKEventMap>(event: K, callback: EventCallback<SDKEventMap[K]>): void {
    events.off(event, callback);
  },

  /**
   * Subscribe once to SDK lifecycle events
   */
  once<K extends keyof SDKEventMap>(event: K, callback: EventCallback<SDKEventMap[K]>): void {
    events.once(event, callback);
  },

  /**
   * Get current SDK configuration
   */
  getConfig(): SDKConfig {
    return getConfig();
  },

  /**
   * Update SDK configuration and immediately refresh all live buttons
   */
  updateConfig(partial: Partial<SDKConfig>): SDKConfig {
    const updated = updateConfig(partial);
    refreshAllButtons();
    return updated;
  },

  /**
   * Directly customize Try-On button styling in real-time
   */
  setButtonStyle(style: Partial<ButtonCustomStyle>): SDKConfig {
    const updated = updateConfig({ buttonStyle: style });
    refreshAllButtons();
    return updated;
  },

  /**
   * Refresh all Try-On buttons currently attached on the page
   */
  refreshButtons(): void {
    refreshAllButtons();
  },

  /**
   * Refresh a specific button by image ID
   */
  refreshButton(metaId: string): void {
    refreshButton(metaId);
  },

  /**
   * Get all registered candidate product images
   */
  getDiscoveredImages(): ProductImageMeta[] {
    return getAllDiscoveredImages();
  },

  /**
   * Get all images belonging to a product
   */
  getImagesByProduct(productId: string): ProductImageMeta[] {
    return getImagesByProduct(productId);
  },

  /**
   * Destroy / cleanup all SDK elements and observers
   */
  destroy(): void {
    stopObserver();
    removeAllButtons();
    modal.close();
    resetScanner();
    inPageToggleHosts.forEach((host) => host.remove());
    inPageToggleHosts.clear();
  },
};

// Global export for window object
if (typeof window !== 'undefined') {
  (window as any).TryOnSDK = TryOnSDK;

  // Auto-init on script load
  const autoBootstrap = () => {
    TryOnSDK.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBootstrap);
  } else {
    autoBootstrap();
  }
}

export * from './types';
export * from './config';
export * from './events';
export * from './scanner';
export * from './observer';
export * from './button';
export * from './upload';
export * from './api';
export * from './modal';
export default TryOnSDK;