/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type {
  Regulation,
  RegulationVersion,
  RegulationRule,
  RegulationChangeHistoryEntry,
} from '@shared/models';
import type { RegulationDataPort } from '../ports/regulation-data.port';

/**
 * Preview-mode implementation of RegulationDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.3.
 */
@Injectable({ providedIn: 'root' })
export class PreviewRegulationData implements RegulationDataPort {
  list(): Observable<Regulation[]> {
    return of([]);
  }

  getById(id: string): Observable<Regulation> {
    return of({ id } as unknown as Regulation);
  }

  listVersions(regulationId: string): Observable<RegulationVersion[]> {
    return of([]);
  }

  getVersion(regulationId: string, versionId: string): Observable<RegulationVersion> {
    return of({ id: versionId, regulationId } as unknown as RegulationVersion);
  }

  publishVersion(
    regulationId: string,
    version: Omit<RegulationVersion, 'id' | 'publishedAt'>,
    summary: string,
  ): Observable<RegulationVersion> {
    return of({
      ...version,
      id: 'preview',
      publishedAt: '',
    } as unknown as RegulationVersion);
  }

  import(
    file: File,
  ): Observable<{ preview: RegulationRule[]; valid: boolean; errors: string[] }> {
    return of({ preview: [], valid: true, errors: [] });
  }

  getChangeHistory(regulationId: string): Observable<RegulationChangeHistoryEntry[]> {
    return of([]);
  }
}
