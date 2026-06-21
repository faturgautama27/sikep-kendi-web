import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { FuelTransaction, FuelQuota } from '@shared/models';

import { LoadFuelTransactions, RecordFuelTransaction, LoadFuelQuotas } from './fuel.actions';

export interface FuelStateModel {
  transactions: FuelTransaction[];
  quotas: FuelQuota[];
}

const INITIAL: FuelStateModel = { transactions: [], quotas: [] };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<FuelStateModel>({ name: 'fuel', defaults: INITIAL })
@Injectable()
export class FuelState {
  @Selector()
  static transactions(state: FuelStateModel): FuelTransaction[] {
    return state.transactions;
  }

  @Selector()
  static quotas(state: FuelStateModel): FuelQuota[] {
    return state.quotas;
  }

  @Selector()
  static overQuotaTransactions(state: FuelStateModel): FuelTransaction[] {
    return state.transactions.filter((t) => t.overQuota);
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<FuelStateModel>, action: HydrateFromFixtures) {
    ctx.patchState({
      transactions: action.payload.fuelTransactions as FuelTransaction[],
      quotas: action.payload.fuelQuotas as FuelQuota[],
    });
  }

  @Action(LoadFuelTransactions)
  loadTx(_ctx: StateContext<FuelStateModel>) {}

  @Action(RecordFuelTransaction)
  recordTx(ctx: StateContext<FuelStateModel>, action: RecordFuelTransaction) {
    const newTx: FuelTransaction = {
      ...action.input,
      id: generateId('ft'),
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ transactions: [newTx, ...ctx.getState().transactions] });
  }

  @Action(LoadFuelQuotas)
  loadQuotas(_ctx: StateContext<FuelStateModel>) {}
}
