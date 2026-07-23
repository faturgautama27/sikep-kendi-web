import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ImageModule } from 'primeng/image';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { IMAGE_DATA, type ImageDataPort } from '@core/data-access/ports/image-data.port';
import { WorkOrdersState, GetWorkOrderDetail } from '@features/work-orders/state';
import {
  DraftChecklistState,
  LoadDraftChecklist,
  CreateDraftChecklist,
  UpdateDraftChecklist,
  SubmitDraft,
  ApproveDraft,
  RejectDraft,
} from './state';
import type { DraftChecklistRecord } from './state';
import { AuthState } from '@features/login/state/auth.state';

type PageMode = 'new' | 'edit' | 'view';

interface SpreadsheetRow {
  _key: number;
  uraian: string;
  qty: number;
  harga: number;
  diskon: number;
  subTotal: number;   // computed live
}

@Component({
  selector: 'app-draft-checklist-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ImageModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './draft-checklist-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftChecklistFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly imageData = inject<ImageDataPort>(IMAGE_DATA);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly woId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly draftId = this.route.snapshot.paramMap.get('draftId') ?? null;
  // Query param ?from=<draftId> — untuk mode duplicate
  private readonly duplicateFromId = this.route.snapshot.queryParamMap.get('from') ?? null;
  protected readonly mode = signal<PageMode>(this.resolveMode());

  protected readonly isView = computed(() => this.mode() === 'view');
  protected readonly isEdit = computed(() => this.mode() === 'edit');
  protected readonly isNew = computed(() => this.mode() === 'new');

  protected readonly wo = this.store.selectSignal(WorkOrdersState.detail);
  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly isPB = computed(() => this.user()?.roles?.includes('pengurus_barang'));
  protected readonly isAdmin = computed(() => this.user()?.roles?.includes('admin_sistem'));

  // Review state (PB)
  protected readonly reviewCatatan = signal('');
  protected readonly reviewLoading = signal(false);
  protected readonly canReview = computed(() => {
    const draft = this.currentDraft();
    return this.isView() && draft?.status === 'DIKIRIM' && (this.isPB() || this.isAdmin());
  });

  private readonly allDrafts = this.store.selectSignal(DraftChecklistState.list);
  protected readonly currentDraft = computed<DraftChecklistRecord | null>(() => {
    if (!this.draftId) return null;
    return this.allDrafts().find((d) => String(d.id) === String(this.draftId)) ?? null;
  });

  // Draft sumber untuk mode duplicate (?from=<draftId>)
  protected readonly sourceDraft = computed<DraftChecklistRecord | null>(() => {
    if (!this.duplicateFromId) return null;
    return this.allDrafts().find((d) => String(d.id) === String(this.duplicateFromId)) ?? null;
  });

  // ─── Spreadsheet rows ────────────────────────────────────────────────────
  private rowKey = 0;
  protected readonly rows = signal<SpreadsheetRow[]>([]);
  protected readonly saving = signal(false);

  // Total harga manual — dipakai hanya jika rows kosong
  protected readonly totalManual = signal<number>(0);

  protected readonly totalAuto = computed(() =>
    this.rows().reduce((sum, r) => sum + r.subTotal, 0),
  );
  protected readonly hasRows = computed(() => this.rows().length > 0);
  protected readonly grandTotal = computed(() =>
    this.hasRows() ? this.totalAuto() : this.totalManual(),
  );

  // ─── Scan draft upload ────────────────────────────────────────────────────
  protected readonly scanUploading = signal(false);
  protected readonly scanImageId = signal<number | null>(null);
  protected readonly scanImageUrl = signal<string | null>(null);
  protected readonly scanFileName = signal<string | null>(null);

  constructor() {
    // Pre-fill dari draft existing (edit mode) atau duplicate source
    effect(() => {
      const draft = this.currentDraft();
      const source = this.sourceDraft();
      const m = this.mode();

      // Mode edit: populate dari draft yang sedang diedit
      if (draft && m !== 'view' && (draft.status === 'DRAFT' || draft.status === 'DITOLAK')) {
        untracked(() => this.populateFromDraft(draft));
        return;
      }

      // Mode new + ?from=<draftId>: pre-fill dari draft sumber (duplicate)
      if (!draft && m === 'new' && source) {
        untracked(() => this.populateFromDraft(source, true));
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(new GetWorkOrderDetail(this.woId));
    this.store.dispatch(new LoadDraftChecklist(this.woId));
  }

  private resolveMode(): PageMode {
    const segs = this.route.snapshot.url.map((s) => s.path);
    if (segs.includes('new')) return 'new';
    if (segs.includes('edit')) return 'edit';
    return 'view';
  }

  protected goBack(): void {
    this.router.navigate(['/work-orders', this.woId]);
  }

  private populateFromDraft(draft: DraftChecklistRecord, skipScan = false): void {
    // Items
    this.rows.set(
      draft.items.map((item) => ({
        _key: this.rowKey++,
        uraian: item.uraian ?? item.namaKerusakan ?? '',
        qty: Number(item.qty ?? 1),
        harga: Number(item.harga ?? item.hargaItem ?? 0),
        diskon: Number(item.diskon ?? 0),
        subTotal: this.computeSubTotal(
          Number(item.qty ?? 1),
          Number(item.harga ?? item.hargaItem ?? 0),
          Number(item.diskon ?? 0),
        ),
      })),
    );
    this.totalManual.set(Number(draft.totalHarga ?? 0));

    // Scan — skip jika duplicate (scan tidak di-copy, vendor harus upload baru)
    if (!skipScan && draft.scanDraftImageId) {
      this.scanImageId.set(draft.scanDraftImageId!);
      this.scanImageUrl.set(draft.scanDraftImageUrl ?? null);
      this.scanFileName.set('Scan Draft');
    }
  }

  // ─── Spreadsheet helpers ──────────────────────────────────────────────────
  private computeSubTotal(qty: number, harga: number, diskon: number): number {
    return +(qty * harga * (1 - diskon / 100)).toFixed(2);
  }

  protected addRow(): void {
    this.rows.update((r) => [
      ...r,
      { _key: this.rowKey++, uraian: '', qty: 1, harga: 0, diskon: 0, subTotal: 0 },
    ]);
  }

  protected removeRow(key: number): void {
    this.rows.update((r) => r.filter((row) => row._key !== key));
  }

  protected updateRow(key: number, field: keyof Omit<SpreadsheetRow, '_key' | 'subTotal'>, value: any): void {
    this.rows.update((rows) =>
      rows.map((row) => {
        if (row._key !== key) return row;
        const updated = { ...row, [field]: value ?? 0 };
        updated.subTotal = this.computeSubTotal(updated.qty, updated.harga, updated.diskon);
        return updated;
      }),
    );
  }

  // ─── Scan upload ──────────────────────────────────────────────────────────
  protected onScanSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.scanUploading.set(true);
    this.imageData.upload(file).subscribe({
      next: (img) => {
        this.scanUploading.set(false);
        this.scanImageId.set(Number(img.id));
        this.scanImageUrl.set(img.url ?? null);
        this.scanFileName.set(file.name);
        this.msg.add({ severity: 'success', summary: 'Scan berhasil diupload.' });
      },
      error: () => {
        this.scanUploading.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal upload scan.' });
      },
    });
    input.value = '';
  }

  protected removeScan(): void {
    this.scanImageId.set(null);
    this.scanImageUrl.set(null);
    this.scanFileName.set(null);
  }

  protected isScanImage(): boolean {
    const name = this.scanFileName() ?? '';
    return /\.(jpg|jpeg|png|webp)$/i.test(name);
  }

  // ─── Status helpers ───────────────────────────────────────────────────────
  protected draftStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Draft', DIKIRIM: 'Dikirim', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak',
    };
    return map[status] ?? status;
  }

  protected draftStatusSeverity(status: string): 'secondary' | 'info' | 'success' | 'danger' {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'DIKIRIM': return 'info';
      case 'DISETUJUI': return 'success';
      case 'DITOLAK': return 'danger';
      default: return 'secondary';
    }
  }

  protected formatDateTime(val: string): string {
    if (!val) return '-';
    return new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  protected formatRupiah(n: number | string | null | undefined): string {
    const val = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(val || 0);
  }

  protected formatNumber(n: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(n ?? 0);
  }

  // ─── Build payload ────────────────────────────────────────────────────────
  private buildPayload(): Record<string, unknown> {
    const items = this.rows().map((r, idx) => ({
      uraian: r.uraian.trim() || '-',
      qty: r.qty,
      harga: r.harga,
      diskon: r.diskon,
      urutan: idx + 1,
    }));

    return {
      items: items.length ? items : [],
      scanDraftImageId: this.scanImageId() ?? undefined,
      totalHarga: this.grandTotal(),
    };
  }

  // ─── Save / Submit ────────────────────────────────────────────────────────
  protected simpanDraft(): void {
    if (!this.hasRows() && this.grandTotal() <= 0) {
      this.msg.add({ severity: 'warn', summary: 'Isi minimal 1 item atau masukkan total harga manual.' });
      return;
    }
    this.saving.set(true);

    const action$ = this.isNew() || !this.draftId
      ? this.store.dispatch(new CreateDraftChecklist(this.woId, this.buildPayload()))
      : this.store.dispatch(new UpdateDraftChecklist(this.draftId!, this.woId, this.buildPayload()));

    action$.subscribe({
      next: () => {
        this.saving.set(false);
        this.msg.add({ severity: 'success', summary: 'Draft tersimpan.' });
        this.router.navigate(['/work-orders', this.woId]);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.msg.add({ severity: 'error', summary: err?.error?.message ?? 'Gagal menyimpan.' });
      },
    });
  }

  protected kirimDraft(): void {
    if (!this.hasRows() && this.grandTotal() <= 0) {
      this.msg.add({ severity: 'warn', summary: 'Isi minimal 1 item atau masukkan total harga manual.' });
      return;
    }
    this.confirm.confirm({
      message: 'Draft akan dikirim ke Pengurus Barang untuk direview. Setelah dikirim item tidak bisa diubah. Lanjutkan?',
      header: 'Konfirmasi Pengiriman',
      icon: 'pi pi-send',
      acceptLabel: 'Kirim',
      rejectLabel: 'Batal',
      accept: () => this.doSubmit(),
    });
  }

  private doSubmit(): void {
    this.saving.set(true);
    const payload = this.buildPayload();

    const saveThenSubmit = (draftId: string) => {
      this.store.dispatch(new SubmitDraft(draftId)).subscribe({
        next: () => {
          this.saving.set(false);
          this.msg.add({ severity: 'success', summary: 'Draft terkirim ke Pengurus Barang.' });
          this.router.navigate(['/work-orders', this.woId]);
        },
        error: (err: any) => {
          this.saving.set(false);
          this.msg.add({ severity: 'error', summary: err?.error?.message ?? 'Gagal mengirim.' });
        },
      });
    };

    if (this.isNew() || !this.draftId) {
      this.store.dispatch(new CreateDraftChecklist(this.woId, payload)).subscribe({
        next: () => {
          const drafts = this.allDrafts()
            .filter((d) => String(d.workOrderId) === String(this.woId))
            .sort((a, b) => b.versi - a.versi);
          const latest = drafts[0];
          if (!latest) { this.saving.set(false); return; }
          saveThenSubmit(latest.id);
        },
        error: (err: any) => {
          this.saving.set(false);
          this.msg.add({ severity: 'error', summary: err?.error?.message ?? 'Gagal membuat draft.' });
        },
      });
    } else {
      this.store.dispatch(new UpdateDraftChecklist(this.draftId!, this.woId, payload)).subscribe({
        next: () => saveThenSubmit(this.draftId!),
        error: (err: any) => {
          this.saving.set(false);
          this.msg.add({ severity: 'error', summary: err?.error?.message ?? 'Gagal memperbarui.' });
        },
      });
    }
  }

  // ─── PB Review ───────────────────────────────────────────────────────────
  protected approveDraft(): void {
    const draft = this.currentDraft();
    if (!draft) return;
    this.confirm.confirm({
      message: `Setujui Draft v${draft.versi}? Work Order akan lanjut ke tahap Penawaran.`,
      header: 'Konfirmasi Persetujuan',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Setujui',
      rejectLabel: 'Batal',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.reviewLoading.set(true);
        this.store.dispatch(new ApproveDraft(draft.id)).subscribe({
          next: () => {
            this.reviewLoading.set(false);
            this.msg.add({ severity: 'success', summary: 'Draft disetujui.' });
            this.store.dispatch(new GetWorkOrderDetail(this.woId));
            this.router.navigate(['/work-orders', this.woId]);
          },
          error: (err: any) => {
            this.reviewLoading.set(false);
            this.msg.add({ severity: 'error', summary: err?.error?.message ?? 'Gagal menyetujui.' });
          },
        });
      },
    });
  }

  protected rejectDraft(): void {
    const draft = this.currentDraft();
    if (!draft) return;
    const catatan = this.reviewCatatan().trim();
    if (!catatan) {
      this.msg.add({ severity: 'warn', summary: 'Catatan penolakan wajib diisi.' });
      return;
    }
    this.reviewLoading.set(true);
    this.store.dispatch(new RejectDraft(draft.id, catatan)).subscribe({
      next: () => {
        this.reviewLoading.set(false);
        this.reviewCatatan.set('');
        this.msg.add({ severity: 'info', summary: 'Draft ditolak. Vendor dapat merevisi.' });
        this.store.dispatch(new GetWorkOrderDetail(this.woId));
        this.router.navigate(['/work-orders', this.woId]);
      },
      error: (err: any) => {
        this.reviewLoading.set(false);
        this.msg.add({ severity: 'error', summary: err?.error?.message ?? 'Gagal menolak.' });
      },
    });
  }
}
