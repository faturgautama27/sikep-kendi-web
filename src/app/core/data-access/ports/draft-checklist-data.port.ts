import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface DraftChecklistDataPort {
  listByWorkOrder(woId: string): Observable<unknown[]>;
  detail(id: string): Observable<unknown>;
  create(woId: string, payload: Record<string, unknown>): Observable<unknown>;
  update(id: string, payload: Record<string, unknown>): Observable<unknown>;
  submit(id: string): Observable<unknown>;
  /** PB approve — status: DIKIRIM → DISETUJUI_PB */
  approve(id: string): Observable<unknown>;
  approvePb(woId: string, id: string): Observable<unknown>;
  /** PB reject — status: DIKIRIM → DITOLAK_PB */
  reject(id: string, payload: { notesRejection: string }): Observable<unknown>;
  rejectPb(woId: string, id: string, payload: { notesRejection: string }): Observable<unknown>;
  /** PPTK approve — status: DISETUJUI_PB → DISETUJUI_PPTK */
  approvePptk(woId: string, id: string, payload?: { pptkCatatan?: string }): Observable<unknown>;
  /** PPTK reject — status: DISETUJUI_PB → DITOLAK_PPTK */
  rejectPptk(woId: string, id: string, payload: { pptkAlasanPenolakan: string }): Observable<unknown>;
}

export const DRAFT_CHECKLIST_DATA = new InjectionToken<DraftChecklistDataPort>('DRAFT_CHECKLIST_DATA');