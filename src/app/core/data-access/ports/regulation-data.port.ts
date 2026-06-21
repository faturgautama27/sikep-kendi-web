import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Regulation,
  RegulationVersion,
  RegulationRule,
  RegulationChangeHistoryEntry,
} from '@shared/models';

export interface RegulationDataPort {
  list(): Observable<Regulation[]>;
  getById(id: string): Observable<Regulation>;
  listVersions(regulationId: string): Observable<RegulationVersion[]>;
  getVersion(regulationId: string, versionId: string): Observable<RegulationVersion>;
  publishVersion(
    regulationId: string,
    version: Omit<RegulationVersion, 'id' | 'publishedAt'>,
    summary: string,
  ): Observable<RegulationVersion>;
  import(file: File): Observable<{ preview: RegulationRule[]; valid: boolean; errors: string[] }>;
  getChangeHistory(regulationId: string): Observable<RegulationChangeHistoryEntry[]>;
}

export const REGULATION_DATA = new InjectionToken<RegulationDataPort>('REGULATION_DATA');
