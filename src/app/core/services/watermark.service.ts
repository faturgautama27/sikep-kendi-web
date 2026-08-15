import { Injectable } from '@angular/core';
import type { Coordinates } from './geolocation.service';

@Injectable({ providedIn: 'root' })
export class WatermarkService {
  /**
   * Applies a GPS + timestamp watermark to an image using Canvas API.
   * Position: bottom-left corner with padding.
   * Styling: white text on semi-transparent black background.
   *
   * @param imageUrl - The image URL or data URL to watermark
   * @param coordinates - GPS coordinates to embed, or null if unavailable
   * @returns A data URL of the watermarked image
   */
  async applyWatermark(imageUrl: string, coordinates: Coordinates | null): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Build watermark text
        const now = new Date();
        const timestamp = now.toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).replace(',', '');

        const lines: string[] = [];
        if (coordinates) {
          lines.push(
            `Lat: ${coordinates.latitude.toFixed(6)}, Long: ${coordinates.longitude.toFixed(6)}`
          );
        } else {
          lines.push('Lokasi: tidak tersedia');
        }
        lines.push(timestamp);

        // Scale font size relative to image size (target ~12-14px at 400px wide)
        const scale = canvas.width / 400;
        const fontSize = Math.max(12, Math.min(24, Math.round(13 * scale)));
        const padding = Math.round(8 * scale);
        const lineHeight = fontSize + Math.round(4 * scale);

        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textBaseline = 'bottom';

        // Measure max text width
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        const bgWidth = maxWidth + padding * 2;
        const bgHeight = lines.length * lineHeight + padding * 2;

        const x = padding;
        const y = canvas.height - padding;

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(x - padding / 2, y - bgHeight + padding / 2, bgWidth, bgHeight);

        // Draw text lines bottom-to-top
        ctx.fillStyle = '#ffffff';
        for (let i = lines.length - 1; i >= 0; i--) {
          ctx.fillText(lines[i], x, y - (lines.length - 1 - i) * lineHeight);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };

      img.onerror = () => {
        // If image fails to load, return original URL unchanged
        resolve(imageUrl);
      };

      img.src = imageUrl;
    });
  }
}
