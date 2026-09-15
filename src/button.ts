/**
 * Isolated Try-On Button Component (Shadow DOM)
 * Attaches a luxury interactive Try-On badge without altering merchant layout.
 * Supports full theme presets, custom brand styling, and live updates.
 */

import { getConfig } from './config';
import { events } from './events';
import { ButtonCustomStyle, ButtonPosition, ButtonTheme, ProductImageMeta } from './types';

// Map of image ID to button host element
const buttonHosts = new Map<string, HTMLElement>();
// Map of image ID to image metadata
const metaRegistry = new Map<string, ProductImageMeta>();

interface ThemePalette {
  bg: string;
  border: string;
  color: string;
  accent: string;
  hoverBg: string;
  hoverBorder: string;
  hoverColor?: string;
  glow: string;
  hoverGlow?: string;
  shimmer: string;
  borderRadius?: string;
}

const THEMES: Record<ButtonTheme, ThemePalette> = {
  gold: {
    bg: 'linear-gradient(135deg, rgba(20, 20, 20, 0.88) 0%, rgba(35, 30, 20, 0.92) 100%)',
    border: '1px solid rgba(212, 175, 55, 0.55)',
    color: '#f9f6ee',
    accent: '#d4af37',
    hoverBg: 'linear-gradient(135deg, rgba(30, 28, 20, 0.95) 0%, rgba(45, 38, 22, 0.98) 100%)',
    hoverBorder: '1px solid rgba(245, 215, 110, 0.85)',
    hoverColor: '#ffffff',
    glow: '0 4px 20px rgba(212, 175, 55, 0.28), 0 2px 6px rgba(0, 0, 0, 0.4)',
    hoverGlow: '0 6px 24px rgba(212, 175, 55, 0.4), 0 2px 8px rgba(0, 0, 0, 0.5)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(255, 235, 170, 0.25), transparent)',
    borderRadius: '30px',
  },
  dark: {
    bg: 'rgba(15, 15, 18, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#ffffff',
    accent: '#a78bfa',
    hoverBg: 'rgba(25, 25, 30, 0.98)',
    hoverBorder: '1px solid rgba(255, 255, 255, 0.35)',
    hoverColor: '#ffffff',
    glow: '0 4px 18px rgba(0, 0, 0, 0.45)',
    hoverGlow: '0 6px 22px rgba(0, 0, 0, 0.6)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    borderRadius: '30px',
  },
  light: {
    bg: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(212, 175, 55, 0.45)',
    color: '#1a1a1a',
    accent: '#996515',
    hoverBg: '#ffffff',
    hoverBorder: '1px solid rgba(212, 175, 55, 0.8)',
    hoverColor: '#111111',
    glow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    hoverGlow: '0 6px 20px rgba(0, 0, 0, 0.18)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent)',
    borderRadius: '30px',
  },
  glass: {
    bg: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    color: '#ffffff',
    accent: '#ffd700',
    hoverBg: 'rgba(255, 255, 255, 0.25)',
    hoverBorder: '1px solid rgba(255, 255, 255, 0.6)',
    hoverColor: '#ffffff',
    glow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    hoverGlow: '0 6px 24px rgba(255, 255, 255, 0.2)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    borderRadius: '30px',
  },
  emerald: {
    bg: 'linear-gradient(135deg, rgba(6, 44, 34, 0.92) 0%, rgba(10, 60, 46, 0.95) 100%)',
    border: '1px solid rgba(52, 211, 153, 0.5)',
    color: '#ecfdf5',
    accent: '#34d399',
    hoverBg: 'linear-gradient(135deg, rgba(8, 55, 42, 0.96) 0%, rgba(16, 80, 62, 0.98) 100%)',
    hoverBorder: '1px solid rgba(110, 231, 183, 0.8)',
    hoverColor: '#ffffff',
    glow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 2px 6px rgba(0, 0, 0, 0.4)',
    hoverGlow: '0 6px 24px rgba(16, 185, 129, 0.45)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(167, 243, 208, 0.3), transparent)',
    borderRadius: '30px',
  },
  rose: {
    bg: 'linear-gradient(135deg, rgba(45, 15, 25, 0.9) 0%, rgba(65, 22, 35, 0.94) 100%)',
    border: '1px solid rgba(251, 113, 133, 0.5)',
    color: '#fff1f2',
    accent: '#fb7185',
    hoverBg: 'linear-gradient(135deg, rgba(58, 20, 32, 0.95) 0%, rgba(80, 28, 44, 0.98) 100%)',
    hoverBorder: '1px solid rgba(253, 164, 175, 0.8)',
    hoverColor: '#ffffff',
    glow: '0 4px 20px rgba(244, 63, 94, 0.3), 0 2px 6px rgba(0, 0, 0, 0.4)',
    hoverGlow: '0 6px 24px rgba(244, 63, 94, 0.45)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(254, 205, 211, 0.3), transparent)',
    borderRadius: '30px',
  },
  ocean: {
    bg: 'linear-gradient(135deg, rgba(12, 30, 55, 0.92) 0%, rgba(18, 45, 80, 0.95) 100%)',
    border: '1px solid rgba(56, 189, 248, 0.5)',
    color: '#f0f9ff',
    accent: '#38bdf8',
    hoverBg: 'linear-gradient(135deg, rgba(16, 40, 72, 0.96) 0%, rgba(24, 60, 105, 0.98) 100%)',
    hoverBorder: '1px solid rgba(125, 211, 252, 0.8)',
    hoverColor: '#ffffff',
    glow: '0 4px 20px rgba(14, 165, 233, 0.3), 0 2px 6px rgba(0, 0, 0, 0.4)',
    hoverGlow: '0 6px 24px rgba(14, 165, 233, 0.45)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(186, 230, 253, 0.3), transparent)',
    borderRadius: '30px',
  },
  minimal: {
    bg: '#111111',
    border: '1px solid #333333',
    color: '#ffffff',
    accent: '#ffffff',
    hoverBg: '#000000',
    hoverBorder: '1px solid #555555',
    hoverColor: '#ffffff',
    glow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    hoverGlow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    shimmer: 'none',
    borderRadius: '6px',
  },
  custom: {
    bg: '#1e1e24',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    accent: '#ffffff',
    hoverBg: '#2a2a32',
    hoverBorder: '1px solid rgba(255, 255, 255, 0.4)',
    hoverColor: '#ffffff',
    glow: '0 4px 16px rgba(0, 0, 0, 0.25)',
    hoverGlow: '0 6px 20px rgba(0, 0, 0, 0.35)',
    shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    borderRadius: '30px',
  },
};

