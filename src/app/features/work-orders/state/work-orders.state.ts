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
  ApprovePPTK,
  RejectPPTK,
  SaveShsMapping,
  PbReviewShs,
  SubmitInvoice,
  VerifikatorReview,
  PptkDecision,
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
      tap((list) => ctx.patchState({ list })),
    );
  }

  @Action(GetWorkOrderDetail)
  getDetail(ctx: StateContext<WorkOrdersStateModel>, action: GetWorkOrderDetail) {
    if (!this.env.previewMode) {
      return this.data.getById(action.workOrderId).pipe(
        tap((detail) => ctx.patchState({ detail })),
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
            detail: current.detail?.id === updatedFromApi.id ? updatedFromApi : current.detail,
          });
          ctx.dispatch(new LoadWorkOrders());
        }),
      );
    }

    const currentDetail = ctx.getState().detail;
    const updatedDetail: WorkOrder | null =
      currentDetail && currentDetail.id === action.workOrderId
        ? { ...currentDetail, vendorId: action.vendorId, status: 'VENDOR_DITUGASKAN', assignedAt: new Date().toISOString() }
        : currentDetail;
    ctx.patchState({
      list: ctx.getState().list.map((wo) =>
        wo.id === action.workOrderId
          ? { ...wo, vendorId: action.vendorId, status: 'VENDOR_DITUGASKAN' as const, assignedAt: new Date().toISOString() }
          : wo,
      ),
      detail: updatedDetail,
    });
    return;
  }

  // Legacy actions kept for backward compat
  @Action(ApprovePPTK)
  approvePPTK(ctx: StateContext<WorkOrdersStateModel>, action: ApprovePPTK) {
    if (!this.env.previewMode) {
      return this.data.approvePPTK(action.workOrderId).pipe(
        tap(() => ctx.dispatch(new GetWorkOrderDetail(action.workOrderId))),
      );
    }
    const currentDetail = ctx.getState().detail;
    if (currentDetail && currentDetail.id === action.workOrderId) {
      ctx.patchState({ detail: { ...currentDetail, status: 'DISETUJUI_PPTK' } });
    }
    return;
  }

  @Action(RejectPPTK)
  rejectPPTK(ctx: StateContext<WorkOrdersStateModel>, action: RejectPPTK) {
    if (!this.env.previewMode) {
      return this.data.rejectPPTK(action.workOrderId, action.catatan).pipe(
        tap(() => ctx.dispatch(new GetWorkOrderDetail(action.workOrderId))),
      );
    }
    const currentDetail = ctx.getState().detail;
    if (currentDetail && currentDetail.id === action.workOrderId) {
      ctx.patchState({ detail: { ...currentDetail, status: 'DITOLAK_PPTK', rejectedReason: action.catatan } });
    }
    return;
  }

  // Step D: PB input SHS mapping
  @Action(SaveShsMapping)
  saveShsMapping(ctx: StateContext<WorkOrdersStateModel>, action: SaveShsMapping) {
    if (!this.env.previewMode) {
      return this.data.saveShsMapping(action.workOrderId, action.items).pipe(
        tap(() => ctx.dispatch(new GetWorkOrderDetail(action.workOrderId))),
      );
    }
    return;
  }

  // Step D: PB review approve/reject
  @Action(PbReviewShs)
  pbReviewShs(ctx: StateContext<WorkOrdersStateModel>, action: PbReviewShs) {
    if (!this.env.previewMode) {
      return this.data.pbReviewShs(action.workOrderId, action.approved, action.catatan, action.alasanPenolakan).pipe(
        tap(() => ctx.dispatch(new GetWorkOrderDetail(action.workOrderId))),
      );
    }
    const currentDetail = ctx.getState().detail;
    if (currentDetail && currentDetail.id === action.workOrderId) {
      ctx.patchState({
        detail: { ...currentDetail, status: action.approved ? 'MENUNGGU_INVOICE_VENDOR' : 'DITOLAK_PB' },
      });
    }
    return;
  }

  // Step E: Vendor submit invoice
  @Action(SubmitInvoice)
  submitInvoice(ctx: StateContext<WorkOrdersStateModel>, action: SubmitInvoice) {
    if (!this.env.previewMode) {
      return this.data.submitInvoice(action.workOrderId, action.invoiceImageId, action.invoiceDraftImageId).pipe(
        tap(() => ctx.dispatch(new GetWorkOrderDetail(action.workOrderId))),
      );
    }
    const currentDetail = ctx.getState().detail;
    if (currentDetail && currentDetail.id === action.workOrderId) {
      ctx.patchState({ detail: { ...currentDetail, status: 'MENUNGGU_VERIFIKATOR' } });
    }
    return;
  }

  // Step F: Verifikator review
  @Action(VerifikatorReview)
  verifikatorReview(ctx: StateContext<WorkOrdersStateModel>, action: VerifikatorReview) {
    if (!this.env.previewMode) {
      return this.data.verifikatorReview(action.workOrderId, action.approved, action.catatan, action.alasanPenolakan).pipe(
        tap(() => ctx.dispatch(new GetWorkOrderDetail(action.workOrderId))),
      );
    }
    const currentDetail = ctx.getState().detail;
    if (currentDetail && currentDetail.id === action.workOrderId) {
      ctx.patchState({
        detail: { ...currentDetail, status: action.approved ? 'MENUNGGU_PPTK' : 'DITOLAK_VERIFIKATOR' },
      });
    }
    return;
  }

  // Step G: PPTK decision
  @Action(PptkDecision)
  pptkDecision(ctx: StateContext<WorkOrdersStateModel>, action: PptkDecision) {
    if (!this.env.previewMode) {
      return this.data.pptkApprove(action.workOrderId, action.approved, action.komentar, action.alasan).pipe(
        tap(() => ctx.dispatch(new GetWorkOrderDetail(action.workOrderId))),
      );
    }
    const currentDetail = ctx.getState().detail;
    if (currentDetail && currentDetail.id === action.workOrderId) {
      ctx.patchState({
        detail: { ...currentDetail, status: action.approved ? 'DISETUJUI_PPTK' : 'DITOLAK_PPTK' },
      });
    }
    return;
  }
}
