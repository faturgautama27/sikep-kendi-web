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
