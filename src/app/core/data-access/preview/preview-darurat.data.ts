import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { DaruratDataPort } from '../ports/darurat-data.port';

@Injectable({ providedIn: 'root' })
export class PreviewDaruratData implements DaruratDataPort {
  list(): Observable<unknown> {
    return of({ data: [], nextCursor: null });
  }

  detail(id: string): Observable<unknown> {
    return of({ id });
  }

  create(payload: Record<string, unknown>): Observable<unknown> {
    return of(payload);
  }

  verifikasi(id: string, payload: Record<string, unknown>): Observable<unknown> {
    return of({ id, ...payload });
  }

  approveReimbursement(id: string): Observable<unknown> {
    return of({ id, status: 'REIMBURSE_APPROVED' });
  }
}
