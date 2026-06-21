import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { WORKORDER_DATA, type WorkOrderDataPort } from '@core/data-access/ports/work-order-data.port';
import type { WorkOrder, WorkOrderProgress, WorkOrderEvidence } from '@shared/models';

import {
  LoadWorkOrders,
  GetWorkOrderDetail,
  AssignVendor,
} from './work-orders.actions';

export interface WorkOrdersStateModel {
  list: WorkOrder[];
  detail: WorkOrder | null;
  progress: WorkOrderProgress[];
  evidence: WorkOrderEvidence[];
}

const INITIAL: WorkOrdersStateModel = { list: [], detail: null, progress: [], evidence: [] };

@State<WorkOrdersStateModel>({ name: 'workOrders', defaults: INITIAL })
@Injectable()
export class WorkOrdersState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<WorkOrderDataPort>(WORKORDER_DATA);

  @Selector()
  static list(state: WorkOrdersStateModel): WorkOrder[] {
    return state.list;
  }

  @Selector()
  static progress(state: WorkOrdersStateModel): WorkOrderProgress[] {
    return state.progress;
  }

  @Selector()
  static detail(state: WorkOrdersStateModel): WorkOrder | null {
    return state.detail;
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
  load(ctx: StateContext<WorkOrdersStateModel>) {
    if (this.env.previewMode) return;
    return this.data.list().pipe(
      tap((list) => {
        ctx.patchState({ list });
      }),
    );
  }

  @Action(GetWorkOrderDetail)
  getDetail(ctx: StateContext<WorkOrdersStateModel>, action: GetWorkOrderDetail) {
    if (!this.env.previewMode) {
      return this.data.getById(action.workOrderId).pipe(
        tap((detail) => {
          ctx.patchState({ detail });
        }),
      );
    }

    const detail = ctx.getState().list.find((wo) => wo.id === action.workOrderId) ?? null;
    ctx.patchState({ detail });
    return;
  }

  @Action(AssignVendor)
  assign(ctx: StateContext<WorkOrdersStateModel>, action: AssignVendor) {
    if (!this.env.previewMode) {
      return this.data.assignVendor(action.workOrderId, action.vendorId).pipe(
        tap((updatedFromApi) => {
          const current = ctx.getState();
          ctx.patchState({
            list: current.list.map((wo) => (wo.id === updatedFromApi.id ? updatedFromApi : wo)),
            detail:
              current.detail?.id === updatedFromApi.id
                ? updatedFromApi
                : current.detail,
          });
          ctx.dispatch(new LoadWorkOrders());
        }),
      );
    }

    const currentDetail = ctx.getState().detail;
    const updatedDetail: WorkOrder | null =
      currentDetail && currentDetail.id === action.workOrderId
        ? {
            ...currentDetail,
            vendorId: action.vendorId,
            status: 'assigned',
            assignedAt: new Date().toISOString(),
          }
        : currentDetail;

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
      detail: updatedDetail,
    });
    return;
  }
}
