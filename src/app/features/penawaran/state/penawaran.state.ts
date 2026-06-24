import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { map, tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { PENAWARAN_DATA, type PenawaranDataPort } from '@core/data-access/ports/penawaran-data.port';

import {
  CreatePenawaran,
  LoadPenawaran,
  RequestRevisiPenawaran,
  SubmitPenawaran,
  SubmitRevisiPenawaran,
  UploadInvoice,
} from './penawaran.actions';

type PenawaranStatus = 'DRAFT' | 'DIKIRIM' | 'DIVERIFIKASI' | 'REVISI';

export interface PenawaranRecord {
  id: string;
  workOrderId: string;
  versi: number;
  totalBiaya: number;
  status: PenawaranStatus;
  catatanPerubahan?: string;
  nomorInvoice?: string;
  createdAt: string;
}

interface PenawaranStateModel {
  list: PenawaranRecord[];
}

const INITIAL: PenawaranStateModel = { list: [] };

@State<PenawaranStateModel>({ name: 'penawaran', defaults: INITIAL })
@Injectable()
export class PenawaranState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<PenawaranDataPort>(PENAWARAN_DATA);

  @Selector()
  static list(state: PenawaranStateModel): PenawaranRecord[] {
    return state.list;
  }

  @Selector()
  static byWorkOrder(state: PenawaranStateModel) {
    return (workOrderId: string): PenawaranRecord[] =>
      state.list.filter((item) => String(item.workOrderId) === String(workOrderId)).sort((a, b) => b.versi - a.versi);
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<PenawaranStateModel>, action: HydrateFromFixtures): void {
    const list = (action.payload.penawaran ?? []) as PenawaranRecord[];
    ctx.patchState({ list });
  }

  @Action(LoadPenawaran)
  load(ctx: StateContext<PenawaranStateModel>, action: LoadPenawaran) {
    if (this.env.previewMode) return;
    return this.data.listByWorkOrder(action.workOrderId).pipe(
      map((rows) => rows as PenawaranRecord[]),
      tap((rows) => {
        const others = ctx.getState().list.filter((item) => String(item.workOrderId) !== String(action.workOrderId));
        ctx.patchState({ list: [...rows, ...others] });
      }),
    );
  }

  @Action(CreatePenawaran)
  create(ctx: StateContext<PenawaranStateModel>, action: CreatePenawaran) {
    if (!this.env.previewMode) {
      return this.data.create(action.workOrderId, action.payload).pipe(
        tap(() => {
          ctx.dispatch(new LoadPenawaran(action.workOrderId));
        }),
      );
    }

    const forWo = ctx.getState().list.filter((it) => String(it.workOrderId) === String(action.workOrderId));
    const nextVersion = forWo.length === 0 ? 1 : Math.max(...forWo.map((it) => it.versi)) + 1;
    const next: PenawaranRecord = {
      id: `pnw-${action.workOrderId}-${nextVersion}`,
      workOrderId: action.workOrderId,
      versi: nextVersion,
      totalBiaya: Number(action.payload['totalBiaya'] ?? 0),
      nomorInvoice: (action.payload['nomorInvoice'] as string | undefined) ?? undefined,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ list: [next, ...ctx.getState().list] });
    return;
  }

  @Action(SubmitPenawaran)
  submit(ctx: StateContext<PenawaranStateModel>, action: SubmitPenawaran) {
    if (!this.env.previewMode) {
      const target = ctx.getState().list.find((item) => String(item.id) === String(action.id));
      if (!target) return;
      return this.data.submit(target.workOrderId, action.id).pipe(
        tap(() => {
          ctx.dispatch(new LoadPenawaran(target.workOrderId));
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        String(item.id) === String(action.id) && item.status === 'DRAFT'
          ? { ...item, status: 'DIKIRIM' as const }
          : item,
      ),
    });
    return;
  }

  @Action(UploadInvoice)
  uploadInvoice(ctx: StateContext<PenawaranStateModel>, action: UploadInvoice) {
    if (!this.env.previewMode) {
      return this.data.uploadInvoice(action.workOrderId, action.id, action.payload).pipe(
        tap(() => {
          ctx.dispatch(new LoadPenawaran(action.workOrderId));
        }),
      );
    }
    return;
  }

  @Action(RequestRevisiPenawaran)
  requestRevisi(ctx: StateContext<PenawaranStateModel>, action: RequestRevisiPenawaran) {
    if (!this.env.previewMode) {
      const target = ctx.getState().list.find((item) => String(item.id) === String(action.id));
      if (!target) return;
      return this.data
        .requestRevisi(target.workOrderId, action.id, { catatanPerubahan: action.catatanPerubahan })
        .pipe(
          tap(() => {
            ctx.dispatch(new LoadPenawaran(target.workOrderId));
          }),
        );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        String(item.id) === String(action.id)
          ? { ...item, status: 'REVISI' as const, catatanPerubahan: action.catatanPerubahan }
          : item,
      ),
    });
    return;
  }

  @Action(SubmitRevisiPenawaran)
  submitRevisi(ctx: StateContext<PenawaranStateModel>, action: SubmitRevisiPenawaran) {
    if (!this.env.previewMode) {
      const target = ctx.getState().list.find((item) => String(item.id) === String(action.id));
      if (!target) return;
      return this.data.revisi(target.workOrderId, action.id, action.payload).pipe(
        tap(() => {
          ctx.dispatch(new LoadPenawaran(target.workOrderId));
        }),
      );
    }

    ctx.patchState({
      list: ctx.getState().list.map((item) =>
        String(item.id) === String(action.id)
          ? {
              ...item,
              status: 'DIKIRIM' as const,
              totalBiaya: Number(action.payload['totalBiaya'] ?? item.totalBiaya),
            }
          : item,
      ),
    });
    return;
  }
}
