import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface DraftChecklistDataPort {
  listByWorkOrder(woId: string): Observable<unknown[]>;
  detail(id: string): Observable<unknown>;
  create(woId: string, payload: Record<string, unknown>): Observable<unknown>;
  update(id: string, payload: Record<string, unknown>): Observable<unknown>;
  submit(id: string): Observable<unknown>;
  approve(id: string): Observable<unknown>;
  reject(id: string, payload: { notesRejection: string }): Observable<unknown>;
}

export const DRAFT_CHECKLIST_DATA = new InjectionToken<DraftChecklistDataPort>('DRAFT_CHECKLIST_DATA');