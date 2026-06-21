import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { PEMBAYARAN_DATA, type PembayaranDataPort } from '@core/data-access/ports/pembayaran-data.port';

import {
  LoadPembayaran,
  ProsesPembayaran,
  UploadBuktiTransfer,
} from './pembayaran.actions';

type PembayaranStatus = 'MENUNGGU' | 'PAID';

export interface PembayaranRecord {
  workOrderId: string;
  metodePembayaran?: string;
  totalDibayar: number;
  tanggalPembayaran?: string;
  buktiTransferId?: string;
  status: PembayaranStatus;
}

interface PembayaranStateModel {
  list: PembayaranRecord[];
}

const INITIAL: PembayaranStateModel = { list: [] };

@State<PembayaranStateModel>({ name: 'pembayaran', defaults: INITIAL })
@Injectable()
export class PembayaranState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<PembayaranDataPort>(PEMBAYARAN_DATA);

  @Selector()
  static list(state: PembayaranStateModel): PembayaranRecord[] {
    return state.list;
  }

  @Selector()
  static byWorkOrder(state: PembayaranStateModel) {
    return (workOrderId: string): PembayaranRecord | null =>
      state.list.find((item) => item.workOrderId === workOrderId) ?? null;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<PembayaranStateModel>, action: HydrateFromFixtures): void {
    const list = (action.payload.pembayaran ?? []) as PembayaranRecord[];
    ctx.patchState({ list });
  }

  @Action(LoadPembayaran)
  load(ctx: StateContext<PembayaranStateModel>, action: LoadPembayaran) {
    if (this.env.previewMode) return;
    return this.data.detail(action.workOrderId).pipe(
      tap((raw) => {
        const detail = raw as PembayaranRecord;
        const current = ctx.getState().list.filter((item) => item.workOrderId !== action.workOrderId);
        ctx.patchState({ list: [detail, ...current] });
      }),
    );
  }

  @Action(ProsesPembayaran)
  proses(ctx: StateContext<PembayaranStateModel>, action: ProsesPembayaran) {
    if (!this.env.previewMode) {
      return this.data.proses(action.workOrderId, action.payload).pipe(
        tap(() => {
          const current = ctx.getState().list.find((item) => item.workOrderId === action.workOrderId);
          const base: PembayaranRecord = current ?? {
            workOrderId: action.workOrderId,
            totalDibayar: 0,
            status: 'MENUNGGU',
          };
          const updated: PembayaranRecord = {
            ...base,
            metodePembayaran: (action.payload['metodePembayaran'] as string | undefined) ?? base.metodePembayaran,
            totalDibayar: Number(action.payload['totalDibayar'] ?? base.totalDibayar),
            tanggalPembayaran: (action.payload['tanggalPembayaran'] as string | undefined) ?? new Date().toISOString(),
            status: 'MENUNGGU',
          };
          const list = current
            ? ctx.getState().list.map((item) => (item.workOrderId === action.workOrderId ? updated : item))
            : [updated, ...ctx.getState().list];
          ctx.patchState({ list });
        }),
      );
    }

    const current = ctx.getState().list.find((item) => item.workOrderId === action.workOrderId);
    const base: PembayaranRecord = current ?? {
      workOrderId: action.workOrderId,
      totalDibayar: 0,
      status: 'MENUNGGU',
    };
    const updated: PembayaranRecord = {
      ...base,
      metodePembayaran: (action.payload['metodePembayaran'] as string | undefined) ?? base.metodePembayaran,
      totalDibayar: Number(action.payload['totalDibayar'] ?? base.totalDibayar),
      tanggalPembayaran: (action.payload['tanggalPembayaran'] as string | undefined) ?? new Date().toISOString(),
      status: 'MENUNGGU',
    };
    const list = current
      ? ctx.getState().list.map((item) => (item.workOrderId === action.workOrderId ? updated : item))
      : [updated, ...ctx.getState().list];
    ctx.patchState({ list });
    return;
  }

  @Action(UploadBuktiTransfer)
  uploadBukti(ctx: StateContext<PembayaranStateModel>, action: UploadBuktiTransfer) {
    if (!this.env.previewMode) {
      return this.data.bukti(action.workOrderId, action.payload).pipe(
        tap(() => {
          ctx.patchState({
            list: ctx.getState().list.map((item) =>
              item.workOrderId === action.workOrderId
                ? {
                    ...item,
                    buktiTransferId: (action.payload['buktiTransferId'] as string | undefined) ?? item.buktiTransferId,
                    status: 'PAID' as const,
                  }
                : item,
            ),
          });
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        item.workOrderId === action.workOrderId
          ? {
              ...item,
              buktiTransferId: (action.payload['buktiTransferId'] as string | undefined) ?? item.buktiTransferId,
              status: 'PAID' as const,
            }
          : item,
      ),
    });
    return;
  }
}
