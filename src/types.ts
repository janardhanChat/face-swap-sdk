/**
 * Jewellery AI Try-On SDK Types
 */

export type ButtonPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'bottom-center'
  | 'top-center'
  | 'center'
  | 'inline';

export type ButtonTheme =
  | 'gold'
  | 'dark'
  | 'light'
  | 'glass'
  | 'emerald'
  | 'rose'
  | 'ocean'
  | 'minimal'
  | 'custom';

export interface ButtonCustomStyle {
  /** Background color or gradient (e.g. '#2563eb' or 'linear-gradient(135deg, #1e3a8a, #3b82f6)') */
  background?: string;
  /** Text color (e.g. '#ffffff') */
  color?: string;
  /** Border style or color (e.g. '1px solid #3b82f6' or 'none') */
  border?: string;
  /** Border radius in px or % (e.g. '30px', '8px', '4px', '0px') */
  borderRadius?: string;
  /** Hover background color or gradient */
  hoverBackground?: string;
  /** Hover text color */
  hoverColor?: string;
  /** Hover border style or color */
  hoverBorder?: string;
  /** Box shadow or glow (e.g. '0 4px 20px rgba(0, 0, 0, 0.25)') */
  boxShadow?: string;
  /** Hover box shadow (e.g. '0 6px 24px rgba(37, 99, 235, 0.4)') */
  hoverBoxShadow?: string;
  /** Font family (e.g. 'Montserrat, sans-serif' or 'inherit') */
  fontFamily?: string;
  /** Font size in px or em (e.g. '13px', '14px') */
  fontSize?: string;
  /** Font weight (e.g. '500', '600', '700') */
  fontWeight?: string | number;
  /** Letter spacing (e.g. '0.5px', 'normal') */
  letterSpacing?: string;
  /** Button padding (e.g. '7px 14px', '8px 16px') */
  padding?: string;
  /** Backdrop filter blur (e.g. 'blur(10px)' or 'none') */
  backdropFilter?: string;
  /** Custom icon or emoji (e.g. '✨', '💎', 'none', or false to disable) */
  icon?: string | boolean;
  /** Shimmer animation overlay (true | false) */
  shimmer?: boolean;
  /** Custom offset horizontal from edge in px (e.g. '12px') */
  offsetX?: string;
  /** Custom offset vertical from edge in px (e.g. '12px') */
  offsetY?: string;
  /** Custom raw CSS rules injected inside Shadow DOM */
  customCss?: string;
}

export interface SDKConfig {
  /** Merchant Site Key (e.g. pk_test_xxx) */
  siteKey: string;
  /** Backend API Base URL */
  apiUrl: string;
  /** Text displayed on the Try-On button */
  buttonText: string;
  /** Icon displayed on the Try-On button (e.g. '✨', '💎', 'none') */
  buttonIcon?: string | boolean;
  /** Positioning of the Try-On button overlay */
  buttonPosition: ButtonPosition;
  /** Theme styling for the button */
  buttonTheme: ButtonTheme;
  /** Granular custom styling for button */
  buttonStyle?: ButtonCustomStyle;
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
  userFile?: Blob;
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
