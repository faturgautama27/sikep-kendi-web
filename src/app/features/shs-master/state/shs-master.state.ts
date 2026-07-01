import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';
import { APP_ENV } from '@core/data-access/app-env.token';
import { SHS_MASTER_DATA, type ShsMasterDataPort } from '@core/data-access/ports/shs-master-data.port';
import { ShsMaster } from '@shared/models/shs-master';
import { LoadShsMaster, CreateShsMaster, UpdateShsMaster, DeleteShsMaster } from './shs-master.actions';

interface ShsMasterStateModel {
  list: ShsMaster[];
}

@State<ShsMasterStateModel>({ name: 'shsMaster', defaults: { list: [] } })
@Injectable()
export class ShsMasterState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<ShsMasterDataPort>(SHS_MASTER_DATA);

  @Selector()
  static list(state: ShsMasterStateModel): ShsMaster[] {
    return state.list;
  }

  @Action(LoadShsMaster)
  load(ctx: StateContext<ShsMasterStateModel>) {
    if (this.env.previewMode) return;
    return this.data.list().pipe(
      tap((raw) => ctx.patchState({ list: raw })),
    );
  }

  @Action(CreateShsMaster)
  create(ctx: StateContext<ShsMasterStateModel>, action: CreateShsMaster) {
    if (this.env.previewMode) {
      const next = { ...action.payload, id: Date.now() } as unknown as ShsMaster;
      ctx.patchState({ list: [next, ...ctx.getState().list] });
      return;
    }
    return this.data.create(action.payload).pipe(
      tap(() => ctx.dispatch(new LoadShsMaster())),
    );
  }

  @Action(UpdateShsMaster)
  update(ctx: StateContext<ShsMasterStateModel>, action: UpdateShsMaster) {
    if (this.env.previewMode) {
      const list = [...ctx.getState().list];
      const idx = list.findIndex(d => d.id === action.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...action.payload } as ShsMaster;
        ctx.patchState({ list });
      }
      return;
    }
    return this.data.update(action.id, action.payload).pipe(
      tap(() => ctx.dispatch(new LoadShsMaster())),
    );
  }

  @Action(DeleteShsMaster)
  delete(ctx: StateContext<ShsMasterStateModel>, action: DeleteShsMaster) {
    if (this.env.previewMode) {
      ctx.patchState({ list: ctx.getState().list.filter(d => d.id !== action.id) });
      return;
    }
    return this.data.delete(action.id).pipe(
      tap(() => ctx.dispatch(new LoadShsMaster())),
    );
  }
}
