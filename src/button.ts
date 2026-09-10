/**
 * Isolated Try-On Button Component (Shadow DOM)
 * Attaches a luxury interactive Try-On badge without altering merchant layout.
 */

import { getConfig } from './config';
import { events } from './events';
import { ButtonPosition, ButtonTheme, ProductImageMeta } from './types';

// Map of image ID to button host element
const buttonHosts = new Map<string, HTMLElement>();

/**
 * Returns encapsulated CSS for the Try-On button inside Shadow DOM
 */
function getButtonStyles(position: ButtonPosition, theme: ButtonTheme): string {
  // Theme color schemes
  const themes = {
    gold: {
      bg: 'linear-gradient(135deg, rgba(20, 20, 20, 0.88) 0%, rgba(35, 30, 20, 0.92) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.55)',
      color: '#f9f6ee',
      accent: '#d4af37',
      hoverBg: 'linear-gradient(135deg, rgba(30, 28, 20, 0.95) 0%, rgba(45, 38, 22, 0.98) 100%)',
      hoverBorder: '1px solid rgba(245, 215, 110, 0.85)',
      glow: '0 4px 20px rgba(212, 175, 55, 0.28), 0 2px 6px rgba(0, 0, 0, 0.4)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(255, 235, 170, 0.25), transparent)',
    },
    dark: {
      bg: 'rgba(15, 15, 18, 0.9)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      color: '#ffffff',
      accent: '#a78bfa',
      hoverBg: 'rgba(25, 25, 30, 0.98)',
      hoverBorder: '1px solid rgba(255, 255, 255, 0.35)',
      glow: '0 4px 18px rgba(0, 0, 0, 0.45)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    },
    light: {
      bg: 'rgba(255, 255, 255, 0.92)',
      border: '1px solid rgba(212, 175, 55, 0.45)',
      color: '#1a1a1a',
      accent: '#996515',
      hoverBg: '#ffffff',
      hoverBorder: '1px solid rgba(212, 175, 55, 0.8)',
      glow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
    },
    glass: {
      bg: 'rgba(255, 255, 255, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.35)',
      color: '#ffffff',
      accent: '#ffd700',
      hoverBg: 'rgba(255, 255, 255, 0.25)',
      hoverBorder: '1px solid rgba(255, 255, 255, 0.6)',
      glow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    },
  };

  const t = themes[theme] || themes.gold;

  // Positioning coordinates
  let posCss = '';
  switch (position) {
    case 'bottom-right':
      posCss = 'bottom: 12px; right: 12px;';
      break;
    case 'bottom-left':
      posCss = 'bottom: 12px; left: 12px;';
      break;
    case 'top-right':
      posCss = 'top: 12px; right: 12px;';
      break;
    case 'top-left':
      posCss = 'top: 12px; left: 12px;';
      break;
    case 'bottom-center':
      posCss = 'bottom: 12px; left: 50%; transform: translateX(-50%);';
      break;
    case 'inline':
      posCss = 'position: relative; margin-top: 8px; width: 100%;';
      break;
  }

  return `
    :host {
      all: initial;
      display: inline-block;
      position: ${position === 'inline' ? 'relative' : 'absolute'};
      ${posCss}
      z-index: 2147483640;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      pointer-events: auto;
      user-select: none;
    }

    .tryon-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 7px 14px;
      background: ${t.bg};
      color: ${t.color};
      border: ${t.border};
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: ${t.glow};
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      outline: none;
    }

    .tryon-btn:hover {
      background: ${t.hoverBg};
      border: ${t.hoverBorder};
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 6px 24px rgba(212, 175, 55, 0.4), 0 2px 8px rgba(0, 0, 0, 0.5);
    }

    .tryon-btn:active {
      transform: translateY(0) scale(0.98);
    }

    .sparkle-icon {
      font-size: 14px;
      display: inline-block;
      animation: pulseSparkle 2.5s infinite ease-in-out;
    }

    .badge-personalized {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #ffffff;
    }

    .shimmer-effect {
      position: absolute;
      top: 0;
      left: -100%;
      width: 60%;
      height: 100%;
      background: ${t.shimmer};
      transform: skewX(-25deg);
      animation: shimmer 3.5s infinite ease-in-out;
      pointer-events: none;
    }

    @keyframes shimmer {
      0% { left: -100%; opacity: 0; }
      20% { opacity: 0.8; }
      60% { left: 200%; opacity: 0; }
      100% { left: 200%; opacity: 0; }
    }

    @keyframes pulseSparkle {
      0%, 100% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(1.18) rotate(15deg); }
    }
  `;
}

/**
 * Creates and attaches a Try-On button overlay for an eligible image
 */
export function attachTryOnButton(meta: ProductImageMeta): HTMLElement | null {
  const config = getConfig();
  const img = meta.element;

  if (!img || !img.parentElement) {
    return null;
  }

  // Check if button already exists for this image ID
  if (buttonHosts.has(meta.id)) {
    return buttonHosts.get(meta.id)!;
  }

  // Ensure parent has relative positioning so absolute positioning works without breaking layout
  const parent = img.parentElement as HTMLElement;
  const parentStyle = window.getComputedStyle(parent);
  if (parentStyle.position === 'static') {
    parent.style.position = 'relative';
  }

  // Create custom host element
  const host = document.createElement('div');
  host.className = 'tryon-button-host';
  host.dataset.tryonImgId = meta.id;

  // Attach Shadow DOM for 100% CSS encapsulation
  const shadow = host.attachShadow({ mode: 'open' });

  // Add styles
  const styleEl = document.createElement('style');
  styleEl.textContent = getButtonStyles(config.buttonPosition, config.buttonTheme);
  shadow.appendChild(styleEl);

  // Add button element
  const btn = document.createElement('button');
  btn.className = 'tryon-btn';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Try on this jewellery item with AI');

  const sparkle = document.createElement('span');
  sparkle.className = 'sparkle-icon';
  sparkle.textContent = '✨';

  const textSpan = document.createElement('span');
  textSpan.className = 'btn-text';
  textSpan.textContent = meta.isPersonalized ? 'Personalized' : config.buttonText.replace(/^✨\s*/, '');

  const shimmer = document.createElement('div');
  shimmer.className = 'shimmer-effect';

  btn.appendChild(sparkle);
  btn.appendChild(textSpan);
  btn.appendChild(shimmer);
  shadow.appendChild(btn);

  // Click handler
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (config.debug) {
      console.log(`[TryOnSDK] Try-On button clicked for image:`, meta.id, meta.productId);
    }

    events.emit('button:click', { imageMeta: meta });
  });

  // Append host to image container
  parent.appendChild(host);
  buttonHosts.set(meta.id, host);

  return host;
}

/**
 * Updates button state (e.g. when image is personalized)
 */
export function updateButtonState(meta: ProductImageMeta): void {
  const host = buttonHosts.get(meta.id);
  if (!host || !host.shadowRoot) return;

  const btn = host.shadowRoot.querySelector('.tryon-btn') as HTMLButtonElement | null;
  const textSpan = host.shadowRoot.querySelector('.btn-text') as HTMLElement | null;

  if (btn && textSpan) {
    if (meta.isPersonalized) {
      btn.classList.add('badge-personalized');
      textSpan.textContent = '✨ Personalized';
    } else {
      btn.classList.remove('badge-personalized');
      const config = getConfig();
      textSpan.textContent = config.buttonText.replace(/^✨\s*/, '');
    }
  }
}

/**
 * Removes a button host element
 */
export function detachButton(metaId: string): void {
  const host = buttonHosts.get(metaId);
  if (host && host.parentElement) {
    host.parentElement.removeChild(host);
  }
  buttonHosts.delete(metaId);
}

/**
 * Removes all buttons
 */
export function removeAllButtons(): void {
  buttonHosts.forEach((host) => {
    if (host.parentElement) {
      host.parentElement.removeChild(host);
    }
  });
  buttonHosts.clear();
}
