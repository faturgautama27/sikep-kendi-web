import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { WorkOrdersState } from '@features/work-orders/state';
import type { WorkOrder, WorkOrderStatus } from '@shared/models';

const DONE_STATUSES: WorkOrderStatus[] = ['completed', 'validated_accepted', 'validated_rejected'];
const STATUS_OPTS = [
  { label: 'Selesai', value: 'completed' },
  { label: 'Tervalidasi', value: 'validated_accepted' },
  { label: 'Ditolak', value: 'validated_rejected' },
];

@Component({ selector: 'app-vendor-history', standalone: true,
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MultiSelectModule, TableModule, TagModule, TooltipModule],
  templateUrl: './vendor-history.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class VendorHistoryComponent {
  private readonly store = inject(Store);
  private readonly all = this.store.selectSignal(WorkOrdersState.list);

  protected readonly filterNomor = signal('');
  protected readonly filterStatus = signal<WorkOrderStatus[]>([]);
  protected readonly statusOpts = STATUS_OPTS;

  protected readonly rows = computed<WorkOrder[]>(() => {
    const nomor = this.filterNomor().trim().toLowerCase();
    const statusFilter = this.filterStatus();
    return this.all()
      .filter(w => DONE_STATUSES.includes(w.status))
      .filter(w => !nomor || w.nomor.toLowerCase().includes(nomor) || w.vehiclePlate.toLowerCase().includes(nomor))
      .filter(w => statusFilter.length === 0 || statusFilter.includes(w.status));
  });

  protected onResetFilter(): void {
    this.filterNomor.set('');
    this.filterStatus.set([]);
  }

  protected statusSeverity(s: WorkOrderStatus): 'success' | 'danger' | 'secondary' {
    return s === 'validated_accepted' ? 'success' : s === 'validated_rejected' ? 'danger' : 'secondary';
  }

  protected statusLabel(s: WorkOrderStatus): string {
    return s === 'validated_accepted' ? 'Tervalidasi' : s === 'validated_rejected' ? 'Ditolak' : 'Selesai';
  }

  protected formatDate(ts: string | null): string {
    if (!ts) return '—';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts));
  }

  protected formatCurrency(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }
}
