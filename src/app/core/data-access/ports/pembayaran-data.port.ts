import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface PembayaranDataPort {
  detail(woId: string): Observable<unknown>;
  proses(woId: string, payload: Record<string, unknown>): Observable<unknown>;
  bukti(woId: string, payload: Record<string, unknown>): Observable<unknown>;
}

export const PEMBAYARAN_DATA = new InjectionToken<PembayaranDataPort>('PEMBAYARAN_DATA');