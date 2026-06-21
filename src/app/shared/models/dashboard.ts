import type { Money } from './common';

export interface DashboardSummary {
  totalVehicles: number;
  activeVehicles: number;
  inRepairVehicles: number;
  retiredVehicles: number;
  documentsExpiringSoon: number;
  simExpiringSoon: number;
  pendingPengajuan: number;
  unmatchedSpj: number;
  totalCostThisMonth: Money;
  fuelCostThisMonth: Money;
  maintenanceCostThisMonth: Money;
  notificationCriticalUnread: number;
}

export interface CostBreakdown {
  period: string; // YYYY-MM
  total: Money;
  byCategory: { kategori: string; nominal: Money }[];
  byVehicle: { vehicleId: string; vehiclePlate: string; nominal: Money }[];
}

export interface TopDeviationVehicle {
  vehicleId: string;
  vehiclePlate: string;
  merk: string;
  tipe: string;
  deviationCount: number;
  lastDeviationAt: string;
}

export interface VendorPerformance {
  vendorId: string;
  vendorNama: string;
  totalWorkOrders: number;
  avgCompletionDays: number;
  rejectionRate: number; // 0-1
  rating: number;
}
