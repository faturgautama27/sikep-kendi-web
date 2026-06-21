/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
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

/**
 * Preview-mode implementation of ChecklistDataPort.
 *
 * Stub implementation untuk Phase 1: semua method return empty/dummy.
 * Implementasi nyata (in-memory NGXS-backed) akan diisi pada Task 5.6.
 */
@Injectable({ providedIn: 'root' })
export class PreviewChecklistData implements ChecklistDataPort {
  listTemplates(): Observable<ChecklistTemplate[]> {
    return of([]);
  }

  getTemplate(id: string): Observable<ChecklistTemplate> {
    return of({ id } as unknown as ChecklistTemplate);
  }

  getTemplateVersion(
    templateId: string,
    versionId: string,
  ): Observable<ChecklistTemplateVersion> {
    return of({ id: versionId, templateId } as unknown as ChecklistTemplateVersion);
  }

  createTemplate(
    input: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'currentVersionId'>,
    items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ): Observable<ChecklistTemplate> {
    return of({
      ...input,
      id: 'preview',
      createdAt: '',
      currentVersionId: 'preview',
    } as unknown as ChecklistTemplate);
  }

  publishTemplateVersion(
    templateId: string,
    items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ): Observable<ChecklistTemplateVersion> {
    return of({ id: 'preview', templateId } as unknown as ChecklistTemplateVersion);
  }

  listExecutions(filter?: ChecklistExecutionFilter): Observable<ChecklistExecution[]> {
    return of([]);
  }

  getExecution(id: string): Observable<ChecklistExecution> {
    return of({ id } as unknown as ChecklistExecution);
  }

  getDueChecklists(driverId: string): Observable<ChecklistTemplate[]> {
    return of([]);
  }

  submitExecution(
    execution: Omit<ChecklistExecution, 'id'>,
  ): Observable<ChecklistExecution> {
    return of({ ...execution, id: 'preview' } as unknown as ChecklistExecution);
  }
}
