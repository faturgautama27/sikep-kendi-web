import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { map, tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import {
  DRAFT_CHECKLIST_DATA,
  type DraftChecklistDataPort,
} from '@core/data-access/ports/draft-checklist-data.port';

import {
  ApproveDraft,
  ApproveDraftPb,
  ApproveDraftPptk,
  CreateDraftChecklist,
  LoadDraftChecklist,
  RejectDraft,
  RejectDraftPb,
  RejectDraftPptk,
  SubmitDraft,
} from './draft-checklist.actions';

export type DraftChecklistStatus =
  | 'DRAFT'
  | 'DIKIRIM'
  | 'DISETUJUI'     // backward-compat (lama)
  | 'DITOLAK'       // backward-compat (lama)
  | 'DISETUJUI_PB'
  | 'DITOLAK_PB'
  | 'DISETUJUI_PPTK'
  | 'DITOLAK_PPTK';

export interface DraftChecklistItem {
  namaKerusakan?: string;
  namaSparepart?: string;
  tindakanPerbaikan?: string;
  jenis?: string | null;
  uraian?: string;
  qty?: number;
  harga?: number;
  diskon?: number;
  subTotal?: number;
  hargaItem: number;        // backward-compat / display value
  fotoIds?: number[];
  fotos?: {
    imageId: number;
    url?: string;
    fileName?: string;
    mimeType?: string;
    image?: { signedUrl?: string; mimeType?: string; originalFilename?: string };
  }[];
}

export interface DraftChecklistRecord {
  id: string;
  workOrderId: string;
  versi: number;
  status: DraftChecklistStatus;
  totalHarga: number;
  notesRejection?: string;
  // PB review fields
  reviewOlehId?: string | null;
  reviewAt?: string | null;
  // PPTK review fields
  pptkId?: string | null;
  pptkAt?: string | null;
  pptkCatatan?: string | null;
  pptkAlasanPenolakan?: string | null;
  items: DraftChecklistItem[];
  createdAt: string;
  scanDraftImageId?: number | null;
  scanDraftImageUrl?: string | null;
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
        const others = ctx
          .getState()
          .list.filter((item) => String(item.workOrderId) !== String(action.workOrderId));
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

    const current = ctx
      .getState()
      .list.filter((it) => String(it.workOrderId) === String(action.workOrderId));
    const nextVersion = current.length === 0 ? 1 : Math.max(...current.map((it) => it.versi)) + 1;
    const items = ((action.payload['items'] as DraftChecklistItem[]) ?? []).map((item) => ({
      ...item,
    }));
    const totalHargaManual = action.payload['totalHargaManual'] as number | undefined;
    const totalHarga =
      items.length > 0
        ? items.reduce((sum, item) => {
            const h = item.harga ?? item.hargaItem ?? 0;
            const q = item.qty ?? 1;
            const d = item.diskon ?? 0;
            return sum + (item.subTotal ?? h * q * (1 - d / 100));
          }, 0)
        : (totalHargaManual ?? 0);
    const next: DraftChecklistRecord = {
      id: `dc-${action.workOrderId}-${nextVersion}`,
      workOrderId: action.workOrderId,
      versi: nextVersion,
      status: 'DRAFT',
      totalHarga,
      items,
      createdAt: new Date().toISOString(),
      scanDraftImageId: (action.payload['scanDraftImageId'] as number | undefined) ?? null,
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
      list: ctx
        .getState()
        .list.map((item) =>
          item.id === action.id && item.status === 'DRAFT'
            ? { ...item, status: 'DIKIRIM' as const }
            : item,
        ),
    });
    return;
  }

  // ── Approve PB ─────────────────────────────────────────────────────────────

  /** @deprecated gunakan ApproveDraftPb */
  @Action(ApproveDraft)
  approveLegacy(ctx: StateContext<DraftChecklistStateModel>, action: ApproveDraft) {
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
      list: ctx
        .getState()
        .list.map((item) =>
          item.id === action.id && item.status === 'DIKIRIM'
            ? { ...item, status: 'DISETUJUI_PB' as const }
            : item,
        ),
    });
    return;
  }

  @Action(ApproveDraftPb)
  approvePb(ctx: StateContext<DraftChecklistStateModel>, action: ApproveDraftPb) {
    if (!this.env.previewMode) {
      return this.data.approvePb(action.workOrderId, action.id).pipe(
        tap(() => ctx.dispatch(new LoadDraftChecklist(action.workOrderId))),
      );
    }

    ctx.patchState({
      list: ctx
        .getState()
        .list.map((item) =>
          item.id === action.id && item.status === 'DIKIRIM'
            ? { ...item, status: 'DISETUJUI_PB' as const }
            : item,
        ),
    });
    return;
  }

  // ── Reject PB ──────────────────────────────────────────────────────────────

  /** @deprecated gunakan RejectDraftPb */
  @Action(RejectDraft)
  rejectLegacy(ctx: StateContext<DraftChecklistStateModel>, action: RejectDraft) {
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
      list: ctx
        .getState()
        .list.map((item) =>
          item.id === action.id && item.status === 'DIKIRIM'
            ? { ...item, status: 'DITOLAK_PB' as const, notesRejection: action.notesRejection }
            : item,
        ),
    });
    return;
  }

  @Action(RejectDraftPb)
  rejectPb(ctx: StateContext<DraftChecklistStateModel>, action: RejectDraftPb) {
    if (!this.env.previewMode) {
      return this.data
        .rejectPb(action.workOrderId, action.id, { notesRejection: action.notesRejection })
        .pipe(tap(() => ctx.dispatch(new LoadDraftChecklist(action.workOrderId))));
    }

    ctx.patchState({
      list: ctx
        .getState()
        .list.map((item) =>
          item.id === action.id && item.status === 'DIKIRIM'
            ? { ...item, status: 'DITOLAK_PB' as const, notesRejection: action.notesRejection }
            : item,
        ),
    });
    return;
  }

  // ── Approve PPTK ───────────────────────────────────────────────────────────

  @Action(ApproveDraftPptk)
  approvePptk(ctx: StateContext<DraftChecklistStateModel>, action: ApproveDraftPptk) {
    if (!this.env.previewMode) {
      return this.data
        .approvePptk(action.workOrderId, action.id, { pptkCatatan: action.pptkCatatan })
        .pipe(tap(() => ctx.dispatch(new LoadDraftChecklist(action.workOrderId))));
    }

    ctx.patchState({
      list: ctx
        .getState()
        .list.map((item) =>
          item.id === action.id && item.status === 'DISETUJUI_PB'
            ? {
                ...item,
                status: 'DISETUJUI_PPTK' as const,
                pptkCatatan: action.pptkCatatan ?? null,
              }
            : item,
        ),
    });
    return;
  }

  // ── Reject PPTK ────────────────────────────────────────────────────────────

  @Action(RejectDraftPptk)
  rejectPptk(ctx: StateContext<DraftChecklistStateModel>, action: RejectDraftPptk) {
    if (!this.env.previewMode) {
      return this.data
        .rejectPptk(action.workOrderId, action.id, {
          pptkAlasanPenolakan: action.pptkAlasanPenolakan,
        })
        .pipe(tap(() => ctx.dispatch(new LoadDraftChecklist(action.workOrderId))));
    }

    ctx.patchState({
      list: ctx
        .getState()
        .list.map((item) =>
          item.id === action.id && item.status === 'DISETUJUI_PB'
            ? {
                ...item,
                status: 'DITOLAK_PPTK' as const,
                pptkAlasanPenolakan: action.pptkAlasanPenolakan,
              }
            : item,
        ),
    });
    return;
  }
}
