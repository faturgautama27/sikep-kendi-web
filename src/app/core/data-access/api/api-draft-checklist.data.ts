import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { DraftChecklistDataPort } from '../ports/draft-checklist-data.port';
import { APP_ENV } from '../app-env.token';

@Injectable({ providedIn: 'root' })
export class ApiDraftChecklistData implements DraftChecklistDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  listByWorkOrder(woId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.url(`/work-orders/${woId}/draft-checklist`));
  }

  detail(id: string): Observable<unknown> {
    return this.http.get<unknown>(this.url(`/draft-checklist/${id}`));
  }

  create(woId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.url(`/work-orders/${woId}/draft-checklist`), payload);
  }

  update(id: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.patch<unknown>(this.url(`/draft-checklist/${id}`), payload);
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