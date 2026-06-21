import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Regulation,
  RegulationVersion,
  RegulationRule,
  RegulationChangeHistoryEntry,
} from '@shared/models';
import type { RegulationDataPort } from '../ports/regulation-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of RegulationDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiRegulationData implements RegulationDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(): Observable<Regulation[]> {
    return this.http.get<Regulation[]>(this.url('/regulations'));
  }

  getById(id: string): Observable<Regulation> {
    return this.http.get<Regulation>(this.url(`/regulations/${id}`));
  }

  listVersions(regulationId: string): Observable<RegulationVersion[]> {
    return this.http.get<RegulationVersion[]>(
      this.url(`/regulations/${regulationId}/versions`),
    );
  }

  getVersion(regulationId: string, versionId: string): Observable<RegulationVersion> {
    return this.http.get<RegulationVersion>(
      this.url(`/regulations/${regulationId}/versions/${versionId}`),
    );
  }

  publishVersion(
    regulationId: string,
    version: Omit<RegulationVersion, 'id' | 'publishedAt'>,
    summary: string,
  ): Observable<RegulationVersion> {
    return this.http.post<RegulationVersion>(
      this.url(`/regulations/${regulationId}/versions`),
      { version, summary },
    );
  }

  import(
    file: File,
  ): Observable<{ preview: RegulationRule[]; valid: boolean; errors: string[] }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ preview: RegulationRule[]; valid: boolean; errors: string[] }>(
      this.url('/regulations/import'),
      form,
    );
  }

  getChangeHistory(regulationId: string): Observable<RegulationChangeHistoryEntry[]> {
    return this.http.get<RegulationChangeHistoryEntry[]>(
      this.url(`/regulations/${regulationId}/change-history`),
    );
  }
}
