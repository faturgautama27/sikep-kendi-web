import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { PanelModule } from 'primeng/panel';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { PengajuanState } from './state';
import type { Pengajuan, PengajuanJenis, PengajuanStatus } from '@shared/models';

interface StatusOption {
  label: string;
  value: PengajuanStatus;
}

interface JenisOption {
  label: string;
  value: PengajuanJenis | null;
}

const STATUS_OPTIONS: StatusOption[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Menunggu Verifikasi', value: 'menunggu_verifikasi' },
  { label: 'Terverifikasi', value: 'terverifikasi' },
  { label: 'Ditolak', value: 'ditolak' },
  { label: 'Work Order Terbuat', value: 'work_order_terbuat' },
];

const JENIS_OPTIONS: JenisOption[] = [
  { label: 'Semua jenis', value: null },
  { label: 'Preventive', value: 'preventive' },
  { label: 'Corrective', value: 'corrective' },
  { label: 'Predictive', value: 'predictive' },
];

const STATUS_LABEL: Record<PengajuanStatus, string> = {
  draft: 'Draft',
  menunggu_verifikasi: 'Menunggu Verifikasi',
  terverifikasi: 'Terverifikasi',
  ditolak: 'Ditolak',
  work_order_terbuat: 'Work Order Terbuat',
};

/**
 * SiKeP KenDI — halaman daftar pengajuan pemeliharaan.
 *
 * Menampilkan list `Pengajuan` dari `PengajuanState` dengan filter teks,
 * status (multi), dan jenis. Aksi approve/reject hanya muncul untuk row
 * dengan status `awaiting_approval` (dummy click → toast info).
 *
 * Phase 1: detail pengajuan belum dirute, klik nomor menampilkan toast
 * "akan ada di task 7.x".
 */
@Component({
  selector: 'app-pengajuan-list',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    ChipModule,
    InputTextModule,
    MultiSelectModule,
    PanelModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './pengajuan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PengajuanListComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly jenisOptions = JENIS_OPTIONS;

  /** Snapshot list dari NGXS state. */
  private readonly list = this.store.selectSignal(PengajuanState.list);

  /** Filter signals. */
  protected readonly searchQuery = signal('');
  protected readonly selectedStatuses = signal<PengajuanStatus[]>([]);
  protected readonly selectedJenis = signal<PengajuanJenis | null>(null);

  /** Hasil filter list yang dirender ke tabel. */
  protected readonly filteredList = computed<Pengajuan[]>(() => {
    const all = this.list();
    const rows = Array.isArray(all) ? all : [];
    const q = this.searchQuery().trim().toLowerCase();
    const statuses = this.selectedStatuses();
    const jenis = this.selectedJenis();

    return rows.filter((p) => {
      if (q) {
        const haystack = `${p.nomor} ${p.judul}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statuses.length > 0 && !statuses.includes(p.status)) return false;
      if (jenis && p.jenis !== jenis) return false;
      return true;
    });
  });

  /** Hitung jumlah pengajuan per status untuk panel statistik. */
  protected readonly statsByStatus = computed(() => {
    const counts: Record<PengajuanStatus, number> = {
      draft: 0,
      menunggu_verifikasi: 0,
      terverifikasi: 0,
      ditolak: 0,
      work_order_terbuat: 0,
    };
    for (const p of this.list()) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return STATUS_OPTIONS.map((s) => ({
      label: s.label,
      status: s.value,
      count: counts[s.value],
      severity: this.statusSeverity(s.value),
    }));
  });

  protected onCreateManual(): void {
    this.router.navigate(['/pengajuan/new']);
  }

  protected onOpenDetail(p: Pengajuan): void {
    this.router.navigate(['/pengajuan', p.id]);
  }

  protected onApprove(p: Pengajuan, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/pengajuan', p.id]);
  }

  protected onReject(p: Pengajuan, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/pengajuan', p.id]);
  }

  protected onResetFilter(): void {
    this.searchQuery.set('');
    this.selectedStatuses.set([]);
    this.selectedJenis.set(null);
  }

  /** Mapping status → severity Tag PrimeNG (biru-putih friendly). */
  protected statusSeverity(
    status: PengajuanStatus,
  ): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'menunggu_verifikasi':
        return 'warn';
      case 'terverifikasi':
      case 'work_order_terbuat':
        return 'success';
      case 'ditolak':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /** Mapping jenis → severity Tag (corrective=warn, preventive=info, predictive=secondary/help). */
  protected jenisSeverity(jenis: PengajuanJenis): 'info' | 'warn' | 'secondary' {
    switch (jenis) {
      case 'corrective':
        return 'warn';
      case 'preventive':
        return 'info';
      case 'predictive':
        return 'secondary';
    }
  }

  protected statusLabel(status: PengajuanStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected jenisLabel(jenis: PengajuanJenis): string {
    switch (jenis) {
      case 'corrective':
        return 'Corrective';
      case 'preventive':
        return 'Preventive';
      case 'predictive':
        return 'Predictive';
    }
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected truncate(s: string, max = 50): string {
    return s.length > max ? `${s.slice(0, max)}…` : s;
  }
}
