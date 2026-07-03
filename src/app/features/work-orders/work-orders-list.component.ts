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
import { RouterLink } from '@angular/router';

import type {
  WorkOrder,
  WorkOrderEvidence,
  WorkOrderProgress,
  WorkOrderProgressStatus,
  WorkOrderStatus,
} from '@shared/models';

import { WorkOrdersState } from './state';
import { AuthState } from '@features/login/state/auth.state';

interface OptionItem<T> {
  label: string;
  value: T | null;
}

const STATUS_OPTIONS: OptionItem<WorkOrderStatus>[] = [
  { label: 'Semua status', value: null },
  { label: 'Dibuat', value: 'DIBUAT' },
  { label: 'Assigned', value: 'VENDOR_DITUGASKAN' },
  { label: 'Draft Checklist', value: 'DRAFT_CHECKLIST' },
  { label: 'Penawaran', value: 'PENAWARAN' },
  { label: 'Diverifikasi', value: 'DIVERIFIKASI' },
  { label: 'Selesai / Dibayar', value: 'DIBAYAR' },
];

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  DIBUAT: 'Dibuat',
  VENDOR_DITUGASKAN: 'Vendor Ditugaskan',
  DRAFT_CHECKLIST: 'Draft Checklist',
  PENAWARAN: 'Penawaran',
  DIVERIFIKASI: 'Diverifikasi',
  MENUNGGU_INVOICE_VENDOR: 'Menunggu Invoice Vendor',
  MENUNGGU_VERIFIKATOR: 'Menunggu Verifikator',
  MENUNGGU_PPTK: 'Menunggu PPTK',
  DISETUJUI_PPTK: 'Disetujui PPTK',
  DIBAYAR: 'Dibayar',
  DITOLAK_PB: 'Ditolak PB',
  DITOLAK_VERIFIKATOR: 'Ditolak Verifikator',
  DITOLAK_PPTK: 'Ditolak PPTK',
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
}

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
    RouterLink,
  ],
  templateUrl: './work-orders-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrdersListComponent {
  private readonly store = inject(Store);

  protected readonly statusOptions = STATUS_OPTIONS;

  /** List dari NGXS state. */
  private readonly list = this.store.selectSignal(WorkOrdersState.list);
  protected readonly permissions = this.store.selectSignal(AuthState.permissions);

  protected readonly vendorOptions = computed<OptionItem<string>[]>(() => [
    { label: 'Semua vendor', value: null },
    ...this.list().map((wo) => ({ label: wo.vendorNama, value: wo.vendorId })),
  ]);

  /** Filter signals. */
  protected readonly searchQuery = signal('');
  protected readonly selectedStatuses = signal<WorkOrderStatus[]>([]);
  protected readonly selectedVendor = signal<string | null>(null);

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
      DIBUAT: 0,
      VENDOR_DITUGASKAN: 0,
      DRAFT_CHECKLIST: 0,
      PENAWARAN: 0,
      DIVERIFIKASI: 0,
      MENUNGGU_PPTK: 0,
      DISETUJUI_PPTK: 0,
      DIBAYAR: 0,
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

  protected statusLabel(status: WorkOrderStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected statusSeverity(
    status: WorkOrderStatus,
  ): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'DIBUAT':
      case 'VENDOR_DITUGASKAN':
        return 'info';
      case 'DRAFT_CHECKLIST':
      case 'PENAWARAN':
      case 'MENUNGGU_INVOICE_VENDOR':
      case 'MENUNGGU_VERIFIKATOR':
      case 'MENUNGGU_PPTK':
        return 'warn';
      case 'DIVERIFIKASI':
      case 'DISETUJUI_PPTK':
      case 'DIBAYAR':
        return 'success';
      case 'DITOLAK_PB':
      case 'DITOLAK_VERIFIKATOR':
      case 'DITOLAK_PPTK':
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
