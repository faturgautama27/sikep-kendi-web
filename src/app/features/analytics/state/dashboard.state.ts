import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type {
  DashboardSummary,
  CostBreakdown,
  TopDeviationVehicle,
  VendorPerformance,
} from '@shared/models';

import {
  LoadDashboardSummary,
  LoadCostBreakdown,
  LoadTopDeviationVehicles,
  LoadVendorPerformance,
} from './dashboard.actions';

export interface DashboardStateModel {
  summary: DashboardSummary | null;
  costBreakdown: CostBreakdown | null;
  topDeviation: TopDeviationVehicle[];
  vendorPerformance: VendorPerformance[];
}

const INITIAL: DashboardStateModel = {
  summary: null,
  costBreakdown: null,
  topDeviation: [],
  vendorPerformance: [],
};

interface DashboardFixtureShape {
  summary: DashboardSummary;
  costBreakdown: CostBreakdown;
  topDeviation: TopDeviationVehicle[];
  vendorPerformance: VendorPerformance[];
}

@State<DashboardStateModel>({ name: 'dashboard', defaults: INITIAL })
@Injectable()
export class DashboardState {
  @Selector()
  static summary(state: DashboardStateModel): DashboardSummary | null {
    return state.summary;
  }

  @Selector()
  static costBreakdown(state: DashboardStateModel): CostBreakdown | null {
    return state.costBreakdown;
  }

  @Selector()
  static topDeviation(state: DashboardStateModel): TopDeviationVehicle[] {
    return state.topDeviation;
  }

  @Selector()
  static vendorPerformance(state: DashboardStateModel): VendorPerformance[] {
    return state.vendorPerformance;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<DashboardStateModel>, action: HydrateFromFixtures) {
    const dash = action.payload.dashboard as DashboardFixtureShape;
    ctx.patchState({
      summary: dash.summary,
      costBreakdown: dash.costBreakdown,
      topDeviation: dash.topDeviation,
      vendorPerformance: dash.vendorPerformance,
    });
  }

  @Action(LoadDashboardSummary)
  loadSummary(_ctx: StateContext<DashboardStateModel>) {}

  @Action(LoadCostBreakdown)
  loadCost(_ctx: StateContext<DashboardStateModel>, _action: LoadCostBreakdown) {}

  @Action(LoadTopDeviationVehicles)
  loadTop(_ctx: StateContext<DashboardStateModel>) {}

  @Action(LoadVendorPerformance)
  loadVendor(_ctx: StateContext<DashboardStateModel>) {}
}
