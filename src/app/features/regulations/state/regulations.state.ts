import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type {
  Regulation,
  RegulationVersion,
  RegulationRule,
  RegulationChangeHistoryEntry,
} from '@shared/models';

import {
  ImportRegulations,
  LoadRegulationVersion,
  LoadRegulations,
  PublishRegulationVersion,
} from './regulations.actions';

export interface RegulationsStateModel {
  list: Regulation[];
  versions: RegulationVersion[];
  rules: RegulationRule[];
  changeHistory: RegulationChangeHistoryEntry[];
}

const INITIAL: RegulationsStateModel = {
  list: [],
  versions: [],
  rules: [],
  changeHistory: [],
};

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<RegulationsStateModel>({
  name: 'regulations',
  defaults: INITIAL,
})
@Injectable()
export class RegulationsState {
  @Selector()
  static list(state: RegulationsStateModel): Regulation[] {
    return state.list;
  }

  @Selector()
  static versions(state: RegulationsStateModel): RegulationVersion[] {
    return state.versions;
  }

  @Selector()
  static rules(state: RegulationsStateModel): RegulationRule[] {
    return state.rules;
  }

  @Selector()
  static changeHistory(state: RegulationsStateModel): RegulationChangeHistoryEntry[] {
    return state.changeHistory;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<RegulationsStateModel>, action: HydrateFromFixtures) {
    // Versions in fixture only carry the rule list reference, so we attach rules here.
    const versions = action.payload.regulationVersions as RegulationVersion[];
    const rules = action.payload.regulationRules as RegulationRule[];
    const enriched = versions.map((v) => ({
      ...v,
      rules: rules.filter((r) => r.regulationVersionId === v.id),
    }));
    ctx.patchState({
      list: action.payload.regulations as Regulation[],
      versions: enriched,
      rules,
      changeHistory: action.payload.regulationChangeHistory as RegulationChangeHistoryEntry[],
    });
  }

  @Action(LoadRegulations)
  load(_ctx: StateContext<RegulationsStateModel>) {
    // Preview Mode: hydrated from fixtures.
  }

  @Action(PublishRegulationVersion)
  publishVersion(ctx: StateContext<RegulationsStateModel>, action: PublishRegulationVersion) {
    const state = ctx.getState();
    const reg = state.list.find((r) => r.id === action.regulationId);
    if (!reg) return;
    const versionId = generateId('regv');
    const newRules: RegulationRule[] = action.rules.map((r) => ({
      ...r,
      id: generateId('regrule'),
      regulationVersionId: versionId,
    }));
    const newVersion: RegulationVersion = {
      ...action.newVersion,
      id: versionId,
      regulationId: action.regulationId,
      publishedAt: new Date().toISOString(),
      summary: action.summary,
      rules: newRules,
    };
    ctx.patchState({
      versions: [...state.versions, newVersion],
      rules: [...state.rules, ...newRules],
      list: state.list.map((r) =>
        r.id === action.regulationId ? { ...r, currentVersionId: versionId } : r,
      ),
    });
  }

  @Action(ImportRegulations)
  importFile(_ctx: StateContext<RegulationsStateModel>, _action: ImportRegulations) {
    // Preview Mode: stub. Real implementation parses JSON/CSV file.
  }

  @Action(LoadRegulationVersion)
  loadVersion(_ctx: StateContext<RegulationsStateModel>, _action: LoadRegulationVersion) {
    // Already in state; no-op.
  }
}
