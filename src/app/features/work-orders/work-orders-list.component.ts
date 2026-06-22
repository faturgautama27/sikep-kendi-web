import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ImageModule } from 'primeng/image';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { PanelModule } from 'primeng/panel';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';

import type {
  WorkOrder,
  WorkOrderEvidence,
  WorkOrderProgress,
  WorkOrderProgressStatus,
  WorkOrderStatus,
} from '@shared/models';

import { WorkOrdersState } from './state';

interface OptionItem<T> {
  label: string;
  value: T | null;
}

const STATUS_OPTIONS: OptionItem<WorkOrderStatus>[] = [
  { label: 'Semua status', value: null },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Diterima', value: 'received' },
  { label: 'Sedang Dikerjakan', value: 'in_progress' },
  { label: 'Selesai', value: 'completed' },
  { label: 'Validated — Diterima', value: 'validated_accepted' },
  { label: 'Validated — Ditolak', value: 'validated_rejected' },
];

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  assigned: 'Assigned',
  received: 'Diterima',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
  validated_accepted: 'Diterima',
  validated_rejected: 'Ditolak',
};

const PROGRESS_LABEL: Record<WorkOrderProgressStatus, string> = {
  received: 'Kendaraan Diterima',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Pekerjaan Selesai',
};

const EVIDENCE_LABEL: Record<string, string> = {
  kondisi_awal: 'Kondisi Awal',
  sparepart_sebelum: 'Sparepart Sebelum',
  sparepart_sesudah: 'Sparepart Sesudah',
  pasca_perbaikan: 'Pasca Perbaikan',
};

/**
 * Placeholder image untuk thumbnail evidence (Phase 1: foto belum
 * dihubungkan ke MinIO/CDN, jadi pakai gambar dummy berbasis kategori).
 */
function evidencePlaceholder(kategori: string): string {
  // Use picsum.photos with seed sehingga tiap kategori dapat foto berbeda
  const seed = encodeURIComponent(kategori);
  return `https://picsum.photos/seed/sikep-${seed}/240/160`;
}

/**
 * SiKeP KenDI — halaman daftar Work Order.
 *
 * Menampilkan list `WorkOrder` dari `WorkOrdersState` dengan filter status
 * dan vendor. Row dapat di-expand untuk menampilkan timeline progress
 * (`progressUpdates`) dan grid thumbnail evidence (`evidence`).
 */
@Component({
  selector: 'app-work-orders-list',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    ImageModule,
    InputTextModule,
    MultiSelectModule,
    PanelModule,
    SelectModule,
    TableModule,
    TagModule,
    TimelineModule,
  ],
  templateUrl: './work-orders-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrdersListComponent {
  private readonly store = inject(Store);

  protected readonly statusOptions = STATUS_OPTIONS;

  /** List dari NGXS state. */
  private readonly list = this.store.selectSignal(WorkOrdersState.list);

  protected readonly vendorOptions = computed<OptionItem<string>[]>(() => [
    { label: 'Semua vendor', value: null },
    ...this.list().map((wo) => ({ label: wo.vendorNama, value: wo.vendorId })),
  ]);

  /** Filter signals. */
  protected readonly searchQuery = signal('');
  protected readonly selectedStatuses = signal<WorkOrderStatus[]>([]);
  protected readonly selectedVendor = signal<string | null>(null);

  /** Set yang menandai row mana yang sedang ter-expand. */
  protected readonly expandedIds = signal<Set<string>>(new Set());

  protected readonly filteredList = computed<WorkOrder[]>(() => {
    const all = this.list();
    const q = this.searchQuery().trim().toLowerCase();
    const statuses = this.selectedStatuses();
    const vendor = this.selectedVendor();
    return all.filter((wo) => {
      if (q) {
        const haystack = `${wo.nomor} ${wo.pengajuanNomor} ${wo.vehiclePlate} ${wo.vendorNama}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statuses.length > 0 && !statuses.includes(wo.status)) return false;
      if (vendor && wo.vendorId !== vendor) return false;
      return true;
    });
  });

  protected readonly statsByStatus = computed(() => {
    const counts: Record<string, number> = {
      assigned: 0,
      received: 0,
      in_progress: 0,
      completed: 0,
      validated_accepted: 0,
      validated_rejected: 0,
    };
    for (const wo of this.list() || []) {
      if (counts[wo.status] !== undefined) {
        counts[wo.status]++;
      }
    }
    return STATUS_OPTIONS.filter(s => s.value !== null).map((s) => ({
      label: s.label,
      status: s.value,
      count: counts[s.value as string],
      severity: this.statusSeverity(s.value as WorkOrderStatus),
    }));
  });

  protected onResetFilter(): void {
    this.searchQuery.set('');
    this.selectedStatuses.set([]);
    this.selectedVendor.set(null);
  }

  protected onToggleExpand(wo: WorkOrder): void {
    const current = this.expandedIds();
    const next = new Set(current);
    if (next.has(wo.id)) {
      next.delete(wo.id);
    } else {
      next.add(wo.id);
    }
    this.expandedIds.set(next);
  }

  protected isExpanded(wo: WorkOrder): boolean {
    return this.expandedIds().has(wo.id);
  }

  protected progressEvents(wo: WorkOrder): WorkOrderProgress[] {
    return [...wo.progressUpdates].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );
  }

  protected progressIcon(status: WorkOrderProgressStatus): string {
    switch (status) {
      case 'received':
        return 'pi pi-inbox';
      case 'in_progress':
        return 'pi pi-cog';
      case 'completed':
        return 'pi pi-check';
    }
  }

  protected progressLabel(status: WorkOrderProgressStatus): string {
    return PROGRESS_LABEL[status];
  }

  protected evidenceUrl(ev: WorkOrderEvidence): string {
    // Phase 1: pakai placeholder; saat Phase 4 akan diganti URL signed dari MinIO.
    return evidencePlaceholder(ev.kategori);
  }

  protected evidenceLabel(kategori: string): string {
    return EVIDENCE_LABEL[kategori] ?? kategori;
  }

  protected statusLabel(status: WorkOrderStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected statusSeverity(
    status: WorkOrderStatus,
  ): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'assigned':
      case 'received':
        return 'info';
      case 'in_progress':
        return 'warn';
      case 'completed':
      case 'validated_accepted':
        return 'success';
      case 'validated_rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  protected formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
