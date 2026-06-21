import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { DASHBOARD_DATA, type DashboardDataPort } from '@core/data-access/ports/dashboard-data.port';
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
  private readonly env = inject(APP_ENV);
  private readonly data = inject<DashboardDataPort>(DASHBOARD_DATA);

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
  loadSummary(ctx: StateContext<DashboardStateModel>) {
    if (this.env.previewMode) return;
    return this.data.getSummary().pipe(
      tap((summary) => {
        ctx.patchState({ summary });
      }),
    );
  }

  @Action(LoadCostBreakdown)
  loadCost(ctx: StateContext<DashboardStateModel>, action: LoadCostBreakdown) {
    if (this.env.previewMode) return;
    return this.data.getCostBreakdown(action.period).pipe(
      tap((costBreakdown) => {
        ctx.patchState({ costBreakdown });
      }),
    );
  }

  @Action(LoadTopDeviationVehicles)
  loadTop(ctx: StateContext<DashboardStateModel>) {
    if (this.env.previewMode) return;
    return this.data.getTopDeviationVehicles().pipe(
      tap((topDeviation) => {
        ctx.patchState({ topDeviation });
      }),
    );
  }

  @Action(LoadVendorPerformance)
  loadVendor(ctx: StateContext<DashboardStateModel>) {
    if (this.env.previewMode) return;
    return this.data.getVendorPerformance().pipe(
      tap((vendorPerformance) => {
        ctx.patchState({ vendorPerformance });
      }),
    );
  }
}