import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { DriversState } from './state';
import { ShowToast } from '@shared/ngxs/ui';
import type { Driver, DriverAssignment, DriverViolation } from '@shared/models';

type SimSeverity = 'success' | 'warn' | 'danger' | 'info';

/**
 * Halaman manajemen supir (Phase 1 - Preview Mode).
 *
 * Menampilkan list supir, penugasan aktif, dan riwayat pelanggaran
 * dari `DriversState` yang sudah ter-hydrate dari fixture.
 */
@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [TableModule, TagModule, ButtonModule, AccordionModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drivers-list.component.html',
})
export class DriversListComponent {
  private readonly store = inject(Store);

  protected readonly drivers = this.store.selectSignal(DriversState.list);
  protected readonly activeAssignments = this.store.selectSignal(DriversState.activeAssignments);
  protected readonly violations = this.store.selectSignal(DriversState.violations);

  protected readonly searchTerm = computed(() => '');

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

  protected formatDateOnly(iso: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  }

  protected simStatusSeverity(status: Driver['simStatus']): SimSeverity {
    switch (status) {
      case 'valid':
        return 'success';
      case 'expiring_soon':
        return 'warn';
      case 'expired':
        return 'danger';
      default:
        return 'info';
    }
  }

  protected simStatusLabel(status: Driver['simStatus']): string {
    switch (status) {
      case 'valid':
        return 'Valid';
      case 'expiring_soon':
        return 'Akan Kadaluarsa';
      case 'expired':
        return 'Kadaluarsa';
      default:
        return status;
    }
  }

  protected driverStatusSeverity(status: Driver['status']): SimSeverity {
    switch (status) {
      case 'active':
        return 'success';
      case 'sim_expired':
        return 'danger';
      case 'inactive':
        return 'info';
      default:
        return 'info';
    }
  }

  protected driverStatusLabel(status: Driver['status']): string {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'sim_expired':
        return 'SIM Kadaluarsa';
      case 'inactive':
        return 'Tidak Aktif';
      default:
        return status;
    }
  }

  protected modeSeverity(mode: DriverAssignment['mode']): SimSeverity {
    return mode === 'utama' ? 'info' : 'warn';
  }

  protected onViewDetail(driver: Driver): void {
    this.store.dispatch(
      new ShowToast({
        severity: 'info',
        summary: 'Detail',
        detail: `Detail supir ${driver.nama} (NIP ${driver.nip})`,
      }),
    );
  }

  protected trackById(_idx: number, item: { id: string }): string {
    return item.id;
  }

  protected trackViolation(_idx: number, item: DriverViolation): string {
    return item.id;
  }
}
