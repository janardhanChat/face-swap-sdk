/**
 * Backend API Client & Mock Client for Jewellery AI Try-On
 */

import { getConfig } from './config';
import {
  SessionResponse,
  TryOnJobResponse,
  TryOnRequest,
  TryOnResult,
  TryOnResultItem,
  UploadResponse,
} from './types';

export interface ITryOnApiClient {
  createSession(siteKey: string): Promise<SessionResponse>;
  uploadUserPhoto(sessionId: string, file: Blob): Promise<UploadResponse>;
  startTryOnJob(sessionId: string, request: TryOnRequest): Promise<TryOnJobResponse>;
  getTryOnJob(jobId: string): Promise<TryOnJobResponse>;
  pollTryOnJob(
    jobId: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<TryOnResult>;
}

/**
 * Mock API Client for testing and prototype demonstration
 */
export class MockApiClient implements ITryOnApiClient {
  private activeJobs = new Map<string, { request: TryOnRequest; startTime: number }>();

  // Curated realistic mock personalized jewellery try-on results
  private mockPersonalizedPool = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
  ];

  async createSession(siteKey: string): Promise<SessionResponse> {
    await this.delay(200);
    return {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async uploadUserPhoto(sessionId: string, file: Blob): Promise<UploadResponse> {
    await this.delay(500);
    return {
      uploadId: `up_${Date.now()}`,
      userImageUrl: URL.createObjectURL(file),
      faceDetected: true,
    };
  }

  async startTryOnJob(sessionId: string, request: TryOnRequest): Promise<TryOnJobResponse> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.activeJobs.set(jobId, { request, startTime: Date.now() });

    await this.delay(150);
    return {
      jobId,
      status: 'processing',
      progress: 5,
      currentStep: 'Initializing AI Face Model...',
    };
  }

  async getTryOnJob(jobId: string): Promise<TryOnJobResponse> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return {
      jobId,
      status: 'completed',
      progress: 100,
      currentStep: 'Complete',
    };
  }

  async pollTryOnJob(
    jobId: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<TryOnResult> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const steps = [
      { progress: 20, step: 'Detecting facial landmarks & head pose...', duration: 550 },
      { progress: 48, step: 'Matching model skin tone & studio lighting...', duration: 700 },
      { progress: 75, step: 'Seamlessly blending jewellery & contours...', duration: 650 },
      { progress: 92, step: 'Applying photorealistic AI refinement...', duration: 500 },
      { progress: 100, step: 'Personalized Try-On ready!', duration: 250 },
    ];

    for (const s of steps) {
      if (onProgress) {
        onProgress(s.progress, s.step);
      }
      await this.delay(s.duration);
    }

    // Generate personalized result items for all product images
    const results: TryOnResultItem[] = job.request.productImageUrls.map((url, index) => {
      // In mock mode, if user uploaded a photo, we can generate a personalized result
      // Or use the user photo / curated personalized image
      const mockResultImg = this.mockPersonalizedPool[index % this.mockPersonalizedPool.length];
      return {
        originalUrl: url,
        // If user photo is a valid data URL/object URL, we can present it, or use mock pool
        personalizedUrl: job.request.userImageUrl || mockResultImg,
        productId: job.request.productId,
        label: `View ${index + 1}`,
      };
    });

    return {
      jobId,
      results,
      userImageUrl: job.request.userImageUrl,
      productId: job.request.productId,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Helper to convert image URL, Data URL, or Blob URL into a Blob
 */
async function fetchImageBlob(url: string): Promise<Blob> {
  // 1. Base64 / Data URL
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // 2. Blob URL
  if (url.startsWith('blob:')) {
    const res = await fetch(url);
    return await res.blob();
  }

  // 3. Direct fetch (handles standard CORS)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch (_) {
    // Continue to canvas fallback
  }

  // 4. HTML Canvas fallback
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to convert canvas to blob for ${url}`));
          }
        }, 'image/jpeg', 0.95);
      } catch (err: any) {
        reject(new Error(`Failed to extract image pixels: ${err.message || err}`));
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image from "${url}"`));
    img.src = url;
  });
}

/**
 * Real HTTP API Client for connecting to production backend endpoints
 */
export class HttpApiClient implements ITryOnApiClient {
  private baseUrl: string;
  private userBlobs = new Map<string, Blob>();
  private activeJobs = new Map<
    string,
    {
      request: TryOnRequest;
      promise: Promise<TryOnResultItem[]>;
      status: TryOnJobResponse;
    }
  >();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Direct Face Swap API Call (POST /swap)
   */
  async swap(source: Blob | string, target: Blob | string): Promise<Blob> {
    const sourceBlob = typeof source === 'string' ? await fetchImageBlob(source) : source;
    const targetBlob = typeof target === 'string' ? await fetchImageBlob(target) : target;

    const formData = new FormData();
    formData.append('source', sourceBlob, 'source.png');
    formData.append('target', targetBlob, 'target.png');

    const res = await fetch(`${this.baseUrl}/swap`, {
      method: 'POST',
      headers: {
        accept: 'application/json, image/*',
      },
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `Face Swap API failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson.message) {
          errMsg = errJson.message;
        }
      } catch (_) {
        const errText = await res.text();
        if (errText) errMsg = errText;
      }
      throw new Error(errMsg);
    }

    return await res.blob();
  }

  async createSession(siteKey: string): Promise<SessionResponse> {
    // Check if backend exposes /v1/sessions or default to local session
    return {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async uploadUserPhoto(sessionId: string, file: Blob): Promise<UploadResponse> {
    const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.userBlobs.set(uploadId, file);
    return {
      uploadId,
      userImageUrl: URL.createObjectURL(file),
      faceDetected: true,
    };
  }

  async startTryOnJob(sessionId: string, request: TryOnRequest): Promise<TryOnJobResponse> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const jobStatus: TryOnJobResponse = {
      jobId,
      status: 'processing',
      progress: 10,
      currentStep: 'Initializing AI Face Model...',
    };

    const runSwap = async (): Promise<TryOnResultItem[]> => {
      // 1. Get Source Face Blob
      let sourceBlob: Blob | undefined = request.userFile || this.userBlobs.get(request.userImageId);
      if (!sourceBlob && request.userImageUrl) {
        sourceBlob = await fetchImageBlob(request.userImageUrl);
      }
      if (!sourceBlob) {
        throw new Error('User source photo could not be retrieved.');
      }

      // 2. Perform Swap on candidate product images
      const results: TryOnResultItem[] = [];
      const total = request.productImageUrls.length;

      for (let i = 0; i < total; i++) {
        const targetUrl = request.productImageUrls[i];
        jobStatus.currentStep = total > 1
          ? `Swapping image ${i + 1} of ${total}...`
          : 'Processing face swap with AI model...';
        jobStatus.progress = Math.min(85, Math.round(15 + (i / total) * 70));

        const targetBlob = await fetchImageBlob(targetUrl);
        const resultBlob = await this.swap(sourceBlob, targetBlob);
        const personalizedUrl = URL.createObjectURL(resultBlob);

        results.push({
          originalUrl: targetUrl,
          personalizedUrl,
          productId: request.productId,
          label: `View ${i + 1}`,
        });
      }

      jobStatus.status = 'completed';
      jobStatus.progress = 100;
      jobStatus.currentStep = 'Personalized Try-On ready!';
      jobStatus.results = results;

      return results;
    };

    const promise = runSwap().catch((err) => {
      jobStatus.status = 'failed';
      jobStatus.error = err.message || 'AI Try-On processing failed';
      throw err;
    });

    this.activeJobs.set(jobId, {
      request,
      promise,
      status: jobStatus,
    });

    return jobStatus;
  }

  async getTryOnJob(jobId: string): Promise<TryOnJobResponse> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    return job.status;
  }

  async pollTryOnJob(
    jobId: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<TryOnResult> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Step simulation while waiting for HTTP response
    let currentPct = 15;
    const progressInterval = setInterval(() => {
      if (currentPct < 90) {
        currentPct += 5;
        const step =
          currentPct < 40
            ? 'Detecting facial landmarks & head pose...'
            : currentPct < 70
            ? 'Matching model skin tone & studio lighting...'
            : 'Applying photorealistic AI refinement...';
        if (onProgress) onProgress(currentPct, step);
      }
    }, 400);

    try {
      const results = await job.promise;
      clearInterval(progressInterval);
      if (onProgress) onProgress(100, 'Personalized Try-On ready!');

      return {
        jobId,
        results,
        userImageUrl: job.request.userImageUrl,
        productId: job.request.productId,
      };
    } catch (err: any) {
      clearInterval(progressInterval);
      throw err;
    }
  }
}

/**
 * Returns API Client singleton instance based on configuration
 */
let apiClientInstance: ITryOnApiClient | null = null;

export function getApiClient(): ITryOnApiClient {
  const config = getConfig();
  if (!apiClientInstance) {
    if (config.mockMode) {
      apiClientInstance = new MockApiClient();
    } else {
      apiClientInstance = new HttpApiClient(config.apiUrl);
    }
  }
  return apiClientInstance;
}

export function resetApiClient(): void {
  apiClientInstance = null;
}
