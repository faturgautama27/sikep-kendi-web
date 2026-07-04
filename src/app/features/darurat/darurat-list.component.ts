import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { PanelModule } from 'primeng/panel';
import { PopoverModule } from 'primeng/popover';
import { ToastModule } from 'primeng/toast';

import { DaruratState } from './state/darurat.state';
import { LaporanDarurat } from '@shared/models';
import { AuthState } from '@features/login/state';
import { APP_ENV } from '@core/data-access/app-env.token';
import { LoadDarurat } from './state/darurat.actions';

const STATUS_OPTIONS = [
  { label: 'Menunggu Verifikasi PB', value: 'MENUNGGU_VERIFIKASI_PB' },
  { label: 'Disetujui PB', value: 'DISETUJUI_PB' },
  { label: 'Ditolak PB', value: 'DITOLAK_PB' },
  { label: 'Menunggu Reimbursement', value: 'MENUNGGU_REIMBURSEMENT' },
  { label: 'Reimbursement Diajukan', value: 'REIMBURSEMENT_DIAJUKAN' },
  { label: 'Menunggu SHS PB', value: 'MENUNGGU_SHS_PB' },
  { label: 'SHS Dikerjakan', value: 'SHS_DIKERJAKAN' },
  { label: 'Menunggu PPTK', value: 'MENUNGGU_PPTK' },
  { label: 'Disetujui PPTK', value: 'DISETUJUI_PPTK' },
  { label: 'Dibayar', value: 'DIBAYAR' },
  { label: 'Ditolak Verifikator', value: 'DITOLAK_VERIFIKATOR' },
  { label: 'Ditolak PPTK', value: 'DITOLAK_PPTK' },
];

@Component({
  selector: 'app-darurat-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    MultiSelectModule,
    PanelModule,
    PopoverModule,
    ToastModule,
  ],
  templateUrl: './darurat-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  protected readonly env = inject(APP_ENV);

  protected readonly statusOptions = STATUS_OPTIONS;

  private readonly list = this.store.selectSignal(DaruratState.list);
  private readonly currentUser = this.store.selectSignal(AuthState.user);

  private readonly isDriverOnly = computed(() => {
    const roles = this.currentUser()?.roles || [];
    return roles.includes('pengemudi') && !roles.includes('admin_sistem');
  });

  ngOnInit(): void {
    if (this.isDriverOnly()) {
      const userId = this.currentUser()?.id;
      if (userId) {
        this.store.dispatch(new LoadDarurat({ pengemudiId: userId }));
      }
    }
  }

  protected readonly searchQuery = signal('');
  protected readonly selectedStatuses = signal<string[]>([]);

  protected readonly filteredList = computed<LaporanDarurat[]>(() => {
    const all = this.list() || [];
    const q = this.searchQuery().trim().toLowerCase();
    const statuses = this.selectedStatuses();

    return all.filter((p) => {
      if (q) {
        const nopol = p.kendaraan?.nomorPolisi || p.kendaraan?.tipe || '';
        const merk = p.kendaraan?.merk || '';
        const haystack = `${nopol} ${merk} ${p.deskripsiDarurat}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statuses.length > 0 && !statuses.includes(p.status)) return false;
      return true;
    });
  });

  protected readonly statsByStatus = computed(() => {
    const counts: Record<string, number> = {
      MENUNGGU_VERIFIKASI_PB: 0,
      DISETUJUI_PB: 0,
      DITOLAK_PB: 0,
      MENUNGGU_REIMBURSEMENT: 0,
      REIMBURSEMENT_DIAJUKAN: 0,
      MENUNGGU_SHS_PB: 0,
      SHS_DIKERJAKAN: 0,
      MENUNGGU_PPTK: 0,
      DISETUJUI_PPTK: 0,
      DIBAYAR: 0,
      DITOLAK_VERIFIKATOR: 0,
      DITOLAK_PPTK: 0,
    };
    for (const p of this.filteredList()) {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    }
    return STATUS_OPTIONS.map((s) => ({
      label: s.label,
      status: s.value,
      count: counts[s.value],
      severity: this.getStatusProps(s.value).severity,
    }));
  });

  protected onCreateManual(): void {
    if (this.env.isMobile) {
      this.router.navigate(['/driver/darurat/new']);
    } else {
      this.router.navigate(['/darurat/new']);
    }
  }

  protected onOpenDetail(p: LaporanDarurat): void {
    if (this.isDriverOnly()) {
      this.router.navigate(['/driver/darurat', p.id]);
    } else {
      this.router.navigate(['/darurat', p.id]);
    }
  }

  protected onResetFilter(): void {
    this.searchQuery.set('');
    this.selectedStatuses.set([]);
  }

  protected getStatusProps(status: string): any {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI_PB':
        return { label: 'Menunggu Verifikasi PB', severity: 'warn' };
      case 'DISETUJUI_PB':
        return { label: 'Disetujui PB', severity: 'info' };
      case 'DITOLAK_PB':
        return { label: 'Ditolak PB', severity: 'danger' };
      case 'MENUNGGU_REIMBURSEMENT':
        return { label: 'Menunggu Reimbursement', severity: 'warn' };
      case 'REIMBURSEMENT_DIAJUKAN':
        return { label: 'Reimbursement Diajukan', severity: 'info' };
      case 'MENUNGGU_SHS_PB':
        return { label: 'Menunggu SHS PB', severity: 'warn' };
      case 'SHS_DIKERJAKAN':
        return { label: 'SHS Dikerjakan', severity: 'info' };
      case 'MENUNGGU_PPTK':
        return { label: 'Menunggu PPTK', severity: 'warn' };
      case 'DISETUJUI_PPTK':
        return { label: 'Disetujui PPTK', severity: 'success' };
      case 'DIBAYAR':
        return { label: 'Dibayar', severity: 'success' };
      case 'DITOLAK_VERIFIKATOR':
        return { label: 'Ditolak Verifikator', severity: 'danger' };
      case 'DITOLAK_PPTK':
        return { label: 'Ditolak PPTK', severity: 'danger' };
      default:
        return { label: status, severity: 'secondary' };
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
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected truncate(s: string, max = 50): string {
    if (!s) return '';
    return s.length > max ? `${s.slice(0, max)}…` : s;
  }
}
