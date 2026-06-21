import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { VehiclesState } from './state';
import type { Vehicle, VehicleStatus, VehicleType } from '@shared/models';

@Component({
  selector: 'app-vehicles-list',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TableModule, TagModule, ToastModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './vehicles-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesListComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  private readonly all = this.store.selectSignal(VehiclesState.list);
  protected readonly search = signal('');
  protected readonly selectedStatus = signal<VehicleStatus | null>(null);
  protected readonly selectedJenis = signal<VehicleType | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const st = this.selectedStatus();
    const jn = this.selectedJenis();
    return this.all().filter(v => {
      if (q && !`${v.nomorPolisi} ${v.merk} ${v.tipe}`.toLowerCase().includes(q)) return false;
      if (st && v.status !== st) return false;
      if (jn && v.jenisKendaraan !== jn) return false;
      return true;
    });
  });

  protected readonly activeCount = computed(() => this.all().filter(v => v.status === 'active').length);
  protected readonly inRepairCount = computed(() => this.all().filter(v => v.status === 'in_repair').length);
  protected readonly retiredCount = computed(() => this.all().filter(v => v.status === 'retired').length);

  protected onStatusChange(val: string): void {
    this.selectedStatus.set(val ? val as VehicleStatus : null);
  }

  protected onJenisChange(val: string): void {
    this.selectedJenis.set(val ? val as VehicleType : null);
  }

  protected onResetFilter(): void {
    this.search.set('');
    this.selectedStatus.set(null);
    this.selectedJenis.set(null);
  }

  protected onAdd(): void {
    this.messageService.add({ severity: 'info', summary: 'Tambah Kendaraan', detail: 'Form tambah kendaraan akan tersedia setelah backend siap.', life: 3000 });
  }

  protected onView(v: Vehicle): void {
    this.router.navigate(['/vehicles', v.id], { queryParams: { tab: 'komponen' } });
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
    if (severity === 'danger') return 'EWE Tinggi';
    if (severity === 'warn') return 'EWE Sedang';
    return 'EWE Rendah';
  }
}