/**
 * Returns encapsulated CSS for the Try-On button inside Shadow DOM
 */
export function getButtonStyles(meta?: ProductImageMeta): string {
  const config = getConfig();
  const ds = meta?.element.dataset;

  // 1. Determine theme
  const rawTheme = (ds?.tryonTheme || config.buttonTheme) as ButtonTheme;
  const theme: ButtonTheme = THEMES[rawTheme] ? rawTheme : 'gold';
  const palette = THEMES[theme] || THEMES.gold;

  // 2. Determine position and offset
  const position = (ds?.tryonPosition || config.buttonPosition || 'bottom-right') as ButtonPosition;
  const offsetX = config.buttonStyle?.offsetX || '12px';
  const offsetY = config.buttonStyle?.offsetY || '12px';

  let posCss = '';
  switch (position) {
    case 'bottom-right':
      posCss = `bottom: ${offsetY}; right: ${offsetX};`;
      break;
    case 'bottom-left':
      posCss = `bottom: ${offsetY}; left: ${offsetX};`;
      break;
    case 'top-right':
      posCss = `top: ${offsetY}; right: ${offsetX};`;
      break;
    case 'top-left':
      posCss = `top: ${offsetY}; left: ${offsetX};`;
      break;
    case 'bottom-center':
      posCss = `bottom: ${offsetY}; left: 50%; transform: translateX(-50%);`;
      break;
    case 'top-center':
      posCss = `top: ${offsetY}; left: 50%; transform: translateX(-50%);`;
      break;
    case 'center':
      posCss = `top: 50%; left: 50%; transform: translate(-50%, -50%);`;
      break;
    case 'inline':
      posCss = 'position: relative; margin-top: 8px; width: 100%;';
      break;
    default:
      posCss = `bottom: ${offsetY}; right: ${offsetX};`;
      break;
  }

  // 3. Merge custom style overrides
  const custom = config.buttonStyle || {};
  const bg = ds?.tryonBg || custom.background || palette.bg;
  const color = ds?.tryonColor || custom.color || palette.color;
  const border = ds?.tryonBorder || custom.border || palette.border;
  const borderRadius = ds?.tryonRadius || custom.borderRadius || palette.borderRadius || '30px';
  const hoverBg = ds?.tryonHoverBg || custom.hoverBackground || palette.hoverBg;
  const hoverColor = ds?.tryonHoverColor || custom.hoverColor || palette.hoverColor || color;
  const hoverBorder = ds?.tryonHoverBorder || custom.hoverBorder || palette.hoverBorder;
  const glow = ds?.tryonShadow || custom.boxShadow || palette.glow;
  const hoverGlow = ds?.tryonHoverShadow || custom.hoverBoxShadow || palette.hoverGlow || glow;
  const fontFamily =
    custom.fontFamily ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const fontSize = ds?.tryonFontSize || custom.fontSize || '13px';
  const fontWeight = custom.fontWeight !== undefined ? String(custom.fontWeight) : '600';
  const letterSpacing = custom.letterSpacing || '0.3px';
  const padding = ds?.tryonPadding || custom.padding || '7px 14px';
  const backdropFilter = custom.backdropFilter || 'blur(10px)';
  const shimmerGrad = palette.shimmer;
  const isShimmerEnabled =
    custom.shimmer !== undefined ? custom.shimmer : shimmerGrad !== 'none';
  const customCss = custom.customCss || '';

  return `
    :host {
      all: initial;
      display: inline-block;
      position: ${position === 'inline' ? 'relative' : 'absolute'};
      ${posCss}
      z-index: 2147483640;
      font-family: ${fontFamily};
      pointer-events: auto;
      user-select: none;
    }

    .tryon-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: ${padding};
      background: ${bg};
      color: ${color};
      border: ${border};
      border-radius: ${borderRadius};
      font-size: ${fontSize};
      font-weight: ${fontWeight};
      letter-spacing: ${letterSpacing};
      cursor: pointer;
      backdrop-filter: ${backdropFilter};
      -webkit-backdrop-filter: ${backdropFilter};
      box-shadow: ${glow};
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      outline: none;
      box-sizing: border-box;
    }

    .tryon-btn:hover {
      background: ${hoverBg};
      color: ${hoverColor};
      border: ${hoverBorder};
      transform: translateY(-2px) scale(1.03);
      box-shadow: ${hoverGlow};
    }

    .tryon-btn:active {
      transform: translateY(0) scale(0.98);
    }

    .sparkle-icon {
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      animation: pulseSparkle 2.5s infinite ease-in-out;
    }

    .badge-personalized {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      border: 1px solid rgba(255, 255, 255, 0.4) !important;
      color: #ffffff !important;
    }

    .shimmer-effect {
      position: absolute;
      top: 0;
      left: -100%;
      width: 60%;
      height: 100%;
      background: ${shimmerGrad};
      transform: skewX(-25deg);
      animation: shimmer 3.5s infinite ease-in-out;
      pointer-events: none;
      display: ${isShimmerEnabled ? 'block' : 'none'};
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

    ${customCss}
  `;
}

