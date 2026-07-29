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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { IMAGE_DATA, type ImageDataPort } from '@core/data-access/ports/image-data.port';
import {
  CreateDraftChecklist,
  DraftChecklistState,
  LoadDraftChecklist,
  SubmitDraft,
} from '@features/draft-checklist/state';
import type { DraftChecklistItem, DraftChecklistRecord } from '@features/draft-checklist/state';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';

type DraftStatus = 'DRAFT' | 'DIKIRIM' | 'DISETUJUI' | 'DITOLAK';

export interface EditableRow {
  _key: number;
  tindakanPerbaikan: string;
  uraian: string;
  qty: number;
  harga: number;
  diskon: number;
  subTotal: number;
}

@Component({
  selector: 'app-vendor-draft-checklist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TabsModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-draft-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDraftChecklistComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly imageData = inject<ImageDataPort>(IMAGE_DATA);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';

  private readonly stateList = this.store.selectSignal(DraftChecklistState.list);

  protected readonly drafts = computed<DraftChecklistRecord[]>(() =>
    this.stateList()
      .filter((d) => String(d.workOrderId) === String(this.workOrderId))
      .sort((a, b) => b.versi - a.versi),
  );

  protected readonly activeDraft = computed<DraftChecklistRecord | null>(
    () => this.drafts()[0] ?? null,
  );

  protected readonly canEdit = computed(() => {
    const d = this.activeDraft();
    return !d || d.status === 'DRAFT' || d.status === 'DITOLAK';
  });

  protected readonly readOnlyRows = computed<EditableRow[]>(() =>
    (this.activeDraft()?.items ?? []).map((item, idx) => ({
      _key: idx,
      tindakanPerbaikan: item.tindakanPerbaikan ?? '',
      uraian: item.uraian ?? '',
      qty: Number(item.qty ?? 1),
      harga: Number(item.harga ?? item.hargaItem ?? 0),
      diskon: Number(item.diskon ?? 0),
      subTotal: Number(item.subTotal ?? item.hargaItem ?? 0),
    })),
  );

  protected readonly rows = signal<EditableRow[]>([]);
  private nextKey = 1;

  protected readonly totalAuto = computed(() =>
    this.rows().reduce((s, r) => s + r.subTotal, 0),
  );

  protected readonly hasRows = computed(() => this.rows().length > 0);

  protected totalManual = 0;

  protected readonly scanUploading = signal(false);
  protected readonly scanImageId = signal<number | null>(null);
  protected readonly scanImageUrl = signal<string | null>(null);
  protected readonly scanFileName = signal<string | null>(null);

  protected readonly saving = signal(false);

  constructor() {
    effect(() => {
      const draft = this.activeDraft();

      if (draft && (draft.status === 'DRAFT' || draft.status === 'DITOLAK')) {
        const mapped: EditableRow[] = draft.items.map((item) => ({
          _key: this.nextKey++,
          tindakanPerbaikan: item.tindakanPerbaikan ?? '',
          uraian: item.uraian ?? '',
          qty: Number(item.qty ?? 1),
          harga: Number(item.harga ?? item.hargaItem ?? 0),
          diskon: Number(item.diskon ?? 0),
          subTotal: Number(item.subTotal ?? item.hargaItem ?? 0),
        }));
        untracked(() => {
          this.rows.set(mapped);
          this.totalManual = 0;
        });
      } else if (!draft) {
        untracked(() => {
          this.rows.set([]);
          this.totalManual = 0;
        });
      }

      if (draft?.scanDraftImageId) {
        untracked(() => {
          this.scanImageId.set(Number(draft.scanDraftImageId));
          this.scanImageUrl.set(draft.scanDraftImageUrl ?? null);
          this.scanFileName.set('Scan Dokumen');
        });
      } else if (!draft) {
        untracked(() => {
          this.scanImageId.set(null);
          this.scanImageUrl.set(null);
          this.scanFileName.set(null);
        });
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(new LoadDraftChecklist(this.workOrderId));
  }

  protected addRow(): void {
    const row: EditableRow = {
      _key: this.nextKey++,
      tindakanPerbaikan: '',
      uraian: '',
      qty: 1,
      harga: 0,
      diskon: 0,
      subTotal: 0,
    };
    this.rows.update((rs) => [...rs, row]);
  }

  protected removeRow(key: number): void {
    this.rows.update((rs) => rs.filter((r) => r._key !== key));
  }

  protected setField<K extends keyof EditableRow>(
    key: number,
    field: K,
    value: EditableRow[K],
  ): void {
    this.rows.update((rs) =>
      rs.map((r) => {
        if (r._key !== key) return r;
        const updated = { ...r, [field]: value };
        updated.subTotal = Math.round(
          updated.harga * updated.qty * (1 - updated.diskon / 100),
        );
        return updated;
      }),
    );
  }

  protected onScanSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.scanUploading.set(true);
    this.imageData.upload(file).subscribe({
      next: (img) => {
        this.scanImageId.set(Number(img.id));
        this.scanImageUrl.set(img.url);
        this.scanFileName.set(file.name);
        this.scanUploading.set(false);
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Gagal upload scan dokumen.' });
        this.scanUploading.set(false);
      },
    });
  }

  protected removeScan(): void {
    this.scanImageId.set(null);
    this.scanImageUrl.set(null);
    this.scanFileName.set(null);
  }

  protected simpanDraft(): void {
    const items = this.toPayload();
    if (items.length === 0 && this.totalManual <= 0) {
      this.msg.add({ severity: 'warn', summary: 'Minimal 1 item atau isi Total Harga manual.' });
      return;
    }
    this.saving.set(true);
    this.store
      .dispatch(new CreateDraftChecklist(this.workOrderId, this.buildPayload(items)))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.msg.add({ severity: 'success', summary: 'Draft tersimpan.' });
        },
        error: () => {
          this.saving.set(false);
          this.msg.add({ severity: 'error', summary: 'Gagal menyimpan draft.' });
        },
      });
  }

  protected kirimDraft(): void {
    const items = this.toPayload();
    if (items.length === 0 && this.totalManual <= 0) {
      this.msg.add({ severity: 'warn', summary: 'Minimal 1 item atau isi Total Harga manual.' });
      return;
    }
    this.confirm.confirm({
      message: 'Draft akan dikirim ke Pengurus Barang. Setelah dikirim tidak bisa diubah. Lanjutkan?',
      header: 'Konfirmasi Pengiriman',
      icon: 'pi pi-send',
      acceptLabel: 'Kirim',
      rejectLabel: 'Batal',
      accept: () => {
        this.saving.set(true);
        // Selalu simpan rows terbaru dulu, baru submit
        this.store
          .dispatch(new CreateDraftChecklist(this.workOrderId, this.buildPayload(items)))
          .subscribe({
            next: () => {
              const latest = this.activeDraft();
              if (!latest) {
                this.saving.set(false);
                this.msg.add({ severity: 'error', summary: 'Draft tidak ditemukan setelah disimpan.' });
                return;
              }
              this.store.dispatch(new SubmitDraft(latest.id)).subscribe({
                next: () => {
                  this.saving.set(false);
                  this.msg.add({ severity: 'success', summary: 'Draft terkirim ke Pengurus Barang.' });
                },
                error: () => {
                  this.saving.set(false);
                  this.msg.add({ severity: 'error', summary: 'Gagal mengirim draft.' });
                },
              });
            },
            error: () => {
              this.saving.set(false);
              this.msg.add({ severity: 'error', summary: 'Gagal menyimpan draft sebelum kirim.' });
            },
          });
      },
    });
  }

  protected reviseDraft(): void {
    const draft = this.activeDraft();
    if (!draft || draft.status !== 'DITOLAK') return;
    const mapped: EditableRow[] = draft.items.map((item) => ({
      _key: this.nextKey++,
      tindakanPerbaikan: item.tindakanPerbaikan ?? '',
      uraian: item.uraian ?? '',
      qty: Number(item.qty ?? 1),
      harga: Number(item.harga ?? item.hargaItem ?? 0),
      diskon: Number(item.diskon ?? 0),
      subTotal: Number(item.subTotal ?? item.hargaItem ?? 0),
    }));
    this.rows.set(mapped);
    this.msg.add({ severity: 'info', summary: 'Silakan revisi item dan kirim kembali.' });
  }

  private toPayload(): DraftChecklistItem[] {
    return this.rows().map((r) => ({
      tindakanPerbaikan: r.tindakanPerbaikan || '-',
      uraian: r.uraian || undefined,
      qty: r.qty,
      harga: r.harga,
      diskon: r.diskon,
      subTotal: r.subTotal,
      hargaItem: r.subTotal,
    }));
  }

  private buildPayload(items: DraftChecklistItem[]): Record<string, unknown> {
    return {
      items,
      totalHargaManual: items.length === 0 ? this.totalManual : undefined,
      scanDraftImageId: this.scanImageId() ?? undefined,
    };
  }

  protected statusSeverity(s: DraftStatus): 'secondary' | 'info' | 'success' | 'danger' {
    const m: Record<DraftStatus, 'secondary' | 'info' | 'success' | 'danger'> = {
      DRAFT: 'secondary', DIKIRIM: 'info', DISETUJUI: 'success', DITOLAK: 'danger',
    };
    return m[s];
  }

  protected fmt(v: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(v ?? 0);
  }

  protected fmtDt(v: string): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(v));
  }
}
