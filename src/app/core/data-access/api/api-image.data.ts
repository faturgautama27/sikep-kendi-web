import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Image } from '@shared/models';
import type {
  ImageDataPort,
  ImageFilter,
  SignedImageUrl,
  CaptureToken,
  ImageUploadMeta,
} from '../ports/image-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of ImageDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiImageData implements ImageDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(filter?: ImageFilter): Observable<Image[]> {
    let params = new HttpParams();
    if (filter?.entityKind) params = params.set('entityKind', filter.entityKind);
    if (filter?.entityId) params = params.set('entityId', filter.entityId);
    return this.http.get<Image[]>(this.url('/images'), { params });
  }

  getById(id: string): Observable<Image> {
    return this.http.get<Image>(this.url(`/images/${id}`));
  }

  getSignedUrl(id: string): Observable<SignedImageUrl> {
    return this.http.get<SignedImageUrl>(this.url(`/images/${id}/signed-url`));
  }

  requestCaptureToken(vehicleId: string): Observable<CaptureToken> {
    return this.http.post<CaptureToken>(this.url('/images/capture-token'), {
      vehicleId,
    });
  }

  upload(file: File): Observable<Image> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Image>(this.url('/images'), form);
  }
}
