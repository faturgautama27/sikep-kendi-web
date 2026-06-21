import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import {
  ShowToast,
  DismissToast,
  SetGlobalLoading,
  SetSyncStatus,
  ToastPayload,
  SyncStatus,
} from './ui.actions';

export interface ToastEntry extends ToastPayload {
  id: string;
  createdAt: string;
}

export interface UiStateModel {
  toasts: ToastEntry[];
  globalLoading: boolean;
  sync: { status: SyncStatus; queueCount: number };
}

const INITIAL: UiStateModel = {
  toasts: [],
  globalLoading: false,
  sync: { status: 'idle', queueCount: 0 },
};

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<UiStateModel>({ name: 'ui', defaults: INITIAL })
@Injectable()
export class UiState {
  @Selector()
  static toasts(state: UiStateModel): ToastEntry[] {
    return state.toasts;
  }

  @Selector()
  static globalLoading(state: UiStateModel): boolean {
    return state.globalLoading;
  }

  @Selector()
  static sync(state: UiStateModel): UiStateModel['sync'] {
    return state.sync;
  }

  @Action(ShowToast)
  showToast(ctx: StateContext<UiStateModel>, action: ShowToast) {
    const entry: ToastEntry = {
      ...action.toast,
      id: generateId('toast'),
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ toasts: [...ctx.getState().toasts, entry] });
  }

  @Action(DismissToast)
  dismiss(ctx: StateContext<UiStateModel>, action: DismissToast) {
    ctx.patchState({ toasts: ctx.getState().toasts.filter((t) => t.id !== action.id) });
  }

  @Action(SetGlobalLoading)
  setLoading(ctx: StateContext<UiStateModel>, action: SetGlobalLoading) {
    ctx.patchState({ globalLoading: action.loading });
  }

  @Action(SetSyncStatus)
  setSync(ctx: StateContext<UiStateModel>, action: SetSyncStatus) {
    ctx.patchState({ sync: { status: action.status, queueCount: action.queueCount } });
  }
}
