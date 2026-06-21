import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { AuditState, FilterAuditLogs, LoadAuditLogs } from '@features/audit/state';
import type { AuditLog, RoleName } from '@shared/models';

interface ActorOption {
  readonly label: string;
  readonly value: string;
}

interface SelectOption<T extends string = string> {
  readonly label: string;
  readonly value: T | null;
}

interface FilterFormState {
  fromDate: Date | null;
  toDate: Date | null;
  actorId: string | null;
  role: string | null;
  entity: string | null;
  action: string | null;
}

const ROLE_OPTIONS: SelectOption<RoleName | 'system'>[] = [
  { label: 'Semua Role', value: null },
  { label: 'Admin Sistem', value: 'admin_sistem' },
  { label: 'Pengurus Barang', value: 'pengurus_barang' },
  { label: 'Verifikator', value: 'verifikator' },
  { label: 'Bendahara', value: 'bendahara' },
  { label: 'Pengemudi', value: 'pengemudi' },
  { label: 'Vendor', value: 'vendor' },
  { label: 'System', value: 'system' },
];

const ENTITY_OPTIONS: SelectOption[] = [
  { label: 'Semua Entitas', value: null },
  { label: 'Auth', value: 'Auth' },
  { label: 'Vehicle', value: 'Vehicle' },
  { label: 'Pengajuan', value: 'Pengajuan' },
  { label: 'WorkOrder', value: 'WorkOrder' },
  { label: 'DraftChecklist', value: 'DraftChecklist' },
  { label: 'Penawaran', value: 'Penawaran' },
  { label: 'VerifikasiHarga', value: 'VerifikasiHarga' },
  { label: 'Pembayaran', value: 'Pembayaran' },
  { label: 'Darurat', value: 'Darurat' },
  { label: 'User', value: 'User' },
  { label: 'Notification', value: 'Notification' },
  { label: 'AuditLog', value: 'AuditLog' },
];

const ACTION_OPTIONS: SelectOption[] = [
  { label: 'Semua Aksi', value: null },
  { label: 'created', value: 'created' },
  { label: 'updated', value: 'updated' },
  { label: 'deleted', value: 'deleted' },
  { label: 'submitted', value: 'submitted' },
  { label: 'approved', value: 'approved' },
  { label: 'rejected', value: 'rejected' },
  { label: 'validated', value: 'validated' },
  { label: 'matched', value: 'matched' },
  { label: 'set_follow_up', value: 'set_follow_up' },
  { label: 'uploaded', value: 'uploaded' },
  { label: 'login', value: 'login' },
  { label: 'login_failed', value: 'login_failed' },
  { label: 'login_blocked', value: 'login_blocked' },
  { label: 'forbidden_attempt', value: 'forbidden_attempt' },
  { label: 'exported', value: 'exported' },
  { label: 'viewed', value: 'viewed' },
];

/**
 * SiKeP KenDI — Halaman Audit Trail.
 *
 * Menampilkan tabel `AuditState.logs` dengan filter (rentang tanggal, aktor,
 * role, entitas, aksi). Filter dispatch ke `FilterAuditLogs` action sehingga
 * selector `AuditState.logs` otomatis melakukan filtering. Setiap baris
 * dapat di-expand untuk menampilkan diff before/after dalam JSON pretty.
 *
 * Phase 1: tombol Export CSV/PDF hanya menampilkan toast info — implementasi
 * riil dibuat di task 24.x bersama service ekspor.
 *
 * Footer: indikator hash chain integrity dummy (✅ Valid) untuk demo.
 *
 * Referensi: Requirement 16.2, 16.3, 16.4.
 */
