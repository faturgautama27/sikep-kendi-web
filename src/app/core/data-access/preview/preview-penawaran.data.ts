import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { PenawaranDataPort } from '../ports/penawaran-data.port';

@Injectable({ providedIn: 'root' })
export class PreviewPenawaranData implements PenawaranDataPort {
  listByWorkOrder(woId: string): Observable<unknown[]> {
    return of([]);
  }

  detail(woId: string, id: string): Observable<unknown> {
    return of({ woId, id });
  }

  create(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, ...payload });
  }

  uploadInvoice(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, id, ...payload });
  }

  submit(woId: string, id: string): Observable<unknown> {
    return of({ woId, id, status: 'DIKIRIM' });
  }

  requestRevisi(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, id, status: 'REVISI', ...payload });
  }

  revisi(woId: string, id: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ woId, id, status: 'DRAFT', ...payload });
  }
}
