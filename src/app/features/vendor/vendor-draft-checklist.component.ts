import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';

import { PageHeaderComponent } from '@core/layout';
import { CreateDraftChecklist, SubmitDraft, DraftChecklistState } from '@features/draft-checklist/state';
import type { DraftChecklistItem, DraftChecklistRecord } from '@features/draft-checklist/state';

type DraftStatus = 'DRAFT' | 'DIKIRIM' | 'DISETUJUI' | 'DITOLAK';

@Component({ selector: 'app-vendor-draft-checklist', standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, DatePickerModule, ConfirmDialogModule, DialogModule, InputNumberModule, TextareaModule, TableModule, TabsModule, TagModule, ToastModule, PageHeaderComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-draft-checklist.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class VendorDraftChecklistComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly today = new Date();

  private readonly list = this.store.selectSignal(DraftChecklistState.list);
  protected readonly drafts = computed<DraftChecklistRecord[]>(() =>
    this.list().filter(d => d.workOrderId === this.workOrderId).sort((a, b) => b.versi - a.versi)
  );
  protected readonly activeDraft = computed<DraftChecklistRecord | null>(() => this.drafts()[0] ?? null);
  protected readonly canEdit = computed(() => {
    const d = this.activeDraft();
    return !d || d.status === 'DRAFT' || d.status === 'DITOLAK';
  });
  protected readonly isReadOnly = computed(() => !this.canEdit());
  protected readonly totalHarga = computed(() => this.editItems().reduce((s, i) => s + i.hargaItem, 0));

  // Local editable items (working copy while in DRAFT/DITOLAK)
  protected readonly editItems = signal<(DraftChecklistItem & { _key: number })[]>([]);

  private itemKey = 0;

  protected readonly dialogVisible = signal(false);
  protected readonly editingIndex = signal<number | null>(null);

  protected readonly itemForm = this.fb.group({
    namaKerusakan: ['', [Validators.required, Validators.maxLength(200)]],
    namaSparepart: [''],
    tindakanPerbaikan: ['', [Validators.required, Validators.maxLength(500)]],
    hargaItem: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    // seed edit items from latest DRAFT or DITOLAK
    const d = this.activeDraft();
    if (d && (d.status === 'DRAFT' || d.status === 'DITOLAK')) {
      this.editItems.set(d.items.map(i => ({ ...i, _key: this.itemKey++ })));
    }
  }

  protected openAddItem(): void {
    this.editingIndex.set(null);
    this.itemForm.reset({ hargaItem: 0 });
    this.dialogVisible.set(true);
  }

  protected openEditItem(index: number): void {
    const item = this.editItems()[index];
    this.editingIndex.set(index);
    this.itemForm.patchValue({ namaKerusakan: item.namaKerusakan, namaSparepart: item.namaSparepart ?? '', tindakanPerbaikan: item.tindakanPerbaikan, hargaItem: item.hargaItem });
    this.dialogVisible.set(true);
  }

  protected saveItem(): void {
    this.itemForm.markAllAsTouched();
    if (this.itemForm.invalid) return;
    const raw = this.itemForm.getRawValue();
    const newItem: DraftChecklistItem & { _key: number } = {
      namaKerusakan: raw.namaKerusakan!,
      namaSparepart: raw.namaSparepart ?? undefined,
      tindakanPerbaikan: raw.tindakanPerbaikan!,
      hargaItem: Number(raw.hargaItem ?? 0),
      _key: this.editingIndex() !== null ? this.editItems()[this.editingIndex()!]._key : this.itemKey++,
    };
    if (this.editingIndex() !== null) {
      this.editItems.update(l => l.map((x, i) => i === this.editingIndex() ? newItem : x));
    } else {
      this.editItems.update(l => [...l, newItem]);
    }
    this.dialogVisible.set(false);
  }

  protected removeItem(index: number): void {
    this.editItems.update(l => l.filter((_, i) => i !== index));
  }

  protected simpanDraft(): void {
    if (this.editItems().length === 0) {
      this.msg.add({ severity: 'warn', summary: 'Minimal 1 item checklist diperlukan.' });
      return;
    }
    const items: DraftChecklistItem[] = this.editItems().map(({ _key: _k, ...i }) => i);
    this.store.dispatch(new CreateDraftChecklist(this.workOrderId, { items }));
    this.msg.add({ severity: 'success', summary: 'Draft checklist tersimpan.' });
  }

  protected kirimDraft(): void {
    if (this.editItems().length === 0) {
      this.msg.add({ severity: 'warn', summary: 'Draft tidak boleh kosong.' });
      return;
    }
    const d = this.activeDraft();
    if (!d || d.status !== 'DRAFT') {
      this.simpanDraft();
    }
    this.confirm.confirm({
      message: 'Draft checklist akan dikirim ke Pengurus Barang untuk direview. Setelah dikirim Anda tidak bisa mengubah item. Lanjutkan?',
      header: 'Konfirmasi Pengiriman', icon: 'pi pi-send', acceptLabel: 'Kirim', rejectLabel: 'Batal',
      accept: () => {
        const latest = this.activeDraft();
        if (latest) { this.store.dispatch(new SubmitDraft(latest.id)); this.msg.add({ severity: 'success', summary: 'Draft terkirim ke Pengurus Barang.' }); }
      },
    });
  }

  protected reviseDraft(): void {
    const d = this.activeDraft();
    if (!d || d.status !== 'DITOLAK') return;
    this.editItems.set(d.items.map(i => ({ ...i, _key: this.itemKey++ })));
    this.msg.add({ severity: 'info', summary: 'Silakan revisi item checklist dan kirim kembali.' });
  }

  protected statusSeverity(s: DraftStatus): 'secondary' | 'info' | 'success' | 'danger' {
    const m: Record<DraftStatus, 'secondary' | 'info' | 'success' | 'danger'> = { DRAFT: 'secondary', DIKIRIM: 'info', DISETUJUI: 'success', DITOLAK: 'danger' };
    return m[s];
  }

  protected formatCurrency(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }
}