@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    PaginatorModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './audit-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly messageService = inject(MessageService);

  ngOnInit(): void {
    this.store.dispatch(new LoadAuditLogs());
  }

  /** Logs ter-filter dari NGXS state. Filter di-apply oleh `AuditState.logs` selector. */
  protected readonly logs = this.store.selectSignal(AuditState.logs);

  /**
   * Sumber data lengkap (raw, sebelum filter) — dipakai untuk membangun list
   * aktor unik. Di-akses langsung lewat selector inline ke shape state slice.
   */
  private readonly allLogs = this.store.selectSignal<AuditLog[]>(
    (state: { audit: { logs: AuditLog[] } }) => state.audit.logs,
  );

  /** Opsi aktor unik dari semua log. */
  protected readonly actorOptions = computed<ActorOption[]>(() => {
    const map = new Map<string, string>();
    for (const log of this.allLogs()) {
      if (!map.has(log.actorId)) {
        map.set(log.actorId, log.actorName);
      }
    }
    const list: ActorOption[] = Array.from(map.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'Semua Aktor', value: '' }, ...list];
  });

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly entityOptions = ENTITY_OPTIONS;
  protected readonly actionOptions = ACTION_OPTIONS;

  /** State form filter. */
  protected readonly filterForm = signal<FilterFormState>({
    fromDate: null,
    toDate: null,
    actorId: null,
    role: null,
    entity: null,
    action: null,
  });

  /** Update single field tanpa mutate signal value. */
  protected updateFilter<K extends keyof FilterFormState>(key: K, value: FilterFormState[K]): void {
    this.filterForm.update((f) => ({ ...f, [key]: value }));
  }

  /** Apply filter ke NGXS state. */
  protected onApplyFilter(): void {
    const f = this.filterForm();
    this.store.dispatch(
      new FilterAuditLogs({
        from: f.fromDate ? f.fromDate.toISOString() : undefined,
        to: f.toDate ? this.endOfDayISO(f.toDate) : undefined,
        actorId: f.actorId ? f.actorId : undefined,
        role: f.role ?? undefined,
        entity: f.entity ?? undefined,
        action: f.action ?? undefined,
      }),
    );
  }

  /** Reset filter form dan dispatch FilterAuditLogs({}). */
  protected onResetFilter(): void {
    this.filterForm.set({
      fromDate: null,
      toDate: null,
      actorId: null,
      role: null,
      entity: null,
      action: null,
    });
    this.store.dispatch(new FilterAuditLogs({}));
  }

  protected onExport(format: 'csv' | 'pdf'): void {
    this.messageService.add({
      severity: 'info',
      summary: `Export ${format.toUpperCase()}`,
      detail: 'Ekspor audit trail tidak diaktifkan di Preview Mode.',
      life: 3500,
    });
  }

  /** Severity color map untuk aksi audit. */
  protected actionSeverity(action: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (action) {
      case 'created':
      case 'approved':
      case 'matched':
      case 'login':
      case 'submitted':
      case 'validated':
        return 'success';
      case 'updated':
      case 'uploaded':
      case 'set_follow_up':
        return 'info';
      case 'deleted':
      case 'rejected':
      case 'login_failed':
      case 'login_blocked':
      case 'forbidden_attempt':
        return 'danger';
      case 'exported':
      case 'viewed':
        return 'secondary';
      default:
        return 'warn';
    }
  }

  /** Severity color untuk role. */
  protected roleSeverity(role: AuditLog['role']): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (role) {
      case 'admin_sistem':
        return 'danger';
      case 'verifikator':
        return 'warn';
      case 'bendahara':
        return 'warn';
      case 'pengurus_barang':
        return 'info';
      case 'vendor':
        return 'success';
      case 'pengemudi':
        return 'success';
      case 'system':
        return 'secondary';
      default:
        return 'info';
    }
  }

  /** Format ISO timestamp → "dd MMM yyyy HH:mm". */
  protected formatDateTime(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  /** JSON pretty string. */
  protected formatJson(value: unknown): string {
    if (value === null || value === undefined) return '—';
    return JSON.stringify(value, null, 2);
  }

  private endOfDayISO(d: Date): string {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  }
}
