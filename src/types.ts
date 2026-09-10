/**
 * Jewellery AI Try-On SDK Types
 */

export type ButtonPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center' | 'inline';
export type ButtonTheme = 'dark' | 'light' | 'gold' | 'glass';

export interface SDKConfig {
  /** Merchant Site Key (e.g. pk_test_xxx) */
  siteKey: string;
  /** Backend API Base URL */
  apiUrl: string;
  /** Text displayed on the Try-On button */
  buttonText: string;
  /** Positioning of the Try-On button overlay */
  buttonPosition: ButtonPosition;
  /** Theme styling for the button */
  buttonTheme: ButtonTheme;
  /** Minimum width for candidate product images in pixels */
  minImageWidth: number;
  /** Minimum height for candidate product images in pixels */
  minImageHeight: number;
  /** CSS selectors to ignore during DOM scanning (e.g. .logo, nav img) */
  filterSelectors: string[];
  /** Only process images with explicit data-tryon="true" attribute */
  allowExplicitOnly: boolean;
  /** Maximum upload file size in megabytes */
  maxFileSizeMB: number;
  /** Allowed MIME types for user photo uploads */
  supportedFormats: string[];
  /** Automatically run initial scan upon script load */
  autoScan: boolean;
  /** Use mock API responses for local prototyping */
  mockMode: boolean;
  /** Enable verbose console debugging output */
  debug: boolean;
}

export interface ProductImageMeta {
  /** Unique ID generated for this DOM image tracking */
  id: string;
  /** Target HTML Image element reference */
  element: HTMLImageElement;
  /** Product identifier (from data-product-id or generated) */
  productId: string;
  /** Original image source URL */
  originalSrc: string;
  /** Currently displayed image source URL */
  currentSrc: string;
  /** Generated personalized image URL if try-on was performed */
  personalizedSrc?: string;
  /** Whether the image explicitly had data-tryon="true" */
  isExplicit: boolean;
  /** Image alt text */
  alt: string;
  /** Rendered/Natural image width */
  width: number;
  /** Rendered/Natural image height */
  height: number;
  /** Product group ID if part of a multi-image gallery */
  galleryGroupId?: string;
  /** Whether personalized image is currently displayed on the page */
  isPersonalized: boolean;
}

export interface ProductGroup {
  productId: string;
  images: ProductImageMeta[];
}

export interface SessionResponse {
  sessionId: string;
  expiresAt: string;
}

export interface UploadResponse {
  uploadId: string;
  userImageUrl: string;
  faceDetected: boolean;
}

export interface TryOnRequest {
  userImageId: string;
  userImageUrl: string;
  productImageUrls: string[];
  productId: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface TryOnResultItem {
  originalUrl: string;
  personalizedUrl: string;
  productId: string;
  label?: string;
}

export interface TryOnJobResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  currentStep?: string;
  results?: TryOnResultItem[];
  error?: string;
}

export interface TryOnResult {
  jobId: string;
  results: TryOnResultItem[];
  userImageUrl: string;
  productId: string;
}

export interface SDKEventMap {
  'init': { config: SDKConfig };
  'scan:complete': { count: number; images: ProductImageMeta[] };
  'image:discovered': { imageMeta: ProductImageMeta };
  'button:click': { imageMeta: ProductImageMeta };
  'modal:open': { imageMeta: ProductImageMeta };
  'modal:close': void;
  'upload:start': void;
  'upload:success': { userImageUrl: string; file: File | Blob };
  'upload:error': { error: string };
  'tryon:start': { imageMeta: ProductImageMeta };
  'tryon:progress': { progress: number; step: string };
  'tryon:complete': { result: TryOnResult };
  'tryon:error': { error: string };
  'result:applied': { imageMeta: ProductImageMeta; personalizedUrl: string };
  'result:reverted': { imageMeta: ProductImageMeta };
}

export type EventCallback<T> = (data: T) => void;
