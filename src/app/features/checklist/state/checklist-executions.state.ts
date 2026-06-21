import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { ChecklistExecution } from '@shared/models';

import { LoadDueChecklists, SubmitChecklistExecution } from './checklist.actions';

export interface ChecklistExecutionsStateModel {
  list: ChecklistExecution[];
}

const INITIAL: ChecklistExecutionsStateModel = { list: [] };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<ChecklistExecutionsStateModel>({ name: 'checklistExecutions', defaults: INITIAL })
@Injectable()
export class ChecklistExecutionsState {
  @Selector()
  static list(state: ChecklistExecutionsStateModel): ChecklistExecution[] {
    return state.list;
  }

  @Selector()
  static recent(state: ChecklistExecutionsStateModel): ChecklistExecution[] {
    return state.list
      .slice()
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, 20);
  }

  @Action(HydrateFromFixtures)
  hydrate(
    ctx: StateContext<ChecklistExecutionsStateModel>,
    action: HydrateFromFixtures,
  ): void {
    ctx.patchState({
      list: action.payload.checklistExecutions as ChecklistExecution[],
    });
  }

  @Action(LoadDueChecklists)
  loadDue(
    _ctx: StateContext<ChecklistExecutionsStateModel>,
    _action: LoadDueChecklists,
  ): void {
    // Preview Mode: data sudah ter-hydrate dari fixture saat boot.
  }

  @Action(SubmitChecklistExecution)
  submit(
    ctx: StateContext<ChecklistExecutionsStateModel>,
    action: SubmitChecklistExecution,
  ): void {
    const newExec: ChecklistExecution = {
      ...action.execution,
      id: generateId('exec'),
    };
    ctx.patchState({ list: [newExec, ...ctx.getState().list] });
  }
}
