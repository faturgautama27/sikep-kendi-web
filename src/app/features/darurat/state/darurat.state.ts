import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { DARURAT_DATA, type DaruratDataPort } from '@core/data-access/ports/darurat-data.port';
import { LaporanDarurat } from '@shared/models';

import {
  CreateDarurat,
  UpdateDarurat,
  LoadDarurat,
  GetLaporanDaruratDetail,
  VerifikasiDaruratFaseA,
  SubmitReimbursementDarurat,
  InputShsDarurat,
  VerifikasiVerifikatorDarurat,
  PptkApproveDarurat,
  UploadBuktiPembayaranDarurat,
} from './darurat.actions';

interface DaruratStateModel {
  list: LaporanDarurat[];
  detail: LaporanDarurat | null;
}

const INITIAL: DaruratStateModel = { list: [], detail: null };

@State<DaruratStateModel>({ name: 'darurat', defaults: INITIAL })
@Injectable()
export class DaruratState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<DaruratDataPort>(DARURAT_DATA);

  @Selector()
  static list(state: DaruratStateModel): LaporanDarurat[] {
    return state.list;
  }

  @Selector()
  static detail(state: DaruratStateModel): LaporanDarurat | null {
    return state.detail;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<DaruratStateModel>, action: HydrateFromFixtures): void {
    const list = (action.payload.darurat ?? []) as LaporanDarurat[];
    ctx.patchState({ list });
  }

  @Action(LoadDarurat)
  load(ctx: StateContext<DaruratStateModel>, action: LoadDarurat) {
    if (this.env.previewMode) return;
    return this.data.list(action.query).pipe(
      tap((raw) => {
        ctx.patchState({ list: raw });
      }),
    );
  }

  @Action(GetLaporanDaruratDetail)
  getDetail(ctx: StateContext<DaruratStateModel>, action: GetLaporanDaruratDetail) {
    if (!this.env.previewMode) {
      return this.data.detail(action.id).pipe(
        tap((detail) => {
          ctx.patchState({ detail });
        })
      );
    }
    
    // Preview Mode
    const existing = ctx.getState().list.find(d => d.id === action.id);
    if (existing) {
      ctx.patchState({ detail: existing });
    } else {
      ctx.patchState({ detail: { id: action.id } as LaporanDarurat });
    }
    return;
  }

  @Action(CreateDarurat)
  create(ctx: StateContext<DaruratStateModel>, action: CreateDarurat) {
    if (!this.env.previewMode) {
      return this.data.create(action.payload).pipe(
        tap((raw) => {
          ctx.patchState({ list: [raw, ...ctx.getState().list] });
          ctx.dispatch(new LoadDarurat());
        }),
      );
    }

    const next = {
      ...action.payload,
      id: `drt-${Date.now()}`,
      status: 'MENUNGGU_VERIFIKASI_PB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as LaporanDarurat;
    ctx.patchState({ list: [next, ...ctx.getState().list] });
    return;
  }

  @Action(UpdateDarurat)
  update(ctx: StateContext<DaruratStateModel>, action: UpdateDarurat) {
    if (!this.env.previewMode) {
      return this.data.update(action.id, action.payload).pipe(
        tap((updated) => {
          const list = [...ctx.getState().list];
          const idx = list.findIndex(d => d.id === action.id);
          if (idx !== -1) {
            list[idx] = updated;
            ctx.patchState({ list });
          }
          ctx.dispatch(new LoadDarurat());
        }),
      );
    }

    const list = [...ctx.getState().list];
    const idx = list.findIndex(d => d.id === action.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...action.payload } as LaporanDarurat;
      ctx.patchState({ list });
    }
    return;
  }

  @Action(VerifikasiDaruratFaseA)
  verifikasiFaseA(ctx: StateContext<DaruratStateModel>, action: VerifikasiDaruratFaseA) {
    if (!this.env.previewMode) {
      return this.data.verifikasiFaseA(action.id, action.approved, action.alasan, action.komentar).pipe(
        tap(() => ctx.dispatch(new GetLaporanDaruratDetail(action.id))),
      );
    }
    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id ? { ...item, status: action.approved ? 'DISETUJUI_PB' : 'DITOLAK_PB' } as LaporanDarurat : item,
      ),
      detail: ctx.getState().detail?.id === action.id 
        ? { ...ctx.getState().detail!, status: action.approved ? 'DISETUJUI_PB' : 'DITOLAK_PB' } 
        : ctx.getState().detail
    });
    return;
  }

  @Action(SubmitReimbursementDarurat)
  submitReimbursement(ctx: StateContext<DaruratStateModel>, action: SubmitReimbursementDarurat) {
    if (!this.env.previewMode) {
      return this.data.submitReimbursement(action.id, action.payload).pipe(
        tap(() => ctx.dispatch(new GetLaporanDaruratDetail(action.id))),
      );
    }
    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id ? { ...item, status: 'REIMBURSEMENT_DIAJUKAN' } as LaporanDarurat : item,
      ),
      detail: ctx.getState().detail?.id === action.id 
        ? { ...ctx.getState().detail!, status: 'REIMBURSEMENT_DIAJUKAN' } 
        : ctx.getState().detail
    });
    return;
  }

  @Action(InputShsDarurat)
  inputShs(ctx: StateContext<DaruratStateModel>, action: InputShsDarurat) {
    if (!this.env.previewMode) {
      return this.data.inputShs(action.id, action.items).pipe(
        tap(() => ctx.dispatch(new GetLaporanDaruratDetail(action.id))),
      );
    }
    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id ? { ...item, status: 'SHS_DIKERJAKAN' } as LaporanDarurat : item,
      ),
      detail: ctx.getState().detail?.id === action.id 
        ? { ...ctx.getState().detail!, status: 'SHS_DIKERJAKAN' } 
        : ctx.getState().detail
    });
    return;
  }

  @Action(VerifikasiVerifikatorDarurat)
  verifikasiVerifikator(ctx: StateContext<DaruratStateModel>, action: VerifikasiVerifikatorDarurat) {
    if (!this.env.previewMode) {
      return this.data.verifikasiVerifikator(action.id, action.approved, action.alasan, action.komentar).pipe(
        tap(() => ctx.dispatch(new GetLaporanDaruratDetail(action.id))),
      );
    }
    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id ? { ...item, status: action.approved ? 'MENUNGGU_PPTK' : 'DITOLAK_VERIFIKATOR' } as LaporanDarurat : item,
      ),
      detail: ctx.getState().detail?.id === action.id 
        ? { ...ctx.getState().detail!, status: action.approved ? 'MENUNGGU_PPTK' : 'DITOLAK_VERIFIKATOR' } 
        : ctx.getState().detail
    });
    return;
  }

  @Action(PptkApproveDarurat)
  pptkApprove(ctx: StateContext<DaruratStateModel>, action: PptkApproveDarurat) {
    if (!this.env.previewMode) {
      return this.data.pptkApprove(action.id, action.approved, action.alasan, action.komentar).pipe(
        tap(() => ctx.dispatch(new GetLaporanDaruratDetail(action.id))),
      );
    }
    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id ? { ...item, status: action.approved ? 'DISETUJUI_PPTK' : 'DITOLAK_PPTK' } as LaporanDarurat : item,
      ),
      detail: ctx.getState().detail?.id === action.id 
        ? { ...ctx.getState().detail!, status: action.approved ? 'DISETUJUI_PPTK' : 'DITOLAK_PPTK' } 
        : ctx.getState().detail
    });
    return;
  }

  @Action(UploadBuktiPembayaranDarurat)
  uploadBuktiPembayaran(ctx: StateContext<DaruratStateModel>, action: UploadBuktiPembayaranDarurat) {
    if (!this.env.previewMode) {
      return this.data.uploadBuktiPembayaran(action.id, action.imageId).pipe(
        tap(() => ctx.dispatch(new GetLaporanDaruratDetail(action.id))),
      );
    }
    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id ? { ...item, status: 'DIBAYAR' } as LaporanDarurat : item,
      ),
      detail: ctx.getState().detail?.id === action.id 
        ? { ...ctx.getState().detail!, status: 'DIBAYAR' } 
        : ctx.getState().detail
    });
    return;
  }
}
