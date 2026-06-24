import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { map, tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { DRAFT_CHECKLIST_DATA, type DraftChecklistDataPort } from '@core/data-access/ports/draft-checklist-data.port';

import {
  ApproveDraft,
  CreateDraftChecklist,
  LoadDraftChecklist,
  RejectDraft,
  SubmitDraft,
} from './draft-checklist.actions';

type DraftChecklistStatus = 'DRAFT' | 'DIKIRIM' | 'DISETUJUI' | 'DITOLAK';

export interface DraftChecklistItem {
  namaKerusakan?: string;
  namaSparepart?: string;
  tindakanPerbaikan?: string;
  hargaItem: number;
  fotoIds?: number[];
  fotos?: { imageId: number; url?: string }[];
}

export interface DraftChecklistRecord {
  id: string;
  workOrderId: string;
  versi: number;
  status: DraftChecklistStatus;
  totalHarga: number;
  notesRejection?: string;
  items: DraftChecklistItem[];
  createdAt: string;
}

export interface DraftChecklistStateModel {
  list: DraftChecklistRecord[];
}

const INITIAL: DraftChecklistStateModel = { list: [] };

@State<DraftChecklistStateModel>({
  name: 'draftChecklist',
  defaults: INITIAL,
})
@Injectable()
export class DraftChecklistState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<DraftChecklistDataPort>(DRAFT_CHECKLIST_DATA);

  @Selector()
  static list(state: DraftChecklistStateModel): DraftChecklistRecord[] {
    return state.list;
  }

  @Selector()
  static byWorkOrder(state: DraftChecklistStateModel) {
    return (workOrderId: string): DraftChecklistRecord[] =>
      state.list
        .filter((item) => String(item.workOrderId) === String(workOrderId))
        .sort((a, b) => b.versi - a.versi);
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<DraftChecklistStateModel>, action: HydrateFromFixtures): void {
    const list = (action.payload.draftChecklists ?? []) as DraftChecklistRecord[];
    ctx.patchState({ list });
  }

  @Action(LoadDraftChecklist)
  load(ctx: StateContext<DraftChecklistStateModel>, action: LoadDraftChecklist) {
    if (this.env.previewMode) return;
    return this.data.listByWorkOrder(action.workOrderId).pipe(
      map((rows) => rows as DraftChecklistRecord[]),
      tap((rows) => {
        const others = ctx.getState().list.filter((item) => String(item.workOrderId) !== String(action.workOrderId));
        ctx.patchState({ list: [...rows, ...others] });
      }),
    );
  }

  @Action(CreateDraftChecklist)
  create(ctx: StateContext<DraftChecklistStateModel>, action: CreateDraftChecklist) {
    if (!this.env.previewMode) {
      return this.data.create(action.workOrderId, action.payload).pipe(
        tap(() => {
          ctx.dispatch(new LoadDraftChecklist(action.workOrderId));
        }),
      );
    }

    const current = ctx.getState().list.filter((it) => String(it.workOrderId) === String(action.workOrderId));
    const nextVersion = current.length === 0 ? 1 : Math.max(...current.map((it) => it.versi)) + 1;
    const items = ((action.payload['items'] as DraftChecklistItem[]) ?? []).map((item) => ({ ...item }));
    const totalHarga = items.reduce((sum, item) => sum + Number(item.hargaItem ?? 0), 0);
    const next: DraftChecklistRecord = {
      id: `dc-${action.workOrderId}-${nextVersion}`,
      workOrderId: action.workOrderId,
      versi: nextVersion,
      status: 'DRAFT',
      totalHarga,
      items,
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ list: [next, ...ctx.getState().list] });
    return;
  }

  @Action(SubmitDraft)
  submit(ctx: StateContext<DraftChecklistStateModel>, action: SubmitDraft) {
    if (!this.env.previewMode) {
      return this.data.submit(action.id).pipe(
        tap(() => {
          const target = ctx.getState().list.find((item) => item.id === action.id);
          if (!target) return;
          ctx.dispatch(new LoadDraftChecklist(target.workOrderId));
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id && item.status === 'DRAFT'
          ? { ...item, status: 'DIKIRIM' as const }
          : item,
      ),
    });
    return;
  }

  @Action(ApproveDraft)
  approve(ctx: StateContext<DraftChecklistStateModel>, action: ApproveDraft) {
    if (!this.env.previewMode) {
      return this.data.approve(action.id).pipe(
        tap(() => {
          const target = ctx.getState().list.find((item) => item.id === action.id);
          if (!target) return;
          ctx.dispatch(new LoadDraftChecklist(target.workOrderId));
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id && item.status === 'DIKIRIM'
          ? { ...item, status: 'DISETUJUI' as const, notesRejection: undefined }
          : item,
      ),
    });
    return;
  }

  @Action(RejectDraft)
  reject(ctx: StateContext<DraftChecklistStateModel>, action: RejectDraft) {
    if (!this.env.previewMode) {
      return this.data.reject(action.id, { notesRejection: action.notesRejection }).pipe(
        tap(() => {
          const target = ctx.getState().list.find((item) => item.id === action.id);
          if (!target) return;
          ctx.dispatch(new LoadDraftChecklist(target.workOrderId));
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id && item.status === 'DIKIRIM'
          ? { ...item, status: 'DITOLAK' as const, notesRejection: action.notesRejection }
          : item,
      ),
    });
    return;
  }
}
