import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { PENGAJUAN_DATA, type PengajuanDataPort } from '@core/data-access/ports/pengajuan-data.port';
import type { Pengajuan, ApprovalPolicy, ApprovalStep } from '@shared/models';

import {
  LoadPengajuan,
  CreatePengajuan,
  UpdatePengajuan,
  SubmitPengajuan,
  ApprovePengajuan,
  RejectPengajuan,
  UpdateApprovalPolicies,
} from './pengajuan.actions';

export interface PengajuanStateModel {
  list: Pengajuan[];
  approvalSteps: ApprovalStep[];
  approvalPolicies: ApprovalPolicy[];
}

const INITIAL: PengajuanStateModel = { list: [], approvalSteps: [], approvalPolicies: [] };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function generatePengajuanNomor(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `PMNT-${year}-${seq}`;
}

function normalizeStatus(rawStatus: string): Pengajuan['status'] {
  switch (rawStatus) {
    case 'submitted':
    case 'awaiting_approval':
      return 'menunggu_verifikasi';
    case 'approved':
    case 'closed':
      return 'terverifikasi';
    case 'rejected':
      return 'ditolak';
    case 'in_work_order':
      return 'work_order_terbuat';
    default:
      return 'draft';
  }
}

@State<PengajuanStateModel>({ name: 'pengajuan', defaults: INITIAL })
@Injectable()
export class PengajuanState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<PengajuanDataPort>(PENGAJUAN_DATA);

  @Selector()
  static list(state: PengajuanStateModel): Pengajuan[] {
    return state.list;
  }

  @Selector()
  static byStatus(state: PengajuanStateModel) {
    return (status: string): Pengajuan[] => state.list.filter((p) => p.status === status);
  }

  @Selector()
  static approvalPolicies(state: PengajuanStateModel): ApprovalPolicy[] {
    return state.approvalPolicies;
  }

  @Selector()
  static approvalSteps(state: PengajuanStateModel): ApprovalStep[] {
    return state.approvalSteps;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<PengajuanStateModel>, action: HydrateFromFixtures) {
    const steps = action.payload.approvalSteps as ApprovalStep[];
    const list = action.payload.pengajuan as Pengajuan[];
    // Attach approvalSteps to each pengajuan based on pengajuanId
    const enriched = list.map((p) => ({
      ...p,
      status: normalizeStatus(p.status),
      approvalSteps: steps.filter((s) => s.pengajuanId === p.id),
    }));
    ctx.patchState({
      list: enriched,
      approvalSteps: steps,
      approvalPolicies: action.payload.approvalPolicies as ApprovalPolicy[],
    });
  }

  @Action(LoadPengajuan)
  load(ctx: StateContext<PengajuanStateModel>, action: LoadPengajuan) {
    if (this.env.previewMode) return;
    return this.data.list(action.filter).pipe(
      tap((list) => {
        ctx.patchState({ list });
      }),
    );
  }

  @Action(CreatePengajuan)
  create(ctx: StateContext<PengajuanStateModel>, action: CreatePengajuan) {
    if (!this.env.previewMode) {
      return this.data.create(action.input).pipe(
        tap((created) => {
          ctx.patchState({ list: [created, ...ctx.getState().list] });
          ctx.dispatch(new LoadPengajuan());
        }),
      );
    }

    const newP: Pengajuan = {
      ...action.input,
      id: generateId('pmnt'),
      nomor: generatePengajuanNomor(),
      status: 'draft',
      approvalSteps: [],
      workOrderId: null,
      createdAt: new Date().toISOString(),
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
    };
    ctx.patchState({ list: [newP, ...ctx.getState().list] });
    return;
  }

  @Action(UpdatePengajuan)
  update(ctx: StateContext<PengajuanStateModel>, action: UpdatePengajuan) {
    if (!this.env.previewMode) {
      return this.data.update(action.id, action.input).pipe(
        tap((updated) => {
          const list = [...ctx.getState().list];
          const idx = list.findIndex(p => p.id === action.id);
          if (idx !== -1) {
            list[idx] = updated;
            ctx.patchState({ list });
          }
          ctx.dispatch(new LoadPengajuan());
        }),
      );
    }

    const state = ctx.getState();
    const list = [...state.list];
    const idx = list.findIndex(p => p.id === action.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...action.input };
      ctx.patchState({ list });
    }
    return;
  }

  @Action(SubmitPengajuan)
  submit(ctx: StateContext<PengajuanStateModel>, action: SubmitPengajuan) {
    const state = ctx.getState();
    const target = state.list.find((p) => p.id === action.id);
    if (!target) return;
    // Generate approval steps based on policies for jenis ini
    const policies = state.approvalPolicies
      .filter((pol) => pol.jenis === target.jenis && pol.ambangNominalMin <= target.totalEstimasi)
      .sort((a, b) => a.jenjangNo - b.jenjangNo);
    const newSteps: ApprovalStep[] = policies.map((pol) => ({
      id: generateId('astep'),
      pengajuanId: target.id,
      jenjangNo: pol.jenjangNo,
      role: pol.role,
      approverId: null,
      approverName: null,
      decision: 'pending' as const,
      decidedAt: null,
      comment: '',
      ambangNominalMin: pol.ambangNominalMin,
    }));
    ctx.patchState({
      list: state.list.map((p) =>
        p.id === action.id
          ? {
              ...p,
              status: 'menunggu_verifikasi' as const,
              approvalSteps: newSteps,
              submittedAt: new Date().toISOString(),
            }
          : p,
      ),
      approvalSteps: [...state.approvalSteps, ...newSteps],
    });
  }

  @Action(ApprovePengajuan)
  approve(ctx: StateContext<PengajuanStateModel>, action: ApprovePengajuan) {
    if (!this.env.previewMode) {
      return this.data.approve(action.id, action.vendorId, action.komentarVerifikasi).pipe(
        tap(() => {
          ctx.dispatch(new LoadPengajuan());
        }),
      );
    }

    const state = ctx.getState();
    const target = state.list.find((p) => p.id === action.id);
    if (!target) return;
    const updatedSteps = target.approvalSteps.map((s) =>
      s.decision === 'pending'
        ? {
            ...s,
            decision: 'approved' as const,
            decidedAt: new Date().toISOString(),
            comment: action.komentarVerifikasi ?? '',
            approverId: 'preview-user',
            approverName: 'Preview User',
          }
        : s,
    );
    const allApproved = updatedSteps.every((s) => s.decision === 'approved');
    ctx.patchState({
      list: state.list.map((p) =>
        p.id === action.id
          ? {
              ...p,
              approvalSteps: updatedSteps,
              status: allApproved ? ('terverifikasi' as const) : p.status,
              approvedAt: allApproved ? new Date().toISOString() : p.approvedAt,
            }
          : p,
      ),
    });
    return;
  }

  @Action(RejectPengajuan)
  reject(ctx: StateContext<PengajuanStateModel>, action: RejectPengajuan) {
    if (!this.env.previewMode) {
      return this.data.reject(action.id, action.reason).pipe(
        tap(() => {
          ctx.dispatch(new LoadPengajuan());
        }),
      );
    }

    const state = ctx.getState();
    ctx.patchState({
      list: state.list.map((p) =>
        p.id === action.id
          ? {
              ...p,
              status: 'ditolak' as const,
              rejectedAt: new Date().toISOString(),
              approvalSteps: p.approvalSteps.map((s) =>
                s.decision === 'pending'
                  ? {
                      ...s,
                      decision: 'rejected' as const,
                      decidedAt: new Date().toISOString(),
                      comment: action.reason,
                    }
                  : s,
              ),
            }
          : p,
      ),
    });
    return;
  }

  @Action(UpdateApprovalPolicies)
  updatePolicies(ctx: StateContext<PengajuanStateModel>, action: UpdateApprovalPolicies) {
    if (!this.env.previewMode) {
      return this.data.updateApprovalPolicies(action.policies).pipe(
        tap((policies) => {
          ctx.patchState({ approvalPolicies: policies });
        }),
      );
    }

    ctx.patchState({ approvalPolicies: action.policies });
    return;
  }
}
