import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { SpjExternal, SpjMatch, SpjFollowUp, SpjStatus } from '@shared/models';

import {
  LoadSpj,
  UploadSpj,
  ResolveAmbiguousMatch,
  MarkNeedsFollowUp,
  LoadSpjReport,
} from './spj.actions';

export interface SpjStateModel {
  list: SpjExternal[];
}

const INITIAL: SpjStateModel = { list: [] };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<SpjStateModel>({ name: 'spj', defaults: INITIAL })
@Injectable()
export class SpjState {
  @Selector()
  static list(state: SpjStateModel): SpjExternal[] {
    return state.list;
  }

  @Selector()
  static byStatus(state: SpjStateModel) {
    return (status: SpjStatus): SpjExternal[] => state.list.filter((s) => s.status === status);
  }

  @Selector()
  static unmatched(state: SpjStateModel): SpjExternal[] {
    return state.list.filter((s) => s.status === 'unmatched');
  }

  @Selector()
  static needsFollowUp(state: SpjStateModel): SpjExternal[] {
    return state.list.filter((s) => s.status === 'needs_follow_up');
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<SpjStateModel>, action: HydrateFromFixtures) {
    ctx.patchState({ list: action.payload.spjExternal as SpjExternal[] });
  }

  @Action(LoadSpj)
  load(_ctx: StateContext<SpjStateModel>) {}

  @Action(UploadSpj)
  upload(ctx: StateContext<SpjStateModel>, action: UploadSpj) {
    const newSpj: SpjExternal = {
      ...action.input,
      id: generateId('spj'),
      status: 'unmatched',
      uploadedAt: new Date().toISOString(),
      daysSinceUpload: 0,
      match: null,
      followUp: null,
      candidates: [],
    };
    ctx.patchState({ list: [newSpj, ...ctx.getState().list] });
  }

  @Action(ResolveAmbiguousMatch)
  resolve(ctx: StateContext<SpjStateModel>, action: ResolveAmbiguousMatch) {
    const state = ctx.getState();
    const target = state.list.find((s) => s.id === action.spjId);
    if (!target) return;
    const candidate = target.candidates.find(
      (c) => c.internalKind === action.candidate.kind && c.internalId === action.candidate.id,
    );
    if (!candidate) return;
    const newMatch: SpjMatch = {
      id: generateId('spjm'),
      spjId: action.spjId,
      internalKind: candidate.internalKind,
      internalId: candidate.internalId,
      internalRef: candidate.internalRef,
      matchType: 'manual',
      confidence: candidate.matchScore,
      decidedBy: 'preview-user',
      decidedByName: 'Preview User',
      decidedAt: new Date().toISOString(),
      internalAmount: candidate.nominal,
      diffAmount: target.nominal - candidate.nominal,
    };
    ctx.patchState({
      list: state.list.map((s) =>
        s.id === action.spjId
          ? { ...s, status: 'matched' as const, match: newMatch, candidates: [] }
          : s,
      ),
    });
  }

  @Action(MarkNeedsFollowUp)
  markFollowUp(ctx: StateContext<SpjStateModel>, action: MarkNeedsFollowUp) {
    const state = ctx.getState();
    const newFollowUp: SpjFollowUp = {
      id: generateId('fu'),
      spjId: action.spjId,
      alasan: action.alasan,
      langkahTindakLanjut: action.langkah,
      setBy: 'preview-user',
      setByName: 'Preview User',
      setAt: new Date().toISOString(),
    };
    ctx.patchState({
      list: state.list.map((s) =>
        s.id === action.spjId ? { ...s, status: 'needs_follow_up' as const, followUp: newFollowUp } : s,
      ),
    });
  }

  @Action(LoadSpjReport)
  loadReport(_ctx: StateContext<SpjStateModel>, _action: LoadSpjReport) {}
}
