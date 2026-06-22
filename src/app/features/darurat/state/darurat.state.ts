import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { DARURAT_DATA, type DaruratDataPort } from '@core/data-access/ports/darurat-data.port';
import { LaporanDarurat } from '@shared/models';

import {
  ApproveReimburseDarurat,
  CreateDarurat,
  UpdateDarurat,
  LoadDarurat,
  VerifikasiDarurat,
} from './darurat.actions';

interface DaruratStateModel {
  list: LaporanDarurat[];
}

const INITIAL: DaruratStateModel = { list: [] };

@State<DaruratStateModel>({ name: 'darurat', defaults: INITIAL })
@Injectable()
export class DaruratState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<DaruratDataPort>(DARURAT_DATA);

  @Selector()
  static list(state: DaruratStateModel): LaporanDarurat[] {
    return state.list;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<DaruratStateModel>, action: HydrateFromFixtures): void {
    const list = (action.payload.darurat ?? []) as LaporanDarurat[];
    ctx.patchState({ list });
  }

  @Action(LoadDarurat)
  load(ctx: StateContext<DaruratStateModel>) {
    if (this.env.previewMode) return;
    return this.data.list().pipe(
      tap((raw) => {
        ctx.patchState({ list: raw });
      }),
    );
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
      status: 'MENUNGGU_VERIFIKASI',
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

  @Action(VerifikasiDarurat)
  verifikasi(ctx: StateContext<DaruratStateModel>, action: VerifikasiDarurat) {
    if (!this.env.previewMode) {
      return this.data
        .verifikasi(action.id, action.approved, action.alasan)
        .pipe(
          tap(() => {
            ctx.dispatch(new LoadDarurat());
          }),
        );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: action.approved ? 'TERVERIFIKASI' : 'DITOLAK',
            } as LaporanDarurat
          : item,
      ),
    });
    return;
  }

  @Action(ApproveReimburseDarurat)
  approveReimburse(ctx: StateContext<DaruratStateModel>, action: ApproveReimburseDarurat) {
    if (!this.env.previewMode) {
      return this.data.approveReimbursement(action.id).pipe(
        tap(() => {
          ctx.dispatch(new LoadDarurat());
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.id === action.id ? { ...item, status: 'REIMBURSE_APPROVED' as const } as LaporanDarurat : item,
      ),
    });
    return;
  }
}
