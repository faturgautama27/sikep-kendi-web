import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { DraftChecklistDataPort } from '../ports/draft-checklist-data.port';

@Injectable({ providedIn: 'root' })
export class PreviewDraftChecklistData implements DraftChecklistDataPort {
  listByWorkOrder(woId: string): Observable<unknown[]> {
    return of([]);
  }

  detail(id: string): Observable<unknown> {
    return of({ id });
  }

  create(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, ...payload });
  }

  update(id: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ id, ...payload });
  }

  submit(id: string): Observable<unknown> {
    return of({ id, status: 'DIKIRIM' });
  }

  approve(id: string): Observable<unknown> {
    return of({ id, status: 'DISETUJUI' });
  }

  reject(id: string, payload: { notesRejection: string }): Observable<unknown> {
    return of({ id, status: 'DITOLAK', ...payload });
  }
}
