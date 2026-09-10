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
 * Real HTTP API Client for connecting to production backend endpoints
 */
export class HttpApiClient implements ITryOnApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async createSession(siteKey: string): Promise<SessionResponse> {
    const res = await fetch(`${this.baseUrl}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Key': siteKey,
      },
    });
    if (!res.ok) throw new Error(`Failed to create session: ${res.statusText}`);
    return res.json();
  }

  async uploadUserPhoto(sessionId: string, file: Blob): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('sessionId', sessionId);

    const res = await fetch(`${this.baseUrl}/v1/uploads`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  }

  async startTryOnJob(sessionId: string, request: TryOnRequest): Promise<TryOnJobResponse> {
    const res = await fetch(`${this.baseUrl}/v1/tryon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...request }),
    });
    if (!res.ok) throw new Error(`Failed to start try-on: ${res.statusText}`);
    return res.json();
  }

  async getTryOnJob(jobId: string): Promise<TryOnJobResponse> {
    const res = await fetch(`${this.baseUrl}/v1/tryon/${jobId}`);
    if (!res.ok) throw new Error(`Failed to fetch job status: ${res.statusText}`);
    return res.json();
  }

  async pollTryOnJob(
    jobId: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<TryOnResult> {
    const maxAttempts = 60;
    const intervalMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getTryOnJob(jobId);

      if (onProgress) {
        onProgress(status.progress || 10, status.currentStep || 'Processing...');
      }

      if (status.status === 'completed' && status.results) {
        return {
          jobId,
          results: status.results,
          userImageUrl: '',
          productId: '',
        };
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'AI Try-On processing failed');
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error('Try-On request timed out');
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
