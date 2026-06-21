import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface PenawaranDataPort {
  listByWorkOrder(woId: string): Observable<unknown[]>;
  detail(woId: string, id: string): Observable<unknown>;
  create(woId: string, payload: Record<string, unknown>): Observable<unknown>;
  uploadInvoice(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown>;
  submit(woId: string, id: string): Observable<unknown>;
  requestRevisi(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown>;
  revisi(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown>;
}

export const PENAWARAN_DATA = new InjectionToken<PenawaranDataPort>('PENAWARAN_DATA');