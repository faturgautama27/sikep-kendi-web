import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ChecklistTemplate,
  ChecklistTemplateVersion,
  ChecklistItem,
  ChecklistExecution,
} from '@shared/models';

export interface ChecklistExecutionFilter {
  vehicleId?: string;
  driverId?: string;
  from?: string;
  to?: string;
}

export interface ChecklistDataPort {
  listTemplates(): Observable<ChecklistTemplate[]>;
  getTemplate(id: string): Observable<ChecklistTemplate>;
  getTemplateVersion(
    templateId: string,
    versionId: string,
  ): Observable<ChecklistTemplateVersion>;
  createTemplate(
    input: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'currentVersionId'>,
    items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ): Observable<ChecklistTemplate>;
  publishTemplateVersion(
    templateId: string,
    items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ): Observable<ChecklistTemplateVersion>;
  listExecutions(filter?: ChecklistExecutionFilter): Observable<ChecklistExecution[]>;
  getExecution(id: string): Observable<ChecklistExecution>;
  getDueChecklists(driverId: string): Observable<ChecklistTemplate[]>;
  submitExecution(execution: Omit<ChecklistExecution, 'id'>): Observable<ChecklistExecution>;
}

export const CHECKLIST_DATA = new InjectionToken<ChecklistDataPort>('CHECKLIST_DATA');
