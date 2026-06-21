import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface DaruratDataPort {
  list(query?: Record<string, string | number | boolean | null | undefined>): Observable<unknown>;
  detail(id: string): Observable<unknown>;
  create(payload: Record<string, unknown>): Observable<unknown>;
  verifikasi(id: string, payload: Record<string, unknown>): Observable<unknown>;
  approveReimbursement(id: string): Observable<unknown>;
}

export const DARURAT_DATA = new InjectionToken<DaruratDataPort>('DARURAT_DATA');