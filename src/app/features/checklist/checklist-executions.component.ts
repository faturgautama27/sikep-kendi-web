import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ChecklistExecutionsState } from './state';
import { DriversState } from '@features/drivers/state';
import { VehiclesState } from '@features/vehicles/state';
import type { ChecklistExecution, ExecutionStatus, ItemCategory } from '@shared/models';

type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

interface FilterOption<T> {
  label: string;
  value: T;
}

/**
 * Halaman riwayat eksekusi checklist (Phase 1 - Preview Mode, read-only).
 *
 * Menampilkan list eksekusi checklist dengan filter rentang tanggal,
 * kendaraan, supir, dan status. Mendukung row expansion untuk melihat
 * jawaban detail beserta thumbnail foto.
 */
@Component({
  selector: 'app-checklist-executions',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    TagModule,
    BadgeModule,
    DatePickerModule,
    SelectModule,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checklist-executions.component.html',
})
export class ChecklistExecutionsComponent {
  private readonly store = inject(Store);

  protected readonly executions = this.store.selectSignal(ChecklistExecutionsState.list);
  protected readonly vehicles = this.store.selectSignal(VehiclesState.list);
  protected readonly drivers = this.store.selectSignal(DriversState.list);

  // Filter signals
  protected readonly filterDateFrom = signal<Date | null>(null);
  protected readonly filterDateTo = signal<Date | null>(null);
  protected readonly filterVehicleId = signal<string | null>(null);
  protected readonly filterDriverId = signal<string | null>(null);
  protected readonly filterStatus = signal<ExecutionStatus | null>(null);

  protected readonly expandedRows = signal<Record<string, boolean>>({});

  protected readonly vehicleOptions = computed<FilterOption<string | null>[]>(() => [
    { label: 'Semua Kendaraan', value: null },
    ...this.vehicles().map((v) => ({
      label: `${v.nomorPolisi} — ${v.merk} ${v.tipe}`,
      value: v.id,
    })),
  ]);

  protected readonly driverOptions = computed<FilterOption<string | null>[]>(() => [
    { label: 'Semua Supir', value: null },
    ...this.drivers().map((d) => ({
      label: d.nama,
      value: d.id,
    })),
  ]);

  protected readonly statusOptions: FilterOption<ExecutionStatus | null>[] = [
    { label: 'Semua Status', value: null },
    { label: 'Selesai', value: 'completed' },
    { label: 'Sedang Berjalan', value: 'in_progress' },
    { label: 'Pending', value: 'pending' },
  ];

  protected readonly filteredExecutions = computed<ChecklistExecution[]>(() => {
    const from = this.filterDateFrom();
    const to = this.filterDateTo();
    const vehicleId = this.filterVehicleId();
    const driverId = this.filterDriverId();
    const status = this.filterStatus();

    return this.executions()
      .filter((exec) => {
        if (vehicleId && exec.vehicleId !== vehicleId) return false;
        if (driverId && exec.driverId !== driverId) return false;
        if (status && exec.status !== status) return false;

        const startedAt = new Date(exec.startedAt).getTime();
        if (from && startedAt < from.getTime()) return false;
        if (to) {
          // include the entire end day
          const endOfDay = new Date(to);
          endOfDay.setHours(23, 59, 59, 999);
          if (startedAt > endOfDay.getTime()) return false;
        }
        return true;
      })
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  });

  protected resetFilters(): void {
    this.filterDateFrom.set(null);
    this.filterDateTo.set(null);
    this.filterVehicleId.set(null);
    this.filterDriverId.set(null);
    this.filterStatus.set(null);
  }

  protected onRowToggle(execId: string): void {
    const current = this.expandedRows();
    const next = { ...current };
    if (next[execId]) {
      delete next[execId];
    } else {
      next[execId] = true;
    }
    this.expandedRows.set(next);
  }

  protected isExpanded(execId: string): boolean {
    return this.expandedRows()[execId] === true;
  }

  protected formatDate(iso: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected statusSeverity(status: ExecutionStatus): Severity {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'pending':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  protected statusLabel(status: ExecutionStatus): string {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'in_progress':
        return 'Sedang Berjalan';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  }

  protected answerStatusSeverity(status: 'ok' | 'tidak_ok' | 'perhatian'): Severity {
    switch (status) {
      case 'ok':
        return 'success';
      case 'tidak_ok':
        return 'danger';
      case 'perhatian':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  protected answerStatusLabel(status: 'ok' | 'tidak_ok' | 'perhatian'): string {
    switch (status) {
      case 'ok':
        return 'OK';
      case 'tidak_ok':
        return 'Tidak OK';
      case 'perhatian':
        return 'Perhatian';
      default:
        return status;
    }
  }

  protected categoryLabel(category: ItemCategory): string {
    switch (category) {
      case 'rem':
        return 'Rem';
      case 'lampu':
        return 'Lampu';
      case 'ban':
        return 'Ban';
      case 'oli':
        return 'Oli';
      case 'dokumen':
        return 'Dokumen';
      case 'body':
        return 'Body';
      case 'mesin':
        return 'Mesin';
      case 'kustom':
        return 'Kustom';
      default:
        return category;
    }
  }

  protected trackById(_idx: number, item: { id: string }): string {
    return item.id;
  }
}
