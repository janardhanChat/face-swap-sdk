/**
 * User Photo Upload, Camera Capture & Validation Service
 */

import { getConfig } from './config';

export interface ValidatedPhoto {
  file: Blob;
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

/**
 * Validates and processes an uploaded photo file
 */
export async function validateAndProcessPhoto(file: File | Blob, customName?: string): Promise<ValidatedPhoto> {
  const config = getConfig();

  // 1. Validate MIME type
  const type = file.type.toLowerCase();
  const isValidFormat = config.supportedFormats.some((fmt) => type.includes(fmt.replace('image/', '')) || type === fmt);

  if (!isValidFormat && type !== '') {
    throw new Error(`Unsupported format "${type}". Please upload a JPG, PNG, or WebP photo.`);
  }

  // 2. Validate File Size
  const maxBytes = config.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is ${config.maxFileSizeMB}MB.`);
  }

  // 3. Convert to Data URL & Verify Decoding / Dimensions
  const dataUrl = await blobToDataUrl(file);
  const dimensions = await getImageDimensions(dataUrl);

  // Minimum dimensions for face swap quality (200x200)
  if (dimensions.width < 200 || dimensions.height < 200) {
    throw new Error(`Photo resolution is too low (${dimensions.width}x${dimensions.height}px). Minimum required is 200x200px.`);
  }

  const name = (file instanceof File && file.name) ? file.name : (customName || `user-photo-${Date.now()}.jpg`);

  return {
    file,
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
    fileName: name,
  };
}

/**
 * Converts a Blob to a base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads an image to extract its pixel dimensions
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => {
      reject(new Error('Failed to decode image. File may be corrupted.'));
    };
    img.src = src;
  });
}

/**
 * Starts a front-facing camera video stream
 */
export async function startCameraStream(videoElement: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera access is not supported by your browser or connection is not secure (HTTPS required).');
  }

  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 1280 },
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;
  await videoElement.play();
  return stream;
}

/**
 * Captures a high-resolution snapshot frame from an active video element
 */
export async function captureCameraSnapshot(videoElement: HTMLVideoElement): Promise<ValidatedPhoto> {
  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context could not be created.');
  }

  // Draw mirrored image for natural selfie feel
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const blob = dataUrlToBlob(dataUrl);

  return {
    file: blob,
    dataUrl,
    width,
    height,
    fileName: `selfie-${Date.now()}.jpg`,
  };
}

/**
 * Stops an active MediaStream
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

/**
 * Converts a base64 Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
