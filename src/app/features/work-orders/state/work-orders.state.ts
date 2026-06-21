import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { WorkOrder, WorkOrderProgress, WorkOrderEvidence } from '@shared/models';

import {
  LoadWorkOrders,
  AssignWorkOrder,
  UpdateProgress,
  AddEvidence,
  CompleteWorkOrder,
  ValidateWorkOrder,
} from './work-orders.actions';

export interface WorkOrdersStateModel {
  list: WorkOrder[];
  progress: WorkOrderProgress[];
  evidence: WorkOrderEvidence[];
}

const INITIAL: WorkOrdersStateModel = { list: [], progress: [], evidence: [] };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<WorkOrdersStateModel>({ name: 'workOrders', defaults: INITIAL })
@Injectable()
export class WorkOrdersState {
  @Selector()
  static list(state: WorkOrdersStateModel): WorkOrder[] {
    return state.list;
  }

  @Selector()
  static progress(state: WorkOrdersStateModel): WorkOrderProgress[] {
    return state.progress;
  }

  @Selector()
  static evidence(state: WorkOrdersStateModel): WorkOrderEvidence[] {
    return state.evidence;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<WorkOrdersStateModel>, action: HydrateFromFixtures) {
    const list = action.payload.workOrders as WorkOrder[];
    const prog = action.payload.workOrderProgress as WorkOrderProgress[];
    const ev = action.payload.workOrderEvidence as WorkOrderEvidence[];
    const enriched = list.map((wo) => ({
      ...wo,
      progressUpdates: prog.filter((p) => p.workOrderId === wo.id),
      evidence: ev.filter((e) => e.workOrderId === wo.id),
    }));
    ctx.patchState({ list: enriched, progress: prog, evidence: ev });
  }

  @Action(LoadWorkOrders)
  load(_ctx: StateContext<WorkOrdersStateModel>) {}

  @Action(AssignWorkOrder)
  assign(ctx: StateContext<WorkOrdersStateModel>, action: AssignWorkOrder) {
    ctx.patchState({
      list: ctx.getState().list.map((wo) =>
        wo.id === action.workOrderId
          ? {
              ...wo,
              vendorId: action.vendorId,
              status: 'assigned' as const,
              assignedAt: new Date().toISOString(),
            }
          : wo,
      ),
    });
  }

  @Action(UpdateProgress)
  updateProgress(ctx: StateContext<WorkOrdersStateModel>, action: UpdateProgress) {
    const newProgress: WorkOrderProgress = {
      ...action.progress,
      id: generateId('wop'),
      workOrderId: action.workOrderId,
    };
    ctx.patchState({
      progress: [...ctx.getState().progress, newProgress],
      list: ctx.getState().list.map((wo) =>
        wo.id === action.workOrderId
          ? { ...wo, progressUpdates: [...wo.progressUpdates, newProgress] }
          : wo,
      ),
    });
  }

  @Action(AddEvidence)
  addEvidence(ctx: StateContext<WorkOrdersStateModel>, action: AddEvidence) {
    const newEv: WorkOrderEvidence = {
      ...action.evidence,
      id: generateId('woe'),
      workOrderId: action.workOrderId,
    };
    ctx.patchState({
      evidence: [...ctx.getState().evidence, newEv],
      list: ctx.getState().list.map((wo) =>
        wo.id === action.workOrderId ? { ...wo, evidence: [...wo.evidence, newEv] } : wo,
      ),
    });
  }

  @Action(CompleteWorkOrder)
  complete(ctx: StateContext<WorkOrdersStateModel>, action: CompleteWorkOrder) {
    ctx.patchState({
      list: ctx.getState().list.map((wo) =>
        wo.id === action.workOrderId
          ? {
              ...wo,
              status: 'completed' as const,
              completedAt: new Date().toISOString(),
            }
          : wo,
      ),
    });
  }

  @Action(ValidateWorkOrder)
  validate(ctx: StateContext<WorkOrdersStateModel>, action: ValidateWorkOrder) {
    ctx.patchState({
      list: ctx.getState().list.map((wo) =>
        wo.id === action.workOrderId
          ? {
              ...wo,
              status: action.accepted
                ? ('validated_accepted' as const)
                : ('validated_rejected' as const),
              validatedAt: new Date().toISOString(),
              validatedBy: 'preview-user',
              rejectedReason: action.accepted ? null : (action.reason ?? null),
            }
          : wo,
      ),
    });
  }
}
