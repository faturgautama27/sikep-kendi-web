import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { PanelModule } from 'primeng/panel';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { VehiclesState, LoadVehicles } from './state';
import type { Vehicle, VehicleStatus, VehicleType } from '@shared/models';

const STATUS_OPTIONS: { label: string; value: VehicleStatus }[] = [
  { label: 'Aktif', value: 'active' },
  { label: 'Dalam Perbaikan', value: 'in_repair' },
  { label: 'Pensiun', value: 'retired' },
];

const JENIS_OPTIONS: { label: string; value: VehicleType | null }[] = [
  { label: 'Semua jenis', value: null },
  { label: 'Mobil', value: 'mobil' },
  { label: 'Motor', value: 'motor' },
  { label: 'Truk', value: 'truk' },
  { label: 'Bus', value: 'bus' },
  { label: 'Lainnya', value: 'lainnya' },
];

@Component({
  selector: 'app-vehicles-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    PanelModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './vehicles-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesListComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly jenisOptions = JENIS_OPTIONS;

  private readonly all = this.store.selectSignal(VehiclesState.list);
  protected readonly search = signal('');
  protected readonly selectedStatuses = signal<VehicleStatus[]>([]);
  protected readonly selectedJenis = signal<VehicleType | null>(null);

  protected readonly filteredList = computed(() => {
    const q = this.search().toLowerCase();
    const statuses = this.selectedStatuses();
    const jn = this.selectedJenis();
    return this.all().filter(v => {
      if (q && !`${v.nomorPolisi} ${v.merk} ${v.tipe}`.toLowerCase().includes(q)) return false;
      if (statuses.length > 0 && !statuses.includes(v.status)) return false;
      if (jn && v.jenisKendaraan !== jn) return false;
      return true;
    });
  });

  protected readonly statsByStatus = computed(() => {
    const counts: Record<VehicleStatus, number> = {
      active: 0,
      in_repair: 0,
      retired: 0,
    };
    for (const v of this.all() || []) {
      if (counts[v.status] !== undefined) {
        counts[v.status]++;
      }
    }
    return STATUS_OPTIONS.map((s) => ({
      label: s.label,
      status: s.value,
      count: counts[s.value],
      severity: this.statusSeverity(s.value),
    }));
  });

  protected onResetFilter(): void {
    this.search.set('');
    this.selectedStatuses.set([]);
    this.selectedJenis.set(null);
    this.store.dispatch(new LoadVehicles());
  }

  protected onAdd(): void {
    this.router.navigate(['/vehicles/new']);
  }

  protected onView(v: Vehicle): void {
    this.router.navigate(['/vehicles', v.id]);
  }

  protected statusSeverity(s: VehicleStatus): 'success' | 'warn' | 'secondary' {
    return s === 'active' ? 'success' : s === 'in_repair' ? 'warn' : 'secondary';
  }

  protected statusLabel(s: VehicleStatus): string {
    return s === 'active' ? 'Aktif' : s === 'in_repair' ? 'Dalam Perbaikan' : 'Pensiun';
  }

  protected jenisSeverity(j: VehicleType): 'info' | 'success' | 'warn' | 'secondary' {
    const m: Record<VehicleType, 'info' | 'success' | 'warn' | 'secondary'> = {
      mobil: 'info', motor: 'success', truk: 'warn', bus: 'warn', lainnya: 'secondary',
    };
    return m[j];
  }

  protected formatKm(n: number): string {
    return new Intl.NumberFormat('id-ID').format(n) + ' km';
  }

  protected eweSeverity(vehicle: Vehicle): 'success' | 'warn' | 'danger' {
    const kmCycle = vehicle.odometerCurrent % 20000;
    if (kmCycle >= 18000) return 'danger';
    if (kmCycle >= 15000) return 'warn';
    return 'success';
  }

  protected eweLabel(vehicle: Vehicle): string {
    const severity = this.eweSeverity(vehicle);
    if (severity === 'danger') return 'Kritis';
    if (severity === 'warn') return 'Waspada';
    return 'Normal';
  }
}
