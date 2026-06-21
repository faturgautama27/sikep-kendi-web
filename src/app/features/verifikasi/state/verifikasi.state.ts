import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { VERIFIKASI_DATA, type VerifikasiDataPort } from '@core/data-access/ports/verifikasi-data.port';

import {
  LoadVerifikasi,
  MintaRevisiVerifikasi,
  SetujuiVerifikasi,
  SimpanShs,
} from './verifikasi.actions';

type VerifikasiStatus = 'DRAFT_SHS' | 'DISETUJUI' | 'REVISI_DIMINTA';

export interface VerifikasiRecord {
  workOrderId: string;
  status: VerifikasiStatus;
  catatanRevisi?: string;
  shsItems: Record<string, unknown>[];
}

interface VerifikasiStateModel {
  list: VerifikasiRecord[];
}

const INITIAL: VerifikasiStateModel = { list: [] };

@State<VerifikasiStateModel>({ name: 'verifikasi', defaults: INITIAL })
@Injectable()
export class VerifikasiState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<VerifikasiDataPort>(VERIFIKASI_DATA);

  @Selector()
  static list(state: VerifikasiStateModel): VerifikasiRecord[] {
    return state.list;
  }

  @Selector()
  static byWorkOrder(state: VerifikasiStateModel) {
    return (workOrderId: string): VerifikasiRecord | null =>
      state.list.find((it) => it.workOrderId === workOrderId) ?? null;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<VerifikasiStateModel>, action: HydrateFromFixtures): void {
    const list = (action.payload.verifikasiHarga ?? []) as VerifikasiRecord[];
    ctx.patchState({ list });
  }

  @Action(LoadVerifikasi)
  load(ctx: StateContext<VerifikasiStateModel>, action: LoadVerifikasi) {
    if (this.env.previewMode) return;
    return this.data.detail(action.workOrderId).pipe(
      tap((raw) => {
        const record = raw as VerifikasiRecord;
        const current = ctx.getState().list.filter((item) => item.workOrderId !== action.workOrderId);
        ctx.patchState({ list: [record, ...current] });
      }),
    );
  }

  @Action(SimpanShs)
  simpanShs(ctx: StateContext<VerifikasiStateModel>, action: SimpanShs) {
    if (!this.env.previewMode) {
      return this.data.shs(action.workOrderId, { items: action.items }).pipe(
        tap(() => {
          const current = ctx.getState().list.find((item) => item.workOrderId === action.workOrderId);
          if (!current) {
            ctx.patchState({
              list: [
                {
                  workOrderId: action.workOrderId,
                  status: 'DRAFT_SHS',
                  shsItems: action.items,
                },
                ...ctx.getState().list,
              ],
            });
            return;
          }

          ctx.patchState({
            list: ctx.getState().list.map((item) =>
              item.workOrderId === action.workOrderId ? { ...item, shsItems: action.items } : item,
            ),
          });
        }),
      );
    }

    const current = ctx.getState().list.find((item) => item.workOrderId === action.workOrderId);
    if (!current) {
      ctx.patchState({
        list: [
          {
            workOrderId: action.workOrderId,
            status: 'DRAFT_SHS',
            shsItems: action.items,
          },
          ...ctx.getState().list,
        ],
      });
      return;
    }
    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.workOrderId === action.workOrderId ? { ...item, shsItems: action.items } : item,
      ),
    });
    return;
  }

  @Action(SetujuiVerifikasi)
  setujui(ctx: StateContext<VerifikasiStateModel>, action: SetujuiVerifikasi) {
    if (!this.env.previewMode) {
      return this.data.approve(action.workOrderId).pipe(
        tap(() => {
          ctx.patchState({
            list: ctx.getState().list.map((item) =>
              item.workOrderId === action.workOrderId
                ? { ...item, status: 'DISETUJUI' as const, catatanRevisi: undefined }
                : item,
            ),
          });
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.workOrderId === action.workOrderId
          ? { ...item, status: 'DISETUJUI' as const, catatanRevisi: undefined }
          : item,
      ),
    });
    return;
  }

  @Action(MintaRevisiVerifikasi)
  mintaRevisi(ctx: StateContext<VerifikasiStateModel>, action: MintaRevisiVerifikasi) {
    if (!this.env.previewMode) {
      return this.data.revisi(action.workOrderId, { catatanRevisi: action.catatanRevisi }).pipe(
        tap(() => {
          ctx.patchState({
            list: ctx.getState().list.map((item) =>
              item.workOrderId === action.workOrderId
                ? { ...item, status: 'REVISI_DIMINTA' as const, catatanRevisi: action.catatanRevisi }
                : item,
            ),
          });
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.workOrderId === action.workOrderId
          ? { ...item, status: 'REVISI_DIMINTA' as const, catatanRevisi: action.catatanRevisi }
          : item,
      ),
    });
    return;
  }
}
