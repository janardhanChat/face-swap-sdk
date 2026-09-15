/**
 * Jewellery AI Try-On SDK Configuration Manager
 */

import { ButtonCustomStyle, ButtonPosition, ButtonTheme, SDKConfig } from './types';

const DEFAULT_CONFIG: SDKConfig = {
  siteKey: '',
  apiUrl: 'https://9rk8l0m9-8000.inc1.devtunnels.ms',
  buttonText: '✨ Try On',
  buttonPosition: 'bottom-right',
  buttonTheme: 'gold',
  buttonStyle: {},
  minImageWidth: 120,
  minImageHeight: 120,
  filterSelectors: [
    'header img',
    'nav img',
    'footer img',
    '.logo',
    '.site-logo',
    '.icon',
    '.avatar',
    '.cart-icon',
    '.badge',
    '[data-tryon="false"]',
  ],
  allowExplicitOnly: false,
  maxFileSizeMB: 10,
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  autoScan: true,
  mockMode: false,
  debug: false,
};

let currentConfig: SDKConfig = { ...DEFAULT_CONFIG };

/**
 * Parses script tag data-attributes to load initial configuration
 */
export function extractScriptConfig(): Partial<SDKConfig> {
  if (typeof document === 'undefined') {
    return {};
  }

  // 1. Try document.currentScript
  let scriptElement = document.currentScript as HTMLScriptElement | null;

  // 2. Fallback: Search for script tags loading tryon.js or with data-site-key
  if (!scriptElement) {
    const scripts = document.querySelectorAll('script[data-site-key], script[src*="tryon.js"]');
    if (scripts.length > 0) {
      scriptElement = scripts[scripts.length - 1] as HTMLScriptElement;
    }
  }

  if (!scriptElement) {
    return {};
  }

  const ds = scriptElement.dataset;
  const config: Partial<SDKConfig> = {};
  const buttonStyle: ButtonCustomStyle = {};

  if (ds.siteKey) config.siteKey = ds.siteKey;
  if (ds.apiUrl) config.apiUrl = ds.apiUrl;
  if (ds.buttonText || ds.text) config.buttonText = ds.buttonText || ds.text;
  if (ds.buttonIcon || ds.icon) config.buttonIcon = ds.buttonIcon || ds.icon;

  const pos = ds.buttonPosition || ds.position;
  if (pos && isValidPosition(pos)) config.buttonPosition = pos as ButtonPosition;

  const theme = ds.buttonTheme || ds.theme;
  if (theme && isValidTheme(theme)) config.buttonTheme = theme as ButtonTheme;

  // Custom button styles parsed from data-* attributes
  if (ds.buttonBg || ds.buttonBackground || ds.bg) {
    buttonStyle.background = ds.buttonBg || ds.buttonBackground || ds.bg;
  }
  if (ds.buttonColor || ds.buttonTextColor || ds.color) {
    buttonStyle.color = ds.buttonColor || ds.buttonTextColor || ds.color;
  }
  if (ds.buttonBorder || ds.border) {
    buttonStyle.border = ds.buttonBorder || ds.border;
  }
  if (ds.buttonRadius || ds.buttonBorderRadius || ds.radius) {
    buttonStyle.borderRadius = ds.buttonRadius || ds.buttonBorderRadius || ds.radius;
  }
  if (ds.buttonHoverBg || ds.buttonHoverBackground || ds.hoverBg) {
    buttonStyle.hoverBackground = ds.buttonHoverBg || ds.buttonHoverBackground || ds.hoverBg;
  }
  if (ds.buttonHoverColor || ds.hoverColor) {
    buttonStyle.hoverColor = ds.buttonHoverColor || ds.hoverColor;
  }
  if (ds.buttonHoverBorder || ds.hoverBorder) {
    buttonStyle.hoverBorder = ds.buttonHoverBorder || ds.hoverBorder;
  }
  if (ds.buttonShadow || ds.buttonBoxShadow || ds.shadow || ds.glow) {
    buttonStyle.boxShadow = ds.buttonShadow || ds.buttonBoxShadow || ds.shadow || ds.glow;
  }
  if (ds.buttonHoverShadow || ds.hoverShadow) {
    buttonStyle.hoverBoxShadow = ds.buttonHoverShadow || ds.hoverShadow;
  }
  if (ds.buttonFontFamily || ds.fontFamily) {
    buttonStyle.fontFamily = ds.buttonFontFamily || ds.fontFamily;
  }
  if (ds.buttonFontSize || ds.fontSize) {
    buttonStyle.fontSize = ds.buttonFontSize || ds.fontSize;
  }
  if (ds.buttonFontWeight || ds.fontWeight) {
    buttonStyle.fontWeight = ds.buttonFontWeight || ds.fontWeight;
  }
  if (ds.buttonLetterSpacing || ds.letterSpacing) {
    buttonStyle.letterSpacing = ds.buttonLetterSpacing || ds.letterSpacing;
  }
  if (ds.buttonPadding || ds.padding) {
    buttonStyle.padding = ds.buttonPadding || ds.padding;
  }
  if (ds.buttonBackdropFilter || ds.backdropFilter) {
    buttonStyle.backdropFilter = ds.buttonBackdropFilter || ds.backdropFilter;
  }
  if (ds.buttonShimmer !== undefined) {
    buttonStyle.shimmer = ds.buttonShimmer !== 'false';
  }
  if (ds.buttonOffsetX || ds.offsetX) {
    buttonStyle.offsetX = ds.buttonOffsetX || ds.offsetX;
  }
  if (ds.buttonOffsetY || ds.offsetY) {
    buttonStyle.offsetY = ds.buttonOffsetY || ds.offsetY;
  }
  if (ds.buttonCustomCss || ds.customCss) {
    buttonStyle.customCss = ds.buttonCustomCss || ds.customCss;
  }

  if (Object.keys(buttonStyle).length > 0) {
    config.buttonStyle = buttonStyle;
  }

  if (ds.minWidth || ds.minImageWidth) {
    config.minImageWidth = parseInt(ds.minWidth || ds.minImageWidth || '', 10) || DEFAULT_CONFIG.minImageWidth;
  }
  if (ds.minHeight || ds.minImageHeight) {
    config.minImageHeight = parseInt(ds.minHeight || ds.minImageHeight || '', 10) || DEFAULT_CONFIG.minImageHeight;
  }
  if (ds.allowExplicitOnly !== undefined) config.allowExplicitOnly = ds.allowExplicitOnly === 'true';
  if (ds.maxFileSize || ds.maxFileSizeMb) {
    config.maxFileSizeMB = parseFloat(ds.maxFileSize || ds.maxFileSizeMb || '') || DEFAULT_CONFIG.maxFileSizeMB;
  }
  if (ds.autoScan !== undefined) config.autoScan = ds.autoScan !== 'false';
  if (ds.mockMode !== undefined) config.mockMode = ds.mockMode === 'true';
  if (ds.debug !== undefined) config.debug = ds.debug === 'true';

  return config;
}

