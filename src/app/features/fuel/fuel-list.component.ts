import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { VehiclesState } from '@features/vehicles/state';
import type { FuelQuota, FuelTransaction, FuelType, QuotaScope } from '@shared/models';

import { FuelState } from './state';

interface OptionItem<T> {
  label: string;
  value: T | null;
}

const FUEL_TYPE_OPTIONS: OptionItem<FuelType>[] = [
  { label: 'Semua jenis BBM', value: null },
  { label: 'Pertalite', value: 'pertalite' },
  { label: 'Pertamax', value: 'pertamax' },
  { label: 'Pertamax Turbo', value: 'pertamax_turbo' },
  { label: 'Dexlite', value: 'dexlite' },
  { label: 'Pertamina Dex', value: 'pertamina_dex' },
  { label: 'Biosolar', value: 'biosolar' },
];

const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  pertalite: 'Pertalite',
  pertamax: 'Pertamax',
  pertamax_turbo: 'Pertamax Turbo',
  dexlite: 'Dexlite',
  pertamina_dex: 'Pertamina Dex',
  biosolar: 'Biosolar',
};

const FUEL_TYPE_SEVERITY: Record<FuelType, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
  pertalite: 'success',
  pertamax: 'info',
  pertamax_turbo: 'warn',
  dexlite: 'secondary',
  pertamina_dex: 'warn',
  biosolar: 'secondary',
};

/**
 * ARMADIN — halaman manajemen BBM.
 *
 * Tab "Transaksi BBM" menampilkan list `FuelTransaction` dari `FuelState`
 * dengan filter rentang tanggal, kendaraan, jenis BBM, dan toggle hanya
 * over-quota. Tab "Kuota & Realisasi" menampilkan `FuelQuota` per scope
 * (vehicle/driver) dengan progress bar persentase pemakaian.
 */
@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    ProgressBarModule,
    SelectModule,
    TableModule,
    TabsModule,
    TagModule,
    ToggleSwitchModule,
  ],
  templateUrl: './fuel-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelListComponent {
  private readonly store = inject(Store);

  protected readonly fuelTypeOptions = FUEL_TYPE_OPTIONS;

  /** Slices NGXS. */
  private readonly transactions = this.store.selectSignal(FuelState.transactions);
  private readonly quotas = this.store.selectSignal(FuelState.quotas);
  private readonly vehicles = this.store.selectSignal(VehiclesState.list);

  /** Vehicle filter dropdown options. */
  protected readonly vehicleOptions = computed<OptionItem<string>[]>(() => [
    { label: 'Semua kendaraan', value: null },
    ...this.vehicles().map((v) => ({
      label: `${v.nomorPolisi} — ${v.merk} ${v.tipe}`,
      value: v.id,
    })),
  ]);

  /** Tab aktif (controlled). */
  protected readonly activeTab = signal<'transaksi' | 'kuota'>('transaksi');

  /** Filter tab transaksi. */
  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  protected readonly selectedVehicle = signal<string | null>(null);
  protected readonly selectedFuelType = signal<FuelType | null>(null);
  protected readonly onlyOverQuota = signal(false);

  protected readonly filteredTransactions = computed<FuelTransaction[]>(() => {
    const all = this.transactions();
    const from = this.fromDate();
    const to = this.toDate();
    const vehicleId = this.selectedVehicle();
    const fuel = this.selectedFuelType();
    const onlyOver = this.onlyOverQuota();

    return all.filter((t) => {
      const ts = new Date(t.tanggal).getTime();
      if (from && ts < from.getTime()) return false;
      if (to && ts > to.getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      if (vehicleId && t.vehicleId !== vehicleId) return false;
      if (fuel && t.jenisBbm !== fuel) return false;
      if (onlyOver && !t.overQuota) return false;
      return true;
    });
  });

  protected readonly quotasList = computed<FuelQuota[]>(() => this.quotas());

  protected onResetFilter(): void {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.selectedVehicle.set(null);
    this.selectedFuelType.set(null);
    this.onlyOverQuota.set(false);
  }

  protected onOpenTxDetail(t: FuelTransaction): void {
    // Phase 1: belum ada detail page; cukup no-op log.
    console.warn('[Fuel] Detail transaksi akan ada di task 7.x:', t.id);
  }

  protected fuelLabel(t: FuelType): string {
    return FUEL_TYPE_LABEL[t];
  }

  protected fuelSeverity(t: FuelType): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return FUEL_TYPE_SEVERITY[t];
  }

  /**
   * Mapping percent → severity warna ProgressBar.
   * - >=100% → danger
   * - >=80%  → warning
   * - lain   → primary (default)
   */
  protected quotaSeverity(percent: number): 'success' | 'info' | 'warn' | 'danger' {
    if (percent >= 100) return 'danger';
    if (percent >= 80) return 'warn';
    return 'info';
  }

  /** Class util untuk pewarnaan ProgressBar (PrimeNG v21 belum punya prop severity). */
  protected progressBarClass(percent: number): string {
    if (percent >= 100) return 'progressbar-danger';
    if (percent >= 80) return 'progressbar-warning';
    return 'progressbar-primary';
  }

  protected scopeIcon(scope: QuotaScope): string {
    return scope === 'vehicle' ? 'pi pi-truck' : 'pi pi-id-card';
  }

  protected scopeLabel(scope: QuotaScope): string {
    return scope === 'vehicle' ? 'Kendaraan' : 'Supir';
  }

  protected formatPeriod(q: FuelQuota): string {
    const start = new Date(q.periodStart);
    return start
      .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  protected formatNumber(n: number): string {
    return new Intl.NumberFormat('id-ID').format(n);
  }

  protected formatLiter(n: number): string {
    return `${this.formatNumber(n)} L`;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Format ringkas yang dipakai di sel persen pada tabel kuota. */
  protected formatPercent(n: number): string {
    return `${this.formatNumber(Math.round(n * 10) / 10)}%`;
  }
}
