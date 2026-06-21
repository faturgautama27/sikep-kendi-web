import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { Pengajuan, ApprovalPolicy, ApprovalStep } from '@shared/models';

import {
  LoadPengajuan,
  CreatePengajuan,
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

@State<PengajuanStateModel>({ name: 'pengajuan', defaults: INITIAL })
@Injectable()
export class PengajuanState {
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
      approvalSteps: steps.filter((s) => s.pengajuanId === p.id),
    }));
    ctx.patchState({
      list: enriched,
      approvalSteps: steps,
      approvalPolicies: action.payload.approvalPolicies as ApprovalPolicy[],
    });
  }

  @Action(LoadPengajuan)
  load(_ctx: StateContext<PengajuanStateModel>, _action: LoadPengajuan) {}

  @Action(CreatePengajuan)
  create(ctx: StateContext<PengajuanStateModel>, action: CreatePengajuan) {
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
          ? { ...p, status: 'awaiting_approval' as const, approvalSteps: newSteps, submittedAt: new Date().toISOString() }
          : p,
      ),
      approvalSteps: [...state.approvalSteps, ...newSteps],
    });
  }

  @Action(ApprovePengajuan)
  approve(ctx: StateContext<PengajuanStateModel>, action: ApprovePengajuan) {
    const state = ctx.getState();
    const target = state.list.find((p) => p.id === action.id);
    if (!target) return;
    const updatedSteps = target.approvalSteps.map((s) =>
      s.jenjangNo === action.jenjangNo
        ? {
            ...s,
            decision: 'approved' as const,
            decidedAt: new Date().toISOString(),
            comment: action.comment,
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
              status: allApproved ? ('approved' as const) : p.status,
              approvedAt: allApproved ? new Date().toISOString() : p.approvedAt,
            }
          : p,
      ),
    });
  }

  @Action(RejectPengajuan)
  reject(ctx: StateContext<PengajuanStateModel>, action: RejectPengajuan) {
    const state = ctx.getState();
    ctx.patchState({
      list: state.list.map((p) =>
        p.id === action.id
          ? {
              ...p,
              status: 'rejected' as const,
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
  }

  @Action(UpdateApprovalPolicies)
  updatePolicies(ctx: StateContext<PengajuanStateModel>, action: UpdateApprovalPolicies) {
    ctx.patchState({ approvalPolicies: action.policies });
  }
}
