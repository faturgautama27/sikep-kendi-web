import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { Image, ImageEntityKind, ImageCategory } from '@shared/models';

export interface ImageFilter {
  entityKind?: ImageEntityKind;
  entityId?: string;
}

export interface SignedImageUrl {
  url: string;
  expiresAt: string;
}

export interface CaptureToken {
  tokenId: string;
  expiresAt: string;
}

export interface ImageUploadMeta {
  tokenId: string;
  entityKind: ImageEntityKind;
  entityId: string;
  kategori: ImageCategory;
  gpsLat?: number;
  gpsLng?: number;
  capturedAtClient: string;
}

export interface ImageDataPort {
  list(filter?: ImageFilter): Observable<Image[]>;
  getById(id: string): Observable<Image>;
  getSignedUrl(id: string): Observable<SignedImageUrl>;
  requestCaptureToken(vehicleId: string): Observable<CaptureToken>;
  upload(file: File, meta: ImageUploadMeta): Observable<Image>;
}

export const IMAGE_DATA = new InjectionToken<ImageDataPort>('IMAGE_DATA');
