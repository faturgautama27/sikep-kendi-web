import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { RatingModule } from 'primeng/rating';
import { TableModule } from 'primeng/table';

import { DashboardState } from './state';

interface CostBreakdownRow {
  readonly kategori: string;
  readonly nominal: number;
  readonly percent: number;
}

/**
 * ARMADIN — Halaman Analytics.
 *
 * Memuat tiga section utama yang membaca state slice {@link DashboardState}:
 * - **Top 10 Deviation Vehicles**: tabel kendaraan dengan deviation count
 *   tertinggi (sumber: `topDeviation`).
 * - **Performa Vendor**: tabel ringkas vendor dengan rating, completion
 *   time, dan rejection rate (sumber: `vendorPerformance`).
 * - **Cost Breakdown**: visualisasi proporsi biaya per kategori dalam
 *   bentuk progress bar (PrimeNG `p-chart` membutuhkan dependency
 *   `chart.js` yang tidak terpasang di Phase 1; visualisasi ini setara
 *   secara informasi dan sudah bekerja di tema biru-putih).
 *
 * Phase 1 menggunakan data fixture (di-hydrate via `HydrateFromFixtures`).
 *
 * Referensi: Requirement 16.2 (cost), 16.3 (deviation), 16.4 (vendor).
 */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ProgressBarModule, RatingModule, TableModule],
  templateUrl: './analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  private readonly store = inject(Store);

  /** Tabel deviation: signal value langsung dari state. */
  protected readonly topDeviation = this.store.selectSignal(DashboardState.topDeviation);

  /** Tabel performa vendor. */
  protected readonly vendorPerformance = this.store.selectSignal(DashboardState.vendorPerformance);

  /** Cost breakdown raw (boleh `null`). */
  protected readonly costBreakdown = this.store.selectSignal(DashboardState.costBreakdown);

  /**
   * Derivasi baris cost breakdown dengan persentase relatif terhadap total.
   * Total 0 (atau breakdown belum ter-load) menghasilkan array kosong agar
   * tabel menampilkan placeholder kosong (PrimeNG Table built-in).
   */
  protected readonly costRows = computed<CostBreakdownRow[]>(() => {
    const cb = this.costBreakdown();
    if (!cb || cb.total <= 0 || cb.byCategory.length === 0) {
      return [];
    }
    return cb.byCategory
      .map((c) => ({
        kategori: c.kategori,
        nominal: c.nominal,
        percent: Math.round((c.nominal / cb.total) * 100),
      }))
      .sort((a, b) => b.nominal - a.nominal);
  });

  /** Format Rupiah ID locale. */
  protected formatRupiah(value: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  /** Format tanggal lokal Indonesia, hanya tanggal (tanpa jam) untuk readability tabel. */
  protected formatDate(iso: string): string {
    if (!iso) {
      return '-';
    }
    const date = new Date(iso);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  /** Persentase rejection rate (0..1) → string "12%". */
  protected formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
}