/**
 * Resolves button text and icon content for an image
 */
function resolveButtonContent(meta: ProductImageMeta): { text: string; icon: string; showIcon: boolean } {
  const config = getConfig();
  const ds = meta.element.dataset;

  // Icon calculation
  let iconVal: string | boolean | undefined = ds?.tryonIcon;
  if (iconVal === undefined) {
    iconVal =
      config.buttonStyle?.icon !== undefined ? config.buttonStyle.icon : config.buttonIcon;
  }
  if (iconVal === undefined) {
    iconVal = '✨';
  }

  const showIcon = iconVal !== 'none' && iconVal !== 'false' && iconVal !== false && iconVal !== '';
  const iconStr = typeof iconVal === 'string' && iconVal !== 'none' && iconVal !== 'false' ? iconVal : '✨';

  // Text calculation
  let rawText = ds?.tryonButtonText || config.buttonText || 'Try On';
  // Strip duplicate leading emoji if icon is rendered separately
  const cleanText = rawText.replace(/^[✨💎💍👗🛍️]\s*/u, '');

  const text = meta.isPersonalized ? 'Personalized' : cleanText;
  return { text, icon: iconStr, showIcon };
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

  metaRegistry.set(meta.id, meta);

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
  styleEl.className = 'tryon-style-root';
  styleEl.textContent = getButtonStyles(meta);
  shadow.appendChild(styleEl);

  // Add button element
  const btn = document.createElement('button');
  btn.className = 'tryon-btn';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Try on this jewellery item with AI');

  const { text, icon, showIcon } = resolveButtonContent(meta);

  const sparkle = document.createElement('span');
  sparkle.className = 'sparkle-icon';
  sparkle.textContent = icon;
  sparkle.style.display = showIcon ? 'inline-flex' : 'none';

  const textSpan = document.createElement('span');
  textSpan.className = 'btn-text';
  textSpan.textContent = text;

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
  metaRegistry.set(meta.id, meta);
  const host = buttonHosts.get(meta.id);
  if (!host || !host.shadowRoot) return;

  const btn = host.shadowRoot.querySelector('.tryon-btn') as HTMLButtonElement | null;
  const textSpan = host.shadowRoot.querySelector('.btn-text') as HTMLElement | null;

  if (btn && textSpan) {
    if (meta.isPersonalized) {
      btn.classList.add('badge-personalized');
      textSpan.textContent = 'Personalized';
    } else {
      btn.classList.remove('badge-personalized');
      const { text } = resolveButtonContent(meta);
      textSpan.textContent = text;
    }
  }
}

