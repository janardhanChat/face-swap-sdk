/**
 * Jewellery AI Try-On DOM Scanner
 * Scans, filters and registers eligible jewellery/model images on merchant pages.
 */

import { getConfig } from './config';
import { events } from './events';
import { ProductImageMeta } from './types';

// Track elements to prevent duplicate processing
const processedElements = new WeakSet<HTMLImageElement>();
const registeredImages = new Map<string, ProductImageMeta>();
let idCounter = 0;

/**
 * Generates a unique string ID for an image element
 */
function generateImageId(): string {
  return `tryon-img-${++idCounter}-${Date.now().toString(36)}`;
}

/**
 * Simple string hash for consistent fallback product IDs
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extracts product ID from the image or its parent DOM tree
 */
export function extractProductId(img: HTMLImageElement): string {
  // 1. Explicit data-product-id on the image itself
  if (img.dataset.productId) {
    return img.dataset.productId;
  }

  // 2. data-product-id or data-item-id on an ancestor container
  const ancestorWithId = img.closest('[data-product-id], [data-item-id], [data-sku], [data-product-handle]');
  if (ancestorWithId) {
    const el = ancestorWithId as HTMLElement;
    const foundId = el.dataset.productId || el.dataset.itemId || el.dataset.sku || el.dataset.productHandle;
    if (foundId) return foundId;
  }

  // 3. Common e-commerce product card container ID or class
  const productContainer = img.closest('.product-card, .product-item, .product-single, .product-detail, .grid-product, [itemtype*="Product"]');
  if (productContainer) {
    if (productContainer.id) return productContainer.id;
  }

  // 4. Fallback: Hash the clean image URL path
  try {
    const parsed = new URL(img.src, window.location.href);
    return `prod-${simpleHash(parsed.pathname)}`;
  } catch {
    return `prod-${simpleHash(img.src || 'unknown')}`;
  }
}

/**
 * Determines whether an image element is eligible for AI Try-On
 */
export function isImageEligible(img: HTMLImageElement): boolean {
  const config = getConfig();

  // 1. Must be a valid HTMLImageElement with a src
  if (!img || !(img instanceof HTMLImageElement) || !img.src) {
    return false;
  }

  // 2. Explicitly disabled via data-tryon="false"
  if (img.dataset.tryon === 'false') {
    return false;
  }

  // 3. Explicitly enabled via data-tryon="true" (highest precedence)
  if (img.dataset.tryon === 'true') {
    return true;
  }

  // 4. If merchant configured SDK to only process explicit images
  if (config.allowExplicitOnly) {
    return false;
  }

  // 5. Skip tracking pixels / SVGs / inline tiny base64 data URLs
  if (img.src.startsWith('data:image/svg') || img.src.includes('spacer.gif') || img.src.includes('pixel.gif')) {
    return false;
  }

  // 6. Check filter selectors (logos, icons, headers, footers, etc.)
  for (const selector of config.filterSelectors) {
    try {
      if (img.matches(selector) || img.closest(selector)) {
        return false;
      }
    } catch {
      // Ignore invalid custom selectors
    }
  }

  // 7. Check image dimensions (natural or rendered)
  const width = img.naturalWidth || img.clientWidth || img.width;
  const height = img.naturalHeight || img.clientHeight || img.height;

  // If image hasn't loaded yet, check if it has inline styling or attributes that are too small
  if (width === 0 || height === 0) {
    // If it's not loaded yet, we'll listen for the load event and re-evaluate
    return true;
  }

  if (width < config.minImageWidth || height < config.minImageHeight) {
    return false;
  }

  // 8. Filter extreme aspect ratio banners (e.g. 5:1 wide headers or 1:5 skinny towers)
  const ratio = width / height;
  if (ratio > 3.5 || ratio < 0.28) {
    return false;
  }

  return true;
}

/**
 * Evaluates and processes a single image element
 */
export function processImage(img: HTMLImageElement): ProductImageMeta | null {
  if (processedElements.has(img) || img.dataset.tryonProcessed === 'true') {
    return null;
  }

  if (!isImageEligible(img)) {
    return null;
  }

  // If image is still downloading (width/height 0), wait for load event
  const width = img.naturalWidth || img.clientWidth;
  const height = img.naturalHeight || img.clientHeight;

  if (width === 0 && height === 0 && !img.complete) {
    img.addEventListener(
      'load',
      () => {
        // Re-evaluate on load
        if (isImageEligible(img) && !processedElements.has(img)) {
          registerImageMeta(img);
        }
      },
      { once: true }
    );
    return null;
  }

  return registerImageMeta(img);
}

/**
 * Registers an eligible image and emits discovery event
 */
function registerImageMeta(img: HTMLImageElement): ProductImageMeta {
  processedElements.add(img);
  img.dataset.tryonProcessed = 'true';

  const config = getConfig();
  const id = generateImageId();
  const productId = extractProductId(img);
  const isExplicit = img.dataset.tryon === 'true';
  const width = img.naturalWidth || img.clientWidth;
  const height = img.naturalHeight || img.clientHeight;

  const meta: ProductImageMeta = {
    id,
    element: img,
    productId,
    originalSrc: img.currentSrc || img.src,
    currentSrc: img.currentSrc || img.src,
    isExplicit,
    alt: img.alt || '',
    width,
    height,
    galleryGroupId: productId,
    isPersonalized: false,
  };

  registeredImages.set(id, meta);

  if (config.debug) {
    console.log(`[TryOnSDK] Discovered eligible image:`, {
      id,
      productId,
      src: meta.originalSrc,
      dimensions: `${width}x${height}`,
    });
  }

  events.emit('image:discovered', { imageMeta: meta });
  return meta;
}

/**
 * Scans the entire DOM or a sub-tree for eligible product images
 */
export function scanDOM(root: Element = document.body): ProductImageMeta[] {
  if (!root) return [];

  const images = root.querySelectorAll<HTMLImageElement>('img');
  const discovered: ProductImageMeta[] = [];

  images.forEach((img) => {
    const meta = processImage(img);
    if (meta) {
      discovered.push(meta);
    }
  });

  const config = getConfig();
  if (config.debug) {
    console.log(`[TryOnSDK] Scanned ${images.length} images, found ${discovered.length} eligible jewellery models.`);
  }

  events.emit('scan:complete', {
    count: discovered.length,
    images: discovered,
  });

  return discovered;
}

/**
 * Retrieves metadata for a specific image element
 */
export function getImageMeta(element: HTMLImageElement): ProductImageMeta | undefined {
  for (const meta of registeredImages.values()) {
    if (meta.element === element) {
      return meta;
    }
  }
  return undefined;
}

/**
 * Retrieves metadata by image ID
 */
export function getImageMetaById(id: string): ProductImageMeta | undefined {
  return registeredImages.get(id);
}

/**
 * Returns all currently registered eligible images
 */
export function getAllDiscoveredImages(): ProductImageMeta[] {
  return Array.from(registeredImages.values());
}

/**
 * Returns all registered images that belong to the same product ID
 */
export function getImagesByProduct(productId: string): ProductImageMeta[] {
  return getAllDiscoveredImages().filter((img) => img.productId === productId);
}

/**
 * Resets the scanner registry (useful for SPA navigation / cleanup)
 */
export function resetScanner(): void {
  registeredImages.clear();
}
