import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
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
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { PengajuanState } from './state';
import type { Pengajuan, PengajuanJenis, PengajuanStatus } from '@shared/models';
import { AuthState } from '@features/login/state';
import { APP_ENV } from '@core/data-access/app-env.token';
import { LoadPengajuan } from './state/pengajuan.actions';
import { NgClass } from '../../../../node_modules/@angular/common/types/_common_module-chunk';
import { DialogModule } from 'primeng/dialog';

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
  { label: 'Servis Rutin', value: 'SERVIS_RUTIN' },
  { label: 'Perbaikan Kerusakan', value: 'PERBAIKAN_KERUSAKAN' },
  { label: 'Ganti Spare Part', value: 'GANTI_SPARE_PART' },
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
    PopoverModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './pengajuan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PengajuanListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly env = inject(APP_ENV);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly jenisOptions = JENIS_OPTIONS;

  /** Snapshot list dari NGXS state. */
  private readonly list = this.store.selectSignal(PengajuanState.list);
  private readonly currentUser = this.store.selectSignal(AuthState.user);

  private readonly isDriverOnly = computed(() => {
    const roles = this.currentUser()?.roles || [];
    return roles.includes('pengemudi') && !roles.includes('admin_sistem');
  });

  ngOnInit(): void {
    if (this.isDriverOnly()) {
      const userId = this.currentUser()?.id;
      if (userId) {
        this.store.dispatch(new LoadPengajuan({ pengemudiId: userId }));
      }
    }
  }

  /** Filter signals. */
  protected readonly searchQuery = signal('');
  protected readonly selectedStatuses = signal<PengajuanStatus[]>([]);
  protected readonly selectedJenis = signal<PengajuanJenis | null>(null);

  /** Hasil filter list yang dirender ke tabel. */
  protected readonly filteredList = computed<Pengajuan[]>(() => {
    let all = this.list();
    if (!Array.isArray(all)) all = [];

    const q = this.searchQuery().trim().toLowerCase();
    const statuses = this.selectedStatuses();
    const jenis = this.selectedJenis();

    return all.filter((p) => {
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
    for (const p of this.filteredList()) {
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
    if (this.env.isMobile) {
      this.router.navigate(['/driver/pengajuan/new']);
    } else {
      this.router.navigate(['/pengajuan/new']);
    }
  }

  protected onOpenDetail(p: Pengajuan): void {
    if (this.isDriverOnly()) {
      this.router.navigate(['/driver/riwayat', p.id]);
    } else {
      this.router.navigate(['/pengajuan', p.id]);
    }
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
    this.store.dispatch(new LoadPengajuan());
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
      case 'SERVIS_RUTIN':
        return 'info';
      case 'PERBAIKAN_KERUSAKAN':
        return 'warn';
      case 'GANTI_SPARE_PART':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  protected statusLabel(status: PengajuanStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected jenisLabel(jenis: PengajuanJenis): string {
    switch (jenis) {
      case 'PERBAIKAN_KERUSAKAN':
        return 'Perbaikan';
      case 'SERVIS_RUTIN':
        return 'Servis';
      case 'GANTI_SPARE_PART':
        return 'Spare Part';
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
