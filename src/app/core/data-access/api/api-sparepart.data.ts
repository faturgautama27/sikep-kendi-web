import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Sparepart, SparepartPriceHistory, Vendor } from '@shared/models';
import type { SparepartDataPort } from '../ports/sparepart-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of SparepartDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiSparepartData implements SparepartDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(): Observable<Sparepart[]> {
    return this.http.get<Sparepart[]>(this.url('/spareparts'));
  }

  getById(id: string): Observable<Sparepart> {
    return this.http.get<Sparepart>(this.url(`/spareparts/${id}`));
  }

  create(input: Omit<Sparepart, 'id' | 'createdAt'>): Observable<Sparepart> {
    return this.http.post<Sparepart>(this.url('/spareparts'), input);
  }

  update(id: string, patch: Partial<Sparepart>): Observable<Sparepart> {
    return this.http.patch<Sparepart>(this.url(`/spareparts/${id}`), patch);
  }

  getPriceHistory(sparepartId: string): Observable<SparepartPriceHistory[]> {
    return this.http.get<SparepartPriceHistory[]>(
      this.url(`/spareparts/${sparepartId}/price-history`),
    );
  }

  listVendors(): Observable<Vendor[]> {
    return this.http.get<Vendor[]>(this.url('/vendors'));
  }

  getVendor(id: string): Observable<Vendor> {
    return this.http.get<Vendor>(this.url(`/vendors/${id}`));
  }

  createVendor(input: Omit<Vendor, 'id' | 'createdAt'>): Observable<Vendor> {
    return this.http.post<Vendor>(this.url('/vendors'), input);
  }

  updateVendor(id: string, patch: Partial<Vendor>): Observable<Vendor> {
    return this.http.patch<Vendor>(this.url(`/vendors/${id}`), patch);
  }
}
