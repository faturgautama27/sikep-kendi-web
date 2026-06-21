import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { Sparepart, SparepartPriceHistory, Vendor } from '@shared/models';

import {
  CreateSparepart,
  CreateVendor,
  LoadPriceHistory,
  LoadSpareparts,
  LoadVendors,
  UpdateSparepartPrice,
} from './spareparts.actions';

export interface SparepartsStateModel {
  list: Sparepart[];
  priceHistory: SparepartPriceHistory[];
  vendors: Vendor[];
}

const INITIAL: SparepartsStateModel = {
  list: [],
  priceHistory: [],
  vendors: [],
};

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<SparepartsStateModel>({
  name: 'spareparts',
  defaults: INITIAL,
})
@Injectable()
export class SparepartsState {
  @Selector()
  static list(state: SparepartsStateModel): Sparepart[] {
    return state.list;
  }

  @Selector()
  static priceHistory(state: SparepartsStateModel): SparepartPriceHistory[] {
    return state.priceHistory;
  }

  @Selector()
  static vendors(state: SparepartsStateModel): Vendor[] {
    return state.vendors;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<SparepartsStateModel>, action: HydrateFromFixtures) {
    ctx.patchState({
      list: action.payload.spareparts as Sparepart[],
      priceHistory: action.payload.sparepartPriceHistory as SparepartPriceHistory[],
      vendors: action.payload.vendors as Vendor[],
    });
  }

  @Action(LoadSpareparts)
  load(_ctx: StateContext<SparepartsStateModel>) {}

  @Action(CreateSparepart)
  create(ctx: StateContext<SparepartsStateModel>, action: CreateSparepart) {
    const newItem: Sparepart = {
      ...action.input,
      id: generateId('sp'),
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ list: [...ctx.getState().list, newItem] });
  }

  @Action(UpdateSparepartPrice)
  updatePrice(ctx: StateContext<SparepartsStateModel>, action: UpdateSparepartPrice) {
    const state = ctx.getState();
    const sp = state.list.find((s) => s.id === action.sparepartId);
    if (!sp) return;
    const historyEntry: SparepartPriceHistory = {
      id: generateId('sph'),
      sparepartId: action.sparepartId,
      hargaLama: sp.hargaReferensi,
      hargaBaru: action.newPrice,
      changedAt: new Date().toISOString(),
      changedBy: action.changedBy,
      changedByName: action.changedByName,
    };
    ctx.patchState({
      list: state.list.map((s) =>
        s.id === action.sparepartId ? { ...s, hargaReferensi: action.newPrice } : s,
      ),
      priceHistory: [historyEntry, ...state.priceHistory],
    });
  }

  @Action(LoadVendors)
  loadVendors(_ctx: StateContext<SparepartsStateModel>) {}

  @Action(CreateVendor)
  createVendor(ctx: StateContext<SparepartsStateModel>, action: CreateVendor) {
    const newVendor: Vendor = {
      ...action.input,
      id: generateId('ven'),
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ vendors: [...ctx.getState().vendors, newVendor] });
  }

  @Action(LoadPriceHistory)
  loadPriceHistory(_ctx: StateContext<SparepartsStateModel>, _action: LoadPriceHistory) {}
}
