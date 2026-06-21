import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngxs/store';

import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { SpjState } from '@features/spj/state';
import type { SpjExternal, SpjStatus, SpjKategori } from '@shared/models';

type StatusFilter = 'all' | SpjStatus;

interface TabDef {
  readonly key: StatusFilter;
  readonly label: string;
}

/**
 * ARMADIN — Halaman SPJ Reconciliation.
 *
 * Menampilkan daftar SPJ eksternal (`SpjState.list`) yang dapat difilter
 * berdasarkan status (`Semua` / `matched` / `ambiguous` / `unmatched` /
 * `needs_follow_up`) lewat tab. Setiap baris dapat di-expand untuk melihat
 * detail kontekstual:
 *
 * - **matched**: internal ref + match type + confidence
 * - **ambiguous**: tabel kandidat dengan tombol "Pilih sebagai Match" (dummy)
 * - **unmatched**: pesan + tombol "Tandai Needs Follow-up" (dummy)
 * - **needs_follow_up**: alasan dan langkah follow-up
 *
 * Phase 1: aksi tombol (upload, pilih match, tandai follow-up) cukup memicu
 * toast info — implementasi penuh dibuat di task 26.x bersama form upload.
 *
 * Referensi: Requirement 14.1, 14.3, 14.5, 14.6, 14.8, 14.9.
 */
@Component({
  selector: 'app-spj-list',
  standalone: true,
  imports: [
    BadgeModule,
    ButtonModule,
    TableModule,
    TabsModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './spj-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpjListComponent {
  private readonly store = inject(Store);
  private readonly messageService = inject(MessageService);

  /** Sumber data SPJ keseluruhan dari NGXS state. */
  protected readonly all = this.store.selectSignal(SpjState.list);

  /** Tab aktif. Default: "Semua". */
  protected readonly activeTab = signal<StatusFilter>('all');

  /** Definisi tab yang ditampilkan. */
  protected readonly tabs: readonly TabDef[] = [
    { key: 'all', label: 'Semua' },
    { key: 'matched', label: 'Matched' },
    { key: 'ambiguous', label: 'Ambiguous' },
    { key: 'unmatched', label: 'Unmatched' },
    { key: 'needs_follow_up', label: 'Needs Follow-up' },
  ];

  /** Daftar SPJ ter-filter sesuai tab aktif. */
  protected readonly filtered = computed<SpjExternal[]>(() => {
    const list = this.all();
    const tab = this.activeTab();
    if (tab === 'all') {
      return list;
    }
    return list.filter((spj) => spj.status === tab);
  });

  /** Hitungan per status untuk badge angka di tab. */
  protected readonly counts = computed(() => {
    const list = this.all();
    return {
      all: list.length,
      matched: list.filter((s) => s.status === 'matched').length,
      ambiguous: list.filter((s) => s.status === 'ambiguous').length,
      unmatched: list.filter((s) => s.status === 'unmatched').length,
      needs_follow_up: list.filter((s) => s.status === 'needs_follow_up').length,
    };
  });

  /** Map tab key → severity badge. */
  protected tabBadgeSeverity(key: StatusFilter): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (key) {
      case 'matched':
        return 'success';
      case 'ambiguous':
        return 'warn';
      case 'unmatched':
        return 'danger';
      case 'needs_follow_up':
        return 'info';
      default:
        return 'secondary';
    }
  }

  protected onTabChange(value: string | number | undefined): void {
    if (typeof value === 'string') {
      this.activeTab.set(value as StatusFilter);
    }
  }

  protected onUploadClick(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Upload SPJ',
      detail: 'Form upload SPJ akan tersedia di tahap berikutnya (preview mode).',
      life: 3500,
    });
  }

  protected onPickCandidate(spj: SpjExternal): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Match dipilih',
      detail: `Kandidat untuk ${spj.nomorSpj} dipilih (preview mode — tidak persist).`,
      life: 3500,
    });
  }

  protected onMarkFollowUp(spj: SpjExternal): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Tandai Needs Follow-up',
      detail: `${spj.nomorSpj} ditandai untuk tindak lanjut (preview mode).`,
      life: 3500,
    });
  }

  /** Severity Tag untuk status SPJ. */
  protected statusSeverity(status: SpjStatus): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 'matched':
        return 'success';
      case 'ambiguous':
        return 'warn';
      case 'unmatched':
        return 'danger';
      case 'needs_follow_up':
        return 'info';
    }
  }

  /** Severity Tag untuk kategori SPJ. */
  protected kategoriSeverity(kategori: SpjKategori): 'info' | 'warn' | 'secondary' {
    switch (kategori) {
      case 'BBM':
        return 'info';
      case 'pemeliharaan':
        return 'warn';
      case 'lainnya':
        return 'secondary';
    }
  }

  /** Severity Badge untuk umur upload (hari). */
  protected daysSeverity(days: number): 'info' | 'warn' | 'danger' {
    if (days > 14) return 'danger';
    if (days >= 7) return 'warn';
    return 'info';
  }

  /** Format Rupiah ID locale. */
  protected formatRupiah(value: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  /** Format ISO timestamp → "dd MMM yyyy". */
  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }

  /** Confidence (0..1) → "98%". */
  protected formatConfidence(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
}
