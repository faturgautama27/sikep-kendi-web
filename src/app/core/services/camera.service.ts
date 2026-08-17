import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { MessageService } from 'primeng/api';
import { GeolocationService } from './geolocation.service';
import { WatermarkService } from './watermark.service';

export interface CaptureResult {
  file: File;
  dataUrl: string;
  mimeType: string;
}

@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly geolocation = inject(GeolocationService);
  private readonly watermark = inject(WatermarkService);

  /**
   * Capture a photo with GPS + timestamp watermark applied via Canvas API.
   * Falls back gracefully if location permission is denied.
   *
   * @returns CaptureResult with watermarked image File, dataUrl, and mimeType
   */
  async captureWithWatermark(): Promise<CaptureResult | null> {
    // Step 1: Request location permission (non-blocking)
    const locationPermission = await this.geolocation.requestPermissions();

    // Step 2: Capture photo via Capacitor Camera
    let photo;
    try {
      photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
      });
    } catch {
      // User cancelled or camera unavailable
      return null;
    }

    if (!photo.dataUrl) return null;

    // Step 3: Get GPS coordinates (only if permission granted)
    let coordinates = null;
    if (locationPermission === 'granted') {
      coordinates = await this.geolocation.getCurrentPosition();
    }

    // Step 4: Apply watermark via Canvas API
    const watermarkedDataUrl = await this.watermark.applyWatermark(
      photo.dataUrl,
      coordinates,
    );

    // Step 5: Convert data URL to File for upload
    const file = this.dataUrlToFile(watermarkedDataUrl, `photo_${Date.now()}.jpg`);

    return {
      file,
      dataUrl: watermarkedDataUrl,
      mimeType: 'image/jpeg',
    };
  }

  /**
   * Pick a video from device storage or record a new one via native file input.
   * Uses a hidden <input type="file"> element so no extra Capacitor plugin is needed.
   * Max size: 100 MB.
   *
   * @returns CaptureResult with video File, object-URL dataUrl, and mimeType
   */
  pickVideo(): Promise<CaptureResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      // accept video formats + capture attribute opens camera directly on Android
      input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/3gpp,video/x-matroska,video/*';
      input.capture = 'environment'; // rear camera for recording

      const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

      input.onchange = () => {
        const file = input.files?.[0] ?? null;
        if (!file) { resolve(null); return; }

        if (file.size > MAX_BYTES) {
          resolve(null);
          // Caller is responsible for showing the size-limit toast
          (input as any).__oversized = true;
          return;
        }

        // Use object URL — avoids reading the entire binary into memory as base64
        const dataUrl = URL.createObjectURL(file);
        resolve({ file, dataUrl, mimeType: file.type || 'video/mp4' });
      };

      // Resolve null if the picker is dismissed without selecting
      input.oncancel = () => resolve(null);

      input.click();
    });
  }

  /** Expose the oversized flag so callers can show the right toast. */
  static isOversized(input: HTMLInputElement): boolean {
    return !!(input as any).__oversized;
  }

  /**
   * Returns true if location permission was denied during last capture.
   * Used to show warning toast to user.
   */
  isLocationPermissionDenied(): Promise<boolean> {
    return this.geolocation.requestPermissions().then(r => r === 'denied');
  }

  private dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
