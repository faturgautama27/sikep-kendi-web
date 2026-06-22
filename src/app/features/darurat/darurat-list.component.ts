import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import { ToastModule } from 'primeng/toast';

import { DaruratState } from './state/darurat.state';
import { LaporanDarurat } from '@shared/models';

const STATUS_OPTIONS = [
  { label: 'Menunggu Verifikasi', value: 'MENUNGGU_VERIFIKASI' },
  { label: 'Terverifikasi', value: 'TERVERIFIKASI' },
  { label: 'Ditolak', value: 'DITOLAK' },
  { label: 'Reimburse Approved', value: 'REIMBURSE_APPROVED' },
];

@Component({
  selector: 'app-darurat-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    MultiSelectModule,
    PanelModule,
    ToastModule,
  ],
  templateUrl: './darurat-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratListComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly statusOptions = STATUS_OPTIONS;

  private readonly list = this.store.selectSignal(DaruratState.list);

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
      MENUNGGU_VERIFIKASI: 0,
      TERVERIFIKASI: 0,
      DITOLAK: 0,
      REIMBURSE_APPROVED: 0,
    };
    for (const p of this.list() || []) {
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
    this.router.navigate(['/darurat/new']);
  }

  protected onOpenDetail(p: LaporanDarurat): void {
    this.router.navigate(['/darurat', p.id]);
  }

  protected onResetFilter(): void {
    this.searchQuery.set('');
    this.selectedStatuses.set([]);
  }

  protected getStatusProps(status: string): any {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI':
        return { label: 'Menunggu Verifikasi', severity: 'warn' };
      case 'TERVERIFIKASI':
        return { label: 'Terverifikasi', severity: 'info' };
      case 'DITOLAK':
        return { label: 'Ditolak', severity: 'danger' };
      case 'REIMBURSE_APPROVED':
        return { label: 'Reimburse Approved', severity: 'success' };
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