/**
 * Refreshes styles and content on a specific attached button
 */
export function refreshButton(metaId: string): void {
  const host = buttonHosts.get(metaId);
  const meta = metaRegistry.get(metaId);
  if (!host || !host.shadowRoot || !meta) return;

  // Refresh style
  const styleEl = host.shadowRoot.querySelector('.tryon-style-root') as HTMLStyleElement | null;
  if (styleEl) {
    styleEl.textContent = getButtonStyles(meta);
  }

  // Refresh content
  const btn = host.shadowRoot.querySelector('.tryon-btn') as HTMLButtonElement | null;
  const sparkle = host.shadowRoot.querySelector('.sparkle-icon') as HTMLElement | null;
  const textSpan = host.shadowRoot.querySelector('.btn-text') as HTMLElement | null;

  if (btn && textSpan && sparkle) {
    const { text, icon, showIcon } = resolveButtonContent(meta);
    sparkle.textContent = icon;
    sparkle.style.display = showIcon ? 'inline-flex' : 'none';
    if (!meta.isPersonalized) {
      textSpan.textContent = text;
    }
  }
}

/**
 * Refreshes all attached buttons in the DOM immediately
 */
export function refreshAllButtons(): void {
  buttonHosts.forEach((_, metaId) => {
    refreshButton(metaId);
  });
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
  metaRegistry.delete(metaId);
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
  metaRegistry.clear();
}

