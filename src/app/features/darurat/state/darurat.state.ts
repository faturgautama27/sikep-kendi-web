import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { DARURAT_DATA, type DaruratDataPort } from '@core/data-access/ports/darurat-data.port';

import {
  ApproveReimburseDarurat,
  CreateDarurat,
  LoadDarurat,
  VerifikasiDarurat,
} from './darurat.actions';

type DaruratStatus =
  | 'MENUNGGU_VERIFIKASI'
  | 'TERVERIFIKASI'
  | 'DITOLAK'
  | 'REIMBURSE_APPROVED';

export interface DaruratRecord {
  id: string;
  kendaraanId: string;
  kendaraanLabel: string;
  pengemudiNama: string;
  deskripsiDarurat: string;
  lokasiKejadian?: string;
  totalPengeluaran: number;
  status: DaruratStatus;
  catatanVerifikasi?: string;
  createdAt: string;
}

interface DaruratStateModel {
  list: DaruratRecord[];
}

const INITIAL: DaruratStateModel = { list: [] };

@State<DaruratStateModel>({ name: 'darurat', defaults: INITIAL })
@Injectable()
export class DaruratState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<DaruratDataPort>(DARURAT_DATA);

  @Selector()
  static list(state: DaruratStateModel): DaruratRecord[] {
    return state.list;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<DaruratStateModel>, action: HydrateFromFixtures): void {
    const list = (action.payload.darurat ?? []) as DaruratRecord[];
    ctx.patchState({ list });
  }

  @Action(LoadDarurat)
  load(ctx: StateContext<DaruratStateModel>) {
    if (this.env.previewMode) return;
    return this.data.list().pipe(
      tap((raw) => {
        const asArray = Array.isArray(raw)
          ? (raw as DaruratRecord[])
          : (((raw as { data?: DaruratRecord[] }).data ?? []) as DaruratRecord[]);
        ctx.patchState({ list: asArray });
      }),
    );
  }

  @Action(CreateDarurat)
  create(ctx: StateContext<DaruratStateModel>, action: CreateDarurat) {
    if (!this.env.previewMode) {
      return this.data.create(action.payload).pipe(
        tap((raw) => {
          const created = raw as DaruratRecord;
          ctx.patchState({ list: [created, ...ctx.getState().list] });
          ctx.dispatch(new LoadDarurat());
        }),
      );
    }

    const next: DaruratRecord = {
      id: `drt-${Date.now()}`,
      kendaraanId: String(action.payload['kendaraanId'] ?? 'unknown'),
      kendaraanLabel: String(action.payload['kendaraanLabel'] ?? '-'),
      pengemudiNama: String(action.payload['pengemudiNama'] ?? 'Pengemudi'),
      deskripsiDarurat: String(action.payload['deskripsiDarurat'] ?? '-'),
      lokasiKejadian: String(action.payload['lokasiKejadian'] ?? ''),
      totalPengeluaran: Number(action.payload['totalPengeluaran'] ?? 0),
      status: 'MENUNGGU_VERIFIKASI',
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ list: [next, ...ctx.getState().list] });
    return;
  }

  @Action(VerifikasiDarurat)
  verifikasi(ctx: StateContext<DaruratStateModel>, action: VerifikasiDarurat) {
    if (!this.env.previewMode) {
      return this.data
        .verifikasi(action.id, { accepted: action.accepted, notes: action.notes })
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
              status: action.accepted ? ('TERVERIFIKASI' as const) : ('DITOLAK' as const),
              catatanVerifikasi: action.notes,
            }
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
        item.id === action.id ? { ...item, status: 'REIMBURSE_APPROVED' as const } : item,
      ),
    });
    return;
  }
}
