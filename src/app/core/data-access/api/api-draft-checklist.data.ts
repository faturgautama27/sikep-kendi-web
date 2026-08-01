import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { DraftChecklistDataPort } from '../ports/draft-checklist-data.port';
import { APP_ENV } from '../app-env.token';

function mapDraft(raw: any): any {
  return {
    ...raw,
    scanDraftImageUrl: raw.scan_draft_image_url ?? raw.scanDraftImageUrl ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class ApiDraftChecklistData implements DraftChecklistDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  listByWorkOrder(woId: string): Observable<unknown[]> {
    return this.http.get<any>(this.url(`/work-orders/${woId}/draft-checklist`)).pipe(
      map(res => {
        const rows: any[] = res?.data ?? res;
        return rows.map(mapDraft);
      })
    );
  }

  detail(id: string): Observable<unknown> {
    return this.http.get<any>(this.url(`/draft-checklist/${id}`)).pipe(
      map(res => mapDraft(res?.data ?? res))
    );
  }

  create(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<any>(this.url(`/work-orders/${woId}/draft-checklist`), payload).pipe(
      map(res => mapDraft(res?.data ?? res))
    );
  }

  update(id: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.patch<any>(this.url(`/draft-checklist/${id}`), payload).pipe(
      map(res => mapDraft(res?.data ?? res))
    );
  }

  submit(id: string): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/draft-checklist/${id}/submit`), {});
  }

  approve(id: string): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/draft-checklist/${id}/approve`), {});
  }

  reject(id: string, payload: { notesRejection: string }): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/draft-checklist/${id}/reject`), payload);
  }
}