import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { WorkOrdersState } from '@features/work-orders/state';
import type { WorkOrder, WorkOrderStatus } from '@shared/models';

type VendorView = 'notifikasi' | 'draft' | 'penawaran' | 'riwayat';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  assigned: 'Ditugaskan',
  received: 'Diterima',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
  validated_accepted: 'Tervalidasi',
  validated_rejected: 'Ditolak',
};

const STATUS_SEVERITY: Record<WorkOrderStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  assigned: 'info',
  received: 'info',
  in_progress: 'warn',
  completed: 'secondary',
  validated_accepted: 'success',
  validated_rejected: 'danger',
};

@Component({
  selector: 'app-vendor-work-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './vendor-work-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorWorkOrdersComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly allRows = this.store.selectSignal(WorkOrdersState.list);

  protected readonly currentView =
    (this.route.snapshot.data['vendorView'] as VendorView | undefined) ?? 'notifikasi';

  protected readonly headerTitle = computed(() => {
    switch (this.currentView) {
      case 'draft': return 'Draft Checklist';
      case 'penawaran': return 'Penawaran & Invoice';
      case 'riwayat': return 'Riwayat WO';
      default: return 'Notifikasi Work Order';
    }
  });

  protected readonly headerSubtitle = computed(() => {
    switch (this.currentView) {
      case 'draft': return 'WO yang siap dibuatkan draft checklist oleh vendor.';
      case 'penawaran': return 'WO yang siap dibuatkan penawaran dan invoice.';
      case 'riwayat': return 'WO yang sudah selesai divalidasi.';
      default: return 'WO baru yang ditugaskan kepada vendor.';
    }
  });

  protected readonly searchQuery = signal('');

  protected readonly filteredList = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = this.allRows().filter(r => this.matchByView(r, this.currentView));

    return rows.filter((wo) => {
      if (q) {
        const haystack = `${wo.nomor} ${wo.vehiclePlate}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  protected readonly emptyMessage = computed(() => {
    switch (this.currentView) {
      case 'draft': return 'Tidak ada WO yang menunggu draft checklist.';
      case 'penawaran': return 'Tidak ada WO yang menunggu penawaran.';
      case 'riwayat': return 'Belum ada riwayat WO yang selesai.';
      default: return 'Tidak ada WO baru yang ditugaskan.';
    }
  });

  private matchByView(row: WorkOrder, view: VendorView): boolean {
    switch (view) {
      case 'draft': return ['assigned', 'received'].includes(row.status);
      case 'penawaran': return ['in_progress', 'completed'].includes(row.status);
      case 'riwayat': return ['validated_accepted', 'validated_rejected'].includes(row.status);
      default: return ['assigned', 'received', 'in_progress'].includes(row.status);
    }
  }

  protected onResetFilter(): void {
    this.searchQuery.set('');
  }

  protected statusLabel(s: WorkOrderStatus): string { return STATUS_LABELS[s] ?? s; }
  protected statusSeverity(s: WorkOrderStatus) { return STATUS_SEVERITY[s] ?? 'secondary'; }

  protected primaryActionLabel(view: VendorView): string {
    switch (view) {
      case 'draft': return 'Buat / Edit Draft';
      case 'penawaran': return 'Buat / Edit Penawaran';
      default: return 'Buat Draft';
    }
  }

  protected primaryActionRoute(row: WorkOrder): string[] {
    switch (this.currentView) {
      case 'penawaran': return ['/vendor/work-orders', row.id, 'penawaran'];
      default: return ['/vendor/work-orders', row.id, 'draft'];
    }
  }

  protected formatDate(ts: string | null): string {
    if (!ts) return '—';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts));
  }

  protected formatCurrency(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }
}
