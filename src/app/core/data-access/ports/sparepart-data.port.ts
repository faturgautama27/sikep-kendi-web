import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { Sparepart, SparepartPriceHistory, Vendor } from '@shared/models';

export interface SparepartDataPort {
  list(): Observable<Sparepart[]>;
  getById(id: string): Observable<Sparepart>;
  create(input: Omit<Sparepart, 'id' | 'createdAt'>): Observable<Sparepart>;
  update(id: string, patch: Partial<Sparepart>): Observable<Sparepart>;
  getPriceHistory(sparepartId: string): Observable<SparepartPriceHistory[]>;
  listVendors(): Observable<Vendor[]>;
  getVendor(id: string): Observable<Vendor>;
  createVendor(input: Omit<Vendor, 'id' | 'createdAt'>): Observable<Vendor>;
  updateVendor(id: string, patch: Partial<Vendor>): Observable<Vendor>;
}

export const SPAREPART_DATA = new InjectionToken<SparepartDataPort>('SPAREPART_DATA');
