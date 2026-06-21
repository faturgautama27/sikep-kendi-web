import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface VerifikasiDataPort {
  detail(woId: string): Observable<unknown>;
  shs(woId: string, payload: Record<string, unknown>): Observable<unknown>;
  approve(woId: string): Observable<unknown>;
  revisi(woId: string, payload: Record<string, unknown>): Observable<unknown>;
}

export const VERIFIKASI_DATA = new InjectionToken<VerifikasiDataPort>('VERIFIKASI_DATA');