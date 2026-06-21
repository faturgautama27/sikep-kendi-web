import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type {
  ChecklistTemplate,
  ChecklistTemplateVersion,
  ChecklistItem,
} from '@shared/models';

import {
  LoadChecklistTemplates,
  CreateChecklistTemplate,
  PublishTemplateVersion,
} from './checklist.actions';

export interface ChecklistTemplatesStateModel {
  list: ChecklistTemplate[];
  versions: ChecklistTemplateVersion[];
  items: ChecklistItem[];
}

const INITIAL: ChecklistTemplatesStateModel = { list: [], versions: [], items: [] };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<ChecklistTemplatesStateModel>({ name: 'checklistTemplates', defaults: INITIAL })
@Injectable()
export class ChecklistTemplatesState {
  @Selector()
  static list(state: ChecklistTemplatesStateModel): ChecklistTemplate[] {
    return state.list;
  }

  @Selector()
  static versions(state: ChecklistTemplatesStateModel): ChecklistTemplateVersion[] {
    return state.versions;
  }

  @Selector()
  static items(state: ChecklistTemplatesStateModel): ChecklistItem[] {
    return state.items;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<ChecklistTemplatesStateModel>, action: HydrateFromFixtures): void {
    const items = action.payload.checklistItems as ChecklistItem[];
    const versions = action.payload.checklistTemplateVersions as ChecklistTemplateVersion[];
    const enrichedVersions = versions.map((v) => ({
      ...v,
      items: items.filter((i) => i.templateVersionId === v.id),
    }));
    ctx.patchState({
      list: action.payload.checklistTemplates as ChecklistTemplate[],
      versions: enrichedVersions,
      items,
    });
  }

  @Action(LoadChecklistTemplates)
  load(_ctx: StateContext<ChecklistTemplatesStateModel>): void {
    // Preview Mode: data sudah ter-hydrate dari fixture saat boot.
  }

  @Action(CreateChecklistTemplate)
  create(
    ctx: StateContext<ChecklistTemplatesStateModel>,
    action: CreateChecklistTemplate,
  ): void {
    const templateId = generateId('tpl');
    const versionId = generateId('tplv');
    const newTemplate: ChecklistTemplate = {
      ...action.input,
      id: templateId,
      currentVersionId: versionId,
      createdAt: new Date().toISOString(),
    };
    const newItems: ChecklistItem[] = action.items.map((i) => ({
      ...i,
      id: generateId('ci'),
      templateVersionId: versionId,
    }));
    const newVersion: ChecklistTemplateVersion = {
      id: versionId,
      templateId,
      versionNo: 1,
      publishedAt: new Date().toISOString(),
      publishedBy: 'preview-user',
      items: newItems,
    };
    const state = ctx.getState();
    ctx.patchState({
      list: [...state.list, newTemplate],
      versions: [...state.versions, newVersion],
      items: [...state.items, ...newItems],
    });
  }

  @Action(PublishTemplateVersion)
  publish(
    ctx: StateContext<ChecklistTemplatesStateModel>,
    action: PublishTemplateVersion,
  ): void {
    const state = ctx.getState();
    const tpl = state.list.find((t) => t.id === action.templateId);
    if (!tpl) return;
    const lastVersion = state.versions
      .filter((v) => v.templateId === action.templateId)
      .reduce((max, v) => (v.versionNo > max ? v.versionNo : max), 0);
    const versionId = generateId('tplv');
    const newItems: ChecklistItem[] = action.items.map((i) => ({
      ...i,
      id: generateId('ci'),
      templateVersionId: versionId,
    }));
    const newVersion: ChecklistTemplateVersion = {
      id: versionId,
      templateId: action.templateId,
      versionNo: lastVersion + 1,
      publishedAt: new Date().toISOString(),
      publishedBy: 'preview-user',
      items: newItems,
    };
    ctx.patchState({
      list: state.list.map((t) =>
        t.id === action.templateId ? { ...t, currentVersionId: versionId } : t,
      ),
      versions: [...state.versions, newVersion],
      items: [...state.items, ...newItems],
    });
  }
}
