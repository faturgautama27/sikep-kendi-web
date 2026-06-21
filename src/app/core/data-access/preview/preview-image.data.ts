/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Image } from '@shared/models';
import type {
  ImageDataPort,
  ImageFilter,
  SignedImageUrl,
  CaptureToken,
  ImageUploadMeta,
} from '../ports/image-data.port';

/**
 * Preview-mode implementation of ImageDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.x (image domain).
 */
@Injectable({ providedIn: 'root' })
export class PreviewImageData implements ImageDataPort {
  list(filter?: ImageFilter): Observable<Image[]> {
    return of([]);
  }

  getById(id: string): Observable<Image> {
    return of({ id } as unknown as Image);
  }

  getSignedUrl(id: string): Observable<SignedImageUrl> {
    return of({ url: '', expiresAt: '' });
  }

  requestCaptureToken(vehicleId: string): Observable<CaptureToken> {
    return of({ tokenId: 'preview', expiresAt: '' });
  }

  upload(file: File, meta: ImageUploadMeta): Observable<Image> {
    return of({
      id: 'preview',
      entityKind: meta.entityKind,
      entityId: meta.entityId,
      kategori: meta.kategori,
      capturedAtClient: meta.capturedAtClient,
      gpsLat: meta.gpsLat ?? null,
      gpsLng: meta.gpsLng ?? null,
    } as unknown as Image);
  }
}
