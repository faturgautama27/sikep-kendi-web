/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { SpjExternal, SpjReportPeriode, InternalKind } from '@shared/models';
import type {
  SpjDataPort,
  SpjFilter,
  SpjUploadInput,
} from '../ports/spj-data.port';

/**
 * Preview-mode implementation of SpjDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.9.
 */
@Injectable({ providedIn: 'root' })
export class PreviewSpjData implements SpjDataPort {
  list(filter?: SpjFilter): Observable<SpjExternal[]> {
    return of([]);
  }

  getById(id: string): Observable<SpjExternal> {
    return of({ id } as unknown as SpjExternal);
  }

  upload(input: SpjUploadInput): Observable<SpjExternal> {
    return of({
      ...input,
      id: 'preview',
      status: 'unmatched',
    } as unknown as SpjExternal);
  }

  resolveAmbiguous(
    spjId: string,
    candidateRef: { kind: InternalKind; id: string },
  ): Observable<SpjExternal> {
    return of({ id: spjId, status: 'matched' } as unknown as SpjExternal);
  }

  markNeedsFollowUp(
    spjId: string,
    alasan: string,
    langkah: string,
  ): Observable<SpjExternal> {
    return of({ id: spjId, status: 'needs_follow_up' } as unknown as SpjExternal);
  }

  getReport(period: { from: string; to: string }): Observable<SpjReportPeriode> {
    const empty = { count: 0, nominal: 0 };
    return of({
      from: period.from,
      to: period.to,
      total: empty,
      matched: empty,
      ambiguous: empty,
      unmatched: empty,
      needsFollowUp: empty,
      internalTotalMatched: 0,
      selisih: 0,
      isKlop: true,
    });
  }
}
