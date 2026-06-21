export class LoadDashboardSummary {
  static readonly type = '[Dashboard] Load Summary';
  readonly type = LoadDashboardSummary.type;
}

export class LoadCostBreakdown {
  static readonly type = '[Dashboard] Load Cost Breakdown';
  readonly type = LoadCostBreakdown.type;
  constructor(public readonly period: { from: string; to: string }) {}
}

export class LoadTopDeviationVehicles {
  static readonly type = '[Dashboard] Load Top Deviation';
  readonly type = LoadTopDeviationVehicles.type;
}

export class LoadVendorPerformance {
  static readonly type = '[Dashboard] Load Vendor Performance';
  readonly type = LoadVendorPerformance.type;
}