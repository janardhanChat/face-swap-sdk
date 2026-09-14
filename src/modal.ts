/**
 * Jewellery AI Try-On Modal Component (Shadow DOM)
 * Luxury 5-stage UI with Drag-Drop, Webcam Selfie, AI Processing, Before/After Slider & Gallery.
 */

import { getApiClient } from './api';
import { getConfig } from './config';
import { events } from './events';
import { getImagesByProduct } from './scanner';
import { ProductImageMeta, TryOnResult, TryOnResultItem } from './types';
import {
  captureCameraSnapshot,
  startCameraStream,
  stopCameraStream,
  validateAndProcessPhoto,
  ValidatedPhoto,
} from './upload';

type ModalView = 'upload' | 'preview' | 'processing' | 'result' | 'error';

class ModalManager {
  private container: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private isOpen = false;
  private currentView: ModalView = 'upload';
  private currentImageMeta: ProductImageMeta | null = null;
  private userPhoto: ValidatedPhoto | null = null;
  private activeCameraStream: MediaStream | null = null;
  private isCameraMode = false;
  private tryOnResult: TryOnResult | null = null;
  private activeGalleryIndex = 0;
  private errorMessage = '';
  private beforeAfterSliderPos = 50; // percentage for slider
  private activeTab: 'slider' | 'toggle' = 'slider';
  private toggleState: 'original' | 'personalized' = 'personalized';

  // Demo avatar photos for instant frictionless testing
  private demoFaces = [
    {
      name: 'Emma',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Sophia',
      url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Aria',
      url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Elena',
      url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    },
  ];

  /**
   * Initializes the Modal DOM container and Shadow Root
   */
  public init(): void {
    if (this.container || typeof document === 'undefined') return;

    this.container = document.createElement('div');
    this.container.id = 'tryon-sdk-modal-root';
    this.shadow = this.container.attachShadow({ mode: 'open' });

    document.body.appendChild(this.container);

    // Global keyboard listener for Esc key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Opens modal for a specific jewellery product image
   */
  public open(imageMeta: ProductImageMeta): void {
    this.init();
    this.currentImageMeta = imageMeta;
    this.isOpen = true;
    this.activeGalleryIndex = 0;
    this.currentView = 'upload';
    this.isCameraMode = false;

    this.render();
    events.emit('modal:open', { imageMeta });
  }

  /**
   * Closes the modal and resets camera if active
   */
  public close(): void {
    if (!this.isOpen) return;

    this.stopCamera();
    this.isOpen = false;
    this.render();
    events.emit('modal:close', undefined as unknown as void);
  }

  private stopCamera(): void {
    if (this.activeCameraStream) {
      stopCameraStream(this.activeCameraStream);
      this.activeCameraStream = null;
    }
    this.isCameraMode = false;
  }

  /**
   * Main render method that builds Shadow DOM HTML and CSS
   */
  private render(): void {
    if (!this.shadow) return;

    if (!this.isOpen) {
      this.shadow.innerHTML = '';
      return;
    }

    this.shadow.innerHTML = `
      <style>${this.getModalStyles()}</style>
      <div class="modal-backdrop ${this.isOpen ? 'active' : ''}">
        <div class="modal-dialog">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-brand">
              <span class="brand-sparkle">✨</span>
              <div class="header-titles">
                <h3>Virtual Jewellery Try-On</h3>
                <span class="header-subtitle">${this.currentImageMeta?.alt || 'AI-Powered Personalization'}</span>
              </div>
            </div>
            <button class="btn-close" id="btn-modal-close" aria-label="Close modal">&times;</button>
          </div>

          <!-- Body Content -->
          <div class="modal-body">
            ${this.renderBodyContent()}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Renders the view based on current state
   */
  private renderBodyContent(): string {
    switch (this.currentView) {
      case 'upload':
        return this.renderUploadView();
      case 'preview':
        return this.renderPreviewView();
      case 'processing':
        return this.renderProcessingView();
      case 'result':
        return this.renderResultView();
      case 'error':
        return this.renderErrorView();
    }
  }

  /**
   * Stage 1: Upload View (Dropzone, Camera Selfie, Demo Faces)
   */
  private renderUploadView(): string {
    if (this.isCameraMode) {
      return `
        <div class="camera-container">
          <div class="camera-feed-wrapper">
            <video id="camera-video" autoplay playsinline muted></video>
            <div class="camera-guide-oval">
              <span class="guide-text">Align your face inside the oval</span>
            </div>
          </div>
          <div class="camera-actions">
            <button class="btn-secondary" id="btn-cancel-camera">Back to Upload</button>
            <button class="btn-primary" id="btn-snap-photo">📸 Capture Selfie</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="upload-view">
        <!-- Target Jewellery Thumbnail -->
        <div class="target-product-banner">
          <img src="${this.currentImageMeta?.originalSrc}" alt="Target jewellery" class="product-thumb-mini" />
          <div class="target-meta">
            <span class="badge-target">Selected Item</span>
            <strong>${this.currentImageMeta?.alt || 'Jewellery Model'}</strong>
          </div>
        </div>

        <!-- Drag & Drop Zone -->
        <div class="dropzone" id="file-dropzone">
          <input type="file" id="file-input" accept="image/jpeg,image/png,image/webp" style="display:none;" />
          <div class="dropzone-icon">📷</div>
          <h4>Upload your selfie or portrait</h4>
          <p>Drag and drop image here, or <button type="button" class="link-btn" id="btn-browse-file">browse files</button></p>
          <span class="format-note">Supports JPG, PNG, WebP (up to 10MB)</span>
        </div>

        <div class="or-divider"><span>OR</span></div>

        <!-- Camera Button -->
        <button class="btn-camera" id="btn-open-camera">
          <span class="btn-icon">📸</span> Take Photo with Camera
        </button>

        <!-- Demo Avatars for instant 1-click test -->
        <div class="demo-faces-section">
          <span class="demo-title">⚡ Quick Test with Demo Faces:</span>
          <div class="demo-faces-grid">
            ${this.demoFaces
              .map(
                (f, idx) => `
              <div class="demo-face-card" data-face-idx="${idx}">
                <img src="${f.url}" alt="${f.name}" />
                <span>${f.name}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Tips Section -->
        <div class="tips-box">
          <strong>💡 Tips for best results:</strong>
          <ul>
            <li>Front-facing photo with good natural lighting</li>
            <li>Face and neck clearly visible without obstruction</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Stage 2: Preview View (User Photo vs Model Jewellery)
   */
  private renderPreviewView(): string {
    return `
      <div class="preview-view">
        <div class="preview-comparison-grid">
          <div class="preview-card">
            <span class="preview-label">Your Photo</span>
            <div class="preview-img-wrapper">
              <img src="${this.userPhoto?.dataUrl}" alt="Your photo" class="preview-img" />
            </div>
          </div>
          <div class="preview-plus">➕</div>
          <div class="preview-card">
            <span class="preview-label">Jewellery Model</span>
            <div class="preview-img-wrapper">
              <img src="${this.currentImageMeta?.originalSrc}" alt="Target Jewellery" class="preview-img" />
            </div>
          </div>
        </div>

        <div class="preview-prompt">
          <span class="sparkle-bullet">✨</span>
          <p>AI will swap the model's face with your selfie while seamlessly preserving the jewelry, lighting, body and background.</p>
        </div>

        <div class="modal-footer-actions">
          <button class="btn-secondary" id="btn-change-photo">Change Photo</button>
          <button class="btn-primary btn-gold-gradient" id="btn-generate-tryon">
            ✨ Generate Try-On
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Stage 3: Processing View (AI Loader & Progress Bar)
   */
  private renderProcessingView(): string {
    return `
      <div class="processing-view">
        <div class="ai-orb-loader">
          <div class="orb-ring ring-1"></div>
          <div class="orb-ring ring-2"></div>
          <div class="orb-ring ring-3"></div>
          <div class="orb-center">✨</div>
        </div>

        <h4 id="proc-title">Creating Your Personalized Try-On</h4>
        <p id="proc-step-text" class="proc-step">Detecting facial landmarks & geometry...</p>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="proc-progress-fill" style="width: 20%;"></div>
        </div>
        <span id="proc-pct-text" class="pct-text">20%</span>
      </div>
    `;
  }

  /**
   * Stage 4: Result View (Before/After Comparison & Gallery)
   */
  private renderResultView(): string {
    if (!this.tryOnResult || this.tryOnResult.results.length === 0) {
      return `<p>No results available.</p>`;
    }

    const currentItem: TryOnResultItem =
      this.tryOnResult.results[this.activeGalleryIndex] || this.tryOnResult.results[0];

    const hasMultiImages = this.tryOnResult.results.length > 1;

    return `
      <div class="result-view">
        <!-- View Mode Switcher -->
        <div class="view-controls">
          <div class="toggle-pill-group">
            <button class="pill-btn ${this.activeTab === 'slider' ? 'active' : ''}" id="tab-slider">Split Slider</button>
            <button class="pill-btn ${this.activeTab === 'toggle' ? 'active' : ''}" id="tab-toggle">Side Toggle</button>
          </div>
          ${
            this.activeTab === 'toggle'
              ? `
            <div class="toggle-side-btns">
              <button class="toggle-side-btn ${this.toggleState === 'original' ? 'active' : ''}" id="btn-show-orig">Original</button>
              <button class="toggle-side-btn ${this.toggleState === 'personalized' ? 'active' : ''}" id="btn-show-pers">✨ Try-On</button>
            </div>
          `
              : ''
          }
        </div>

        <!-- Interactive Comparison Canvas -->
        <div class="comparison-stage">
          ${
            this.activeTab === 'slider'
              ? `
            <div class="slider-container" id="before-after-slider">
              <img src="${currentItem.originalUrl}" alt="Original" class="slider-img img-before" />
              <div class="slider-clip-after" style="clip-path: inset(0 0 0 ${this.beforeAfterSliderPos}%);">
                <img src="${currentItem.personalizedUrl}" alt="Personalized" class="slider-img img-after" />
              </div>
              <div class="slider-handle" style="left: ${this.beforeAfterSliderPos}%;">
                <div class="handle-line"></div>
                <div class="handle-circle">↔</div>
              </div>
              <span class="badge-tag tag-left">Original</span>
              <span class="badge-tag tag-right">✨ Personalized</span>
            </div>
          `
              : `
            <div class="single-view-container">
              <img src="${this.toggleState === 'original' ? currentItem.originalUrl : currentItem.personalizedUrl}" 
                   alt="Result view" class="single-view-img" />
              <span class="badge-tag tag-center">${this.toggleState === 'original' ? 'Original Model' : '✨ Your Try-On'}</span>
            </div>
          `
          }
        </div>

        <!-- Multi-Image Product Gallery Carousel -->
        ${
          hasMultiImages
            ? `
          <div class="multi-gallery-section">
            <span class="gallery-title">Product Angles (${this.tryOnResult.results.length} views generated):</span>
            <div class="gallery-thumbs-row">
              ${this.tryOnResult.results
                .map(
                  (res, idx) => `
                <div class="gallery-thumb-card ${idx === this.activeGalleryIndex ? 'active' : ''}" data-gallery-idx="${idx}">
                  <img src="${res.personalizedUrl}" alt="View ${idx + 1}" />
                  <span>${res.label || `Angle ${idx + 1}`}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Actions -->
        <div class="result-actions-bar">
          <button class="btn-secondary" id="btn-try-another">🔄 Try Another Photo</button>
          <a href="${currentItem.personalizedUrl}" download="jewellery-tryon-${Date.now()}.jpg" target="_blank" class="btn-secondary" id="btn-download">
            📥 Download
          </a>
          <button class="btn-primary btn-gold-gradient" id="btn-apply-to-page">
            ✨ Apply to Page
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Stage 5: Error View
   */
  private renderErrorView(): string {
    return `
      <div class="error-view">
        <div class="error-icon">⚠️</div>
        <h4>Something went wrong</h4>
        <p class="error-msg-text">${this.errorMessage || 'An error occurred during Try-On processing. Please try again.'}</p>
        <div class="modal-footer-actions">
          <button class="btn-primary" id="btn-error-retry">Try Again</button>
        </div>
      </div>
    `;
  }

  /**
   * Wire up DOM event listeners inside Shadow DOM
   */
  private attachEventListeners(): void {
    if (!this.shadow) return;

    // Close button
    const closeBtn = this.shadow.getElementById('btn-modal-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Backdrop click close
    const backdrop = this.shadow.querySelector('.modal-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    if (this.currentView === 'upload') {
      this.attachUploadListeners();
    } else if (this.currentView === 'preview') {
      this.attachPreviewListeners();
    } else if (this.currentView === 'result') {
      this.attachResultListeners();
    } else if (this.currentView === 'error') {
      const retryBtn = this.shadow.getElementById('btn-error-retry');
      retryBtn?.addEventListener('click', () => {
        this.currentView = 'upload';
        this.render();
      });
    }
  }

  /**
   * Upload View Event Listeners (Dropzone, File, Camera, Demo Faces)
   */
  private attachUploadListeners(): void {
    if (!this.shadow) return;

    // Dropzone & File Input
    const dropzone = this.shadow.getElementById('file-dropzone');
    const fileInput = this.shadow.getElementById('file-input') as HTMLInputElement | null;
    const browseBtn = this.shadow.getElementById('btn-browse-file');

    browseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput?.click();
    });

    dropzone?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files[0]) {
        await this.handleSelectedFile(fileInput.files[0]);
      }
    });

    // Drag & Drop
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone?.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        await this.handleSelectedFile(e.dataTransfer.files[0]);
      }
    });

    // Camera Mode triggers
    const openCamBtn = this.shadow.getElementById('btn-open-camera');
    openCamBtn?.addEventListener('click', async () => {
      this.isCameraMode = true;
      this.render();
      const video = this.shadow?.getElementById('camera-video') as HTMLVideoElement | null;
      if (video) {
        try {
          this.activeCameraStream = await startCameraStream(video);
        } catch (err: any) {
          alert(err.message || 'Could not access camera');
          this.isCameraMode = false;
          this.render();
        }
      }
    });

    const cancelCamBtn = this.shadow.getElementById('btn-cancel-camera');
    cancelCamBtn?.addEventListener('click', () => {
      this.stopCamera();
      this.render();
    });

    const snapBtn = this.shadow.getElementById('btn-snap-photo');
    snapBtn?.addEventListener('click', async () => {
      const video = this.shadow?.getElementById('camera-video') as HTMLVideoElement | null;
      if (video) {
        try {
          const photo = await captureCameraSnapshot(video);
          this.stopCamera();
          this.userPhoto = photo;
          this.currentView = 'preview';
          this.render();
          events.emit('upload:success', { userImageUrl: photo.dataUrl, file: photo.file });
        } catch (err: any) {
          alert('Failed to capture photo: ' + err.message);
        }
      }
    });

    // Demo Faces
    const demoCards = this.shadow.querySelectorAll('.demo-face-card');
    demoCards.forEach((card) => {
      card.addEventListener('click', async () => {
        const idx = parseInt(card.getAttribute('data-face-idx') || '0', 10);
        const face = this.demoFaces[idx];
        if (face) {
          // Fetch demo face as blob
          try {
            const res = await fetch(face.url);
            const blob = await res.blob();
            this.userPhoto = await validateAndProcessPhoto(blob, `${face.name}.jpg`);
            this.currentView = 'preview';
            this.render();
            events.emit('upload:success', { userImageUrl: this.userPhoto.dataUrl, file: this.userPhoto.file });
          } catch {
            this.userPhoto = {
              file: new Blob(),
              dataUrl: face.url,
              width: 400,
              height: 400,
              fileName: `${face.name}.jpg`,
            };
            this.currentView = 'preview';
            this.render();
          }
        }
      });
    });
  }

  private async handleSelectedFile(file: File): Promise<void> {
    try {
      events.emit('upload:start', undefined as unknown as void);
      const validated = await validateAndProcessPhoto(file);
      this.userPhoto = validated;
      this.currentView = 'preview';
      this.render();
      events.emit('upload:success', { userImageUrl: validated.dataUrl, file: validated.file });
    } catch (err: any) {
      events.emit('upload:error', { error: err.message || 'File validation failed' });
      alert(err.message || 'Invalid image file.');
    }
  }

  /**
   * Preview View Event Listeners
   */
  private attachPreviewListeners(): void {
    if (!this.shadow) return;

    const changeBtn = this.shadow.getElementById('btn-change-photo');
    changeBtn?.addEventListener('click', () => {
      this.currentView = 'upload';
      this.render();
    });

    const generateBtn = this.shadow.getElementById('btn-generate-tryon');
    generateBtn?.addEventListener('click', async () => {
      await this.runTryOnPipeline();
    });
  }

  /**
   * Runs the complete Try-On Pipeline (API Session -> Upload -> Poll Job -> Show Result)
   */
  private async runTryOnPipeline(): Promise<void> {
    if (!this.currentImageMeta || !this.userPhoto) return;

    this.currentView = 'processing';
    this.render();

    const config = getConfig();
    const api = getApiClient();

    events.emit('tryon:start', { imageMeta: this.currentImageMeta });

    try {
      // 1. Create Session
      const session = await api.createSession(config.siteKey);

      // 2. Upload User Photo
      const upload = await api.uploadUserPhoto(session.sessionId, this.userPhoto.file);

      // 3. Find all candidate images for this product (handles multi-image try-on)
      const productImages = getImagesByProduct(this.currentImageMeta.productId);
      const imageUrls =
        productImages.length > 0
          ? productImages.map((m) => m.originalSrc)
          : [this.currentImageMeta.originalSrc];

      // 4. Start Try-On Job
      const job = await api.startTryOnJob(session.sessionId, {
        userImageId: upload.uploadId,
        userImageUrl: this.userPhoto.dataUrl,
        productImageUrls: imageUrls,
        productId: this.currentImageMeta.productId,
        userFile: this.userPhoto.file,
      });

      // 5. Poll Job with progress callbacks
      const result = await api.pollTryOnJob(job.jobId, (pct, step) => {
        events.emit('tryon:progress', { progress: pct, step });
        this.updateProcessingProgress(pct, step);
      });

      this.tryOnResult = result;
      this.currentView = 'result';
      this.render();

      events.emit('tryon:complete', { result });
    } catch (err: any) {
      this.errorMessage = err.message || 'AI Try-On processing failed. Please try again.';
      this.currentView = 'error';
      this.render();
      events.emit('tryon:error', { error: this.errorMessage });
    }
  }

  /**
   * Updates progress bar without full re-render
   */
  private updateProcessingProgress(pct: number, step: string): void {
    if (!this.shadow) return;
    const bar = this.shadow.getElementById('proc-progress-fill');
    const pctText = this.shadow.getElementById('proc-pct-text');
    const stepText = this.shadow.getElementById('proc-step-text');

    if (bar) bar.style.width = `${pct}%`;
    if (pctText) pctText.textContent = `${pct}%`;
    if (stepText) stepText.textContent = step;
  }

  /**
   * Result View Event Listeners (Slider, Gallery, Apply to Page)
   */
  private attachResultListeners(): void {
    if (!this.shadow) return;

    // View tab buttons
    const tabSlider = this.shadow.getElementById('tab-slider');
    const tabToggle = this.shadow.getElementById('tab-toggle');

    tabSlider?.addEventListener('click', () => {
      this.activeTab = 'slider';
      this.render();
    });

    tabToggle?.addEventListener('click', () => {
      this.activeTab = 'toggle';
      this.render();
    });

    // Side toggle buttons
    const btnOrig = this.shadow.getElementById('btn-show-orig');
    const btnPers = this.shadow.getElementById('btn-show-pers');

    btnOrig?.addEventListener('click', () => {
      this.toggleState = 'original';
      this.render();
    });

    btnPers?.addEventListener('click', () => {
      this.toggleState = 'personalized';
      this.render();
    });

    // Interactive slider mouse/touch drag
    const sliderContainer = this.shadow.getElementById('before-after-slider');
    if (sliderContainer) {
      let isDragging = false;

      const updateSlider = (clientX: number) => {
        const rect = sliderContainer.getBoundingClientRect();
        let x = clientX - rect.left;
        if (x < 0) x = 0;
        if (x > rect.width) x = rect.width;
        this.beforeAfterSliderPos = (x / rect.width) * 100;

        const clipEl = this.shadow?.querySelector('.slider-clip-after') as HTMLElement | null;
        const handleEl = this.shadow?.querySelector('.slider-handle') as HTMLElement | null;
        if (clipEl) clipEl.style.clipPath = `inset(0 0 0 ${this.beforeAfterSliderPos}%)`;
        if (handleEl) handleEl.style.left = `${this.beforeAfterSliderPos}%`;
      };

      sliderContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateSlider(e.clientX);
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) updateSlider(e.clientX);
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Touch support
      sliderContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          isDragging = true;
          updateSlider(e.touches[0].clientX);
        }
      });

      sliderContainer.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length > 0) {
          updateSlider(e.touches[0].clientX);
        }
      });

      sliderContainer.addEventListener('touchend', () => {
        isDragging = false;
      });
    }

    // Gallery Angle switcher
    const galleryThumbs = this.shadow.querySelectorAll('.gallery-thumb-card');
    galleryThumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const idx = parseInt(thumb.getAttribute('data-gallery-idx') || '0', 10);
        this.activeGalleryIndex = idx;
        this.render();
      });
    });

    // Try Another Photo
    const tryAnotherBtn = this.shadow.getElementById('btn-try-another');
    tryAnotherBtn?.addEventListener('click', () => {
      this.currentView = 'upload';
      this.render();
    });

    // Apply to Page
    const applyBtn = this.shadow.getElementById('btn-apply-to-page');
    applyBtn?.addEventListener('click', () => {
      if (this.currentImageMeta && this.tryOnResult) {
        const currentItem = this.tryOnResult.results[this.activeGalleryIndex] || this.tryOnResult.results[0];
        events.emit('result:applied', {
          imageMeta: this.currentImageMeta,
          personalizedUrl: currentItem.personalizedUrl,
        });
        this.close();
      }
    });
  }

  /**
   * Encapsulated Shadow DOM Styles
   */
  private getModalStyles(): string {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(8, 8, 10, 0.78);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .modal-backdrop.active {
        opacity: 1;
        pointer-events: auto;
      }

      .modal-dialog {
        background: #121216;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 20px;
        width: 100%;
        max-width: 580px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(212, 175, 55, 0.15);
        transform: scale(0.94) translateY(12px);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        color: #f3f3f3;
      }

      .modal-backdrop.active .modal-dialog {
        transform: scale(1) translateY(0);
      }

      /* Header */
      .modal-header {
        padding: 18px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(20, 20, 26, 0.6);
      }

      .header-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-sparkle {
        font-size: 24px;
        filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.8));
      }

      .header-titles h3 {
        font-size: 17px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.2px;
      }

      .header-subtitle {
        font-size: 12px;
        color: #a0a0aa;
      }

      .btn-close {
        background: transparent;
        border: none;
        color: #999;
        font-size: 28px;
        cursor: pointer;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 8px;
        transition: color 0.2s, background 0.2s;
      }

      .btn-close:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      /* Body */
      .modal-body {
        padding: 24px;
        overflow-y: auto;
      }

      /* Target Product Banner */
      .target-product-banner {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        margin-bottom: 20px;
      }

      .product-thumb-mini {
        width: 46px;
        height: 46px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid rgba(212, 175, 55, 0.4);
      }

      .target-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .badge-target {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #d4af37;
        font-weight: 700;
      }

      .target-meta strong {
        font-size: 13px;
        color: #e5e5e5;
      }

      /* Dropzone */
      .dropzone {
        border: 2px dashed rgba(212, 175, 55, 0.4);
        background: rgba(255, 255, 255, 0.02);
        border-radius: 16px;
        padding: 32px 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .dropzone:hover, .dropzone.dragover {
        border-color: #d4af37;
        background: rgba(212, 175, 55, 0.06);
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.15);
      }

      .dropzone-icon {
        font-size: 36px;
        margin-bottom: 8px;
      }

      .dropzone h4 {
        font-size: 15px;
        font-weight: 600;
        color: #f5f5f5;
        margin-bottom: 4px;
      }

      .dropzone p {
        font-size: 13px;
        color: #a0a0aa;
        margin-bottom: 8px;
      }

      .link-btn {
        background: none;
        border: none;
        color: #d4af37;
        font-weight: 600;
        text-decoration: underline;
        cursor: pointer;
        padding: 0;
      }

      .format-note {
        font-size: 11px;
        color: #666;
      }

      .or-divider {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 18px 0;
        color: #555;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 1px;
      }

      .or-divider::before, .or-divider::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .or-divider span {
        padding: 0 10px;
      }

      .btn-camera {
        width: 100%;
        padding: 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
      }

      .btn-camera:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.3);
      }

      /* Demo Faces */
      .demo-faces-section {
        margin-top: 20px;
      }

      .demo-title {
        font-size: 12px;
        color: #aaa;
        font-weight: 600;
        display: block;
        margin-bottom: 10px;
      }

      .demo-faces-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .demo-face-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 6px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .demo-face-card:hover {
        border-color: #d4af37;
        transform: translateY(-2px);
        background: rgba(212, 175, 55, 0.1);
      }

      .demo-face-card img {
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 6px;
      }

      .demo-face-card span {
        font-size: 11px;
        color: #ccc;
        margin-top: 4px;
        display: block;
      }

      .tips-box {
        margin-top: 18px;
        padding: 12px 16px;
        background: rgba(212, 175, 55, 0.05);
        border-left: 3px solid #d4af37;
        border-radius: 6px;
        font-size: 12px;
        color: #b5b5b5;
      }

      .tips-box strong {
        color: #e5c365;
      }

      .tips-box ul {
        margin-top: 4px;
        padding-left: 18px;
      }

      /* Camera Mode View */
      .camera-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .camera-feed-wrapper {
        position: relative;
        width: 100%;
        max-width: 440px;
        aspect-ratio: 4 / 3;
        border-radius: 16px;
        overflow: hidden;
        background: #000;
        border: 1px solid rgba(212, 175, 55, 0.4);
      }

      #camera-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scaleX(-1);
      }

      .camera-guide-oval {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 55%;
        height: 75%;
        border: 2px dashed rgba(212, 175, 55, 0.7);
        border-radius: 50%;
        pointer-events: none;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 12px;
      }

      .guide-text {
        font-size: 11px;
        background: rgba(0, 0, 0, 0.6);
        padding: 2px 8px;
        border-radius: 10px;
        color: #f1f1f1;
      }

      .camera-actions {
        display: flex;
        gap: 12px;
        width: 100%;
        max-width: 440px;
      }

      /* Preview View */
      .preview-view {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .preview-comparison-grid {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }

      .preview-card {
        flex: 1;
        text-align: center;
      }

      .preview-label {
        font-size: 12px;
        font-weight: 600;
        color: #aaa;
        margin-bottom: 6px;
        display: block;
      }

      .preview-img-wrapper {
        width: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: #09090b;
      }

      .preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .preview-plus {
        font-size: 24px;
        color: #d4af37;
      }

      .preview-prompt {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 12px;
        font-size: 13px;
        color: #ccc;
        line-height: 1.4;
      }

      /* Processing View */
      .processing-view {
        padding: 40px 20px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .ai-orb-loader {
        position: relative;
        width: 100px;
        height: 100px;
        margin-bottom: 24px;
      }

      .orb-ring {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid transparent;
      }

      .ring-1 {
        border-top-color: #d4af37;
        animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      }

      .ring-2 {
        border-right-color: #f5d76e;
        animation: spin 1.8s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse;
      }

      .ring-3 {
        border-bottom-color: #ffd700;
        animation: spin 2.4s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      }

      .orb-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 28px;
        animation: pulse 1.5s infinite ease-in-out;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
      }

      .proc-step {
        font-size: 13px;
        color: #d4af37;
        margin-top: 6px;
        margin-bottom: 20px;
        min-height: 20px;
      }

      .progress-bar-container {
        width: 100%;
        max-width: 320px;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #d4af37, #ffd700);
        border-radius: 10px;
        transition: width 0.3s ease;
      }

      .pct-text {
        font-size: 12px;
        color: #888;
        margin-top: 8px;
      }

      /* Result View */
      .result-view {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .view-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .toggle-pill-group {
        display: flex;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 20px;
        padding: 3px;
      }

      .pill-btn {
        background: transparent;
        border: none;
        color: #888;
        padding: 5px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .pill-btn.active {
        background: #252530;
        color: #fff;
      }

      .toggle-side-btns {
        display: flex;
        gap: 6px;
      }

      .toggle-side-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #aaa;
        padding: 5px 12px;
        border-radius: 16px;
        font-size: 12px;
        cursor: pointer;
      }

      .toggle-side-btn.active {
        background: rgba(212, 175, 55, 0.2);
        border-color: #d4af37;
        color: #ffd700;
        font-weight: 600;
      }

      .comparison-stage {
        width: 100%;
        aspect-ratio: 4 / 3;
        border-radius: 16px;
        overflow: hidden;
        position: relative;
        background: #000;
        border: 1px solid rgba(212, 175, 55, 0.3);
      }

      .slider-container {
        position: relative;
        width: 100%;
        height: 100%;
        user-select: none;
        cursor: ew-resize;
      }

      .slider-img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .slider-clip-after {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      .slider-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ffffff;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        transform: translateX(-50%);
        pointer-events: none;
      }

      .handle-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        background: #ffffff;
        color: #111;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      .single-view-container {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .single-view-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .badge-tag {
        position: absolute;
        top: 12px;
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(6px);
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .tag-left { left: 12px; }
      .tag-right { right: 12px; border-color: rgba(212, 175, 55, 0.6); color: #ffd700; }
      .tag-center { left: 12px; }

      /* Multi-Image Gallery */
      .multi-gallery-section {
        margin-top: 4px;
      }

      .gallery-title {
        font-size: 11px;
        color: #888;
        display: block;
        margin-bottom: 6px;
      }

      .gallery-thumbs-row {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 4px;
      }

      .gallery-thumb-card {
        flex: 0 0 70px;
        text-align: center;
        cursor: pointer;
        border: 2px solid transparent;
        border-radius: 8px;
        overflow: hidden;
        padding: 2px;
        background: rgba(255, 255, 255, 0.04);
        transition: all 0.2s;
      }

      .gallery-thumb-card.active {
        border-color: #d4af37;
        background: rgba(212, 175, 55, 0.15);
      }

      .gallery-thumb-card img {
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 6px;
      }

      .gallery-thumb-card span {
        font-size: 10px;
        color: #aaa;
        margin-top: 2px;
        display: block;
      }

      /* Action Buttons */
      .modal-footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
      }

      .result-actions-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 10px;
      }

      .btn-primary {
        background: #d4af37;
        color: #111111;
        border: none;
        padding: 11px 20px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-primary:hover {
        background: #ffd700;
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(212, 175, 55, 0.35);
      }

      .btn-gold-gradient {
        background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
        color: #0d0d0f;
        box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f0f0f0;
        padding: 10px 18px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      /* Error View */
      .error-view {
        text-align: center;
        padding: 30px 20px;
      }

      .error-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }

      .error-msg-text {
        font-size: 13px;
        color: #ef4444;
        margin-top: 8px;
      }
    `;
  }
}

export const modal = new ModalManager();
