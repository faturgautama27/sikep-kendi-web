/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Sparepart, SparepartPriceHistory, Vendor } from '@shared/models';
import type { SparepartDataPort } from '../ports/sparepart-data.port';

/**
 * Preview-mode implementation of SparepartDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.4.
 */
@Injectable({ providedIn: 'root' })
export class PreviewSparepartData implements SparepartDataPort {
  list(): Observable<Sparepart[]> {
    return of([]);
  }

  getById(id: string): Observable<Sparepart> {
    return of({ id } as unknown as Sparepart);
  }

  create(input: Omit<Sparepart, 'id' | 'createdAt'>): Observable<Sparepart> {
    return of({ ...input, id: 'preview', createdAt: '' } as unknown as Sparepart);
  }

  update(id: string, patch: Partial<Sparepart>): Observable<Sparepart> {
    return of({ ...patch, id } as unknown as Sparepart);
  }

  getPriceHistory(sparepartId: string): Observable<SparepartPriceHistory[]> {
    return of([]);
  }

  listVendors(): Observable<Vendor[]> {
    return of([]);
  }

  getVendor(id: string): Observable<Vendor> {
    return of({ id } as unknown as Vendor);
  }

  createVendor(input: Omit<Vendor, 'id' | 'createdAt'>): Observable<Vendor> {
    return of({ ...input, id: 'preview', createdAt: '' } as unknown as Vendor);
  }

  updateVendor(id: string, patch: Partial<Vendor>): Observable<Vendor> {
    return of({ ...patch, id } as unknown as Vendor);
  }
}
