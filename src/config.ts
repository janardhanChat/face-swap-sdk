/**
 * Jewellery AI Try-On SDK Configuration Manager
 */

import { ButtonPosition, ButtonTheme, SDKConfig } from './types';

const DEFAULT_CONFIG: SDKConfig = {
  siteKey: '',
  apiUrl: 'https://9rk8l0m9-8000.inc1.devtunnels.ms',
  buttonText: '✨ Try On',
  buttonPosition: 'bottom-right',
  buttonTheme: 'gold',
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

  if (ds.siteKey) config.siteKey = ds.siteKey;
  if (ds.apiUrl) config.apiUrl = ds.apiUrl;
  if (ds.buttonText) config.buttonText = ds.buttonText;
  if (ds.position && isValidPosition(ds.position)) config.buttonPosition = ds.position as ButtonPosition;
  if (ds.theme && isValidTheme(ds.theme)) config.buttonTheme = ds.theme as ButtonTheme;
  if (ds.minWidth) config.minImageWidth = parseInt(ds.minWidth, 10) || DEFAULT_CONFIG.minImageWidth;
  if (ds.minHeight) config.minImageHeight = parseInt(ds.minHeight, 10) || DEFAULT_CONFIG.minImageHeight;
  if (ds.allowExplicitOnly !== undefined) config.allowExplicitOnly = ds.allowExplicitOnly === 'true';
  if (ds.maxFileSize) config.maxFileSizeMB = parseFloat(ds.maxFileSize) || DEFAULT_CONFIG.maxFileSizeMB;
  if (ds.autoScan !== undefined) config.autoScan = ds.autoScan !== 'false';
  if (ds.mockMode !== undefined) config.mockMode = ds.mockMode === 'true';
  if (ds.debug !== undefined) config.debug = ds.debug === 'true';

  return config;
}

function isValidPosition(pos: string): pos is ButtonPosition {
  return ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'bottom-center', 'inline'].includes(pos);
}

function isValidTheme(theme: string): theme is ButtonTheme {
  return ['dark', 'light', 'gold', 'glass'].includes(theme);
}

/**
 * Initializes and retrieves SDK configuration
 */
export function initConfig(userConfig?: Partial<SDKConfig>): SDKConfig {
  const scriptConfig = extractScriptConfig();
  currentConfig = {
    ...DEFAULT_CONFIG,
    ...scriptConfig,
    ...userConfig,
  };
  return currentConfig;
}

export function getConfig(): SDKConfig {
  return currentConfig;
}

export function updateConfig(partial: Partial<SDKConfig>): SDKConfig {
  currentConfig = {
    ...currentConfig,
    ...partial,
  };
  return currentConfig;
}
