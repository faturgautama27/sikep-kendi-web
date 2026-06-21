import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ChecklistTemplate,
  ChecklistTemplateVersion,
  ChecklistItem,
  ChecklistExecution,
} from '@shared/models';
import type {
  ChecklistDataPort,
  ChecklistExecutionFilter,
} from '../ports/checklist-data.port';
import { APP_ENV } from '../app-env.token';

/**
 * Production HttpClient-based implementation of ChecklistDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiChecklistData implements ChecklistDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  listTemplates(): Observable<ChecklistTemplate[]> {
    return this.http.get<ChecklistTemplate[]>(this.url('/checklist-templates'));
  }

  getTemplate(id: string): Observable<ChecklistTemplate> {
    return this.http.get<ChecklistTemplate>(this.url(`/checklist-templates/${id}`));
  }

  getTemplateVersion(
    templateId: string,
    versionId: string,
  ): Observable<ChecklistTemplateVersion> {
    return this.http.get<ChecklistTemplateVersion>(
      this.url(`/checklist-templates/${templateId}/versions/${versionId}`),
    );
  }

  createTemplate(
    input: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'currentVersionId'>,
    items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ): Observable<ChecklistTemplate> {
    return this.http.post<ChecklistTemplate>(this.url('/checklist-templates'), {
      template: input,
      items,
    });
  }

  publishTemplateVersion(
    templateId: string,
    items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ): Observable<ChecklistTemplateVersion> {
    return this.http.post<ChecklistTemplateVersion>(
      this.url(`/checklist-templates/${templateId}/versions`),
      { items },
    );
  }

  listExecutions(filter?: ChecklistExecutionFilter): Observable<ChecklistExecution[]> {
    let params = new HttpParams();
    if (filter?.vehicleId) params = params.set('vehicleId', filter.vehicleId);
    if (filter?.driverId) params = params.set('driverId', filter.driverId);
    if (filter?.from) params = params.set('from', filter.from);
    if (filter?.to) params = params.set('to', filter.to);
    return this.http.get<ChecklistExecution[]>(this.url('/checklist-executions'), {
      params,
    });
  }

  getExecution(id: string): Observable<ChecklistExecution> {
    return this.http.get<ChecklistExecution>(this.url(`/checklist-executions/${id}`));
  }

  getDueChecklists(driverId: string): Observable<ChecklistTemplate[]> {
    return this.http.get<ChecklistTemplate[]>(
      this.url(`/drivers/${driverId}/due-checklists`),
    );
  }

  submitExecution(
    execution: Omit<ChecklistExecution, 'id'>,
  ): Observable<ChecklistExecution> {
    return this.http.post<ChecklistExecution>(this.url('/checklist-executions'), execution);
  }
}