export function isValidPosition(pos: string): pos is ButtonPosition {
  return [
    'bottom-right',
    'bottom-left',
    'top-right',
    'top-left',
    'bottom-center',
    'top-center',
    'center',
    'inline',
  ].includes(pos);
}

export function isValidTheme(theme: string): theme is ButtonTheme {
  return [
    'gold',
    'dark',
    'light',
    'glass',
    'emerald',
    'rose',
    'ocean',
    'minimal',
    'custom',
  ].includes(theme);
}

/**
 * Initializes and retrieves SDK configuration
 */
export function initConfig(userConfig?: Partial<SDKConfig>): SDKConfig {
  const scriptConfig = extractScriptConfig();
  const mergedButtonStyle = {
    ...(DEFAULT_CONFIG.buttonStyle || {}),
    ...(scriptConfig.buttonStyle || {}),
    ...(userConfig?.buttonStyle || {}),
  };

  currentConfig = {
    ...DEFAULT_CONFIG,
    ...scriptConfig,
    ...userConfig,
    buttonStyle: mergedButtonStyle,
  };
  return currentConfig;
}

export function getConfig(): SDKConfig {
  return currentConfig;
}

export function updateConfig(partial: Partial<SDKConfig>): SDKConfig {
  const mergedButtonStyle = {
    ...(currentConfig.buttonStyle || {}),
    ...(partial.buttonStyle || {}),
  };

  currentConfig = {
    ...currentConfig,
    ...partial,
    buttonStyle: mergedButtonStyle,
  };
  return currentConfig;
}
