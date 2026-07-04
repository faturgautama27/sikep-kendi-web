import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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

import { CreateDraftChecklist, LoadDraftChecklist, SubmitDraft, DraftChecklistState } from '@features/draft-checklist/state';
import type { DraftChecklistItem, DraftChecklistRecord } from '@features/draft-checklist/state';
import { IMAGE_DATA, type ImageDataPort } from '@core/data-access/ports/image-data.port';
import { InputTextModule } from 'primeng/inputtext';

type DraftStatus = 'DRAFT' | 'DIKIRIM' | 'DISETUJUI' | 'DITOLAK';

interface ItemFotoState {
  id?: number;
  file?: File;
  previewUrl: string;
}

@Component({ selector: 'app-vendor-draft-checklist', standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, DatePickerModule, ConfirmDialogModule, DialogModule, InputNumberModule, InputTextModule, TextareaModule, TableModule, TabsModule, TagModule, ToastModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-draft-checklist.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class VendorDraftChecklistComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly imageData = inject<ImageDataPort>(IMAGE_DATA);

  protected readonly uploading = signal(false);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly today = new Date();

  private readonly list = this.store.selectSignal(DraftChecklistState.list);
  protected readonly drafts = computed<DraftChecklistRecord[]>(() =>
    this.list().filter(d => String(d.workOrderId) === String(this.workOrderId)).sort((a, b) => b.versi - a.versi)
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
    namaKerusakan: [''],
    namaSparepart: [''],
    tindakanPerbaikan: [''],
    hargaItem: [null as number | null],
  });

  // Per-item foto upload state
  protected readonly itemFotos = signal<ItemFotoState[]>([]);

  // Row expansion state
  protected readonly expandedRows = signal<any[]>([]);

  // Photo modal state
  protected readonly photoModalVisible = signal(false);
  protected readonly selectedPhotoUrl = signal<string>('');

  // Photo gallery modal state
  protected readonly photoGalleryVisible = signal(false);
  protected readonly selectedItemFotos = signal<any[]>([]);

  constructor() {
    // Seed editItems setiap kali activeDraft berubah (misal setelah LoadDraftChecklist selesai)
    effect(() => {
      const d = this.activeDraft();
      if (d && (d.status === 'DRAFT' || d.status === 'DITOLAK')) {
        this.editItems.set(d.items.map(i => ({ ...i, _key: this.itemKey++ })));
      }
    });
  }

  ngOnInit(): void {
    // Fetch draft dari API setiap kali halaman dimuat
    this.store.dispatch(new LoadDraftChecklist(this.workOrderId));
  }

  protected openAddItem(): void {
    this.editingIndex.set(null);
    this.itemForm.reset();
    this.itemFotos.set([]);
    this.dialogVisible.set(true);
  }

  protected openEditItem(index: number): void {
    const item = this.editItems()[index];
    this.editingIndex.set(index);
    this.itemForm.patchValue({ namaKerusakan: item.namaKerusakan ?? '', namaSparepart: item.namaSparepart ?? '', tindakanPerbaikan: item.tindakanPerbaikan ?? '', hargaItem: item.hargaItem || null });
    
    // Gunakan URL yang sudah dikirim oleh API
    if (item.fotos && item.fotos.length > 0) {
      const existing = item.fotos.map(f => ({ id: f.imageId, previewUrl: f.url ?? '' }));
      this.itemFotos.set(existing);
    } else {
      this.itemFotos.set([]);
    }

    this.dialogVisible.set(true);
  }

  protected saveItem(): void {
    const raw = this.itemForm.getRawValue();
    const fotos = this.itemFotos();

    const newFiles = fotos.filter(f => f.file).map(f => f.file!);
    const existingIds = fotos.filter(f => f.id).map(f => f.id!);

    // Upload foto terlebih dahulu jika ada, lalu simpan item
    const upload$ = newFiles.length > 0
      ? forkJoin(newFiles.map(f => this.imageData.upload(f)))
      : of([]);

    this.uploading.set(true);
    upload$.pipe(
      switchMap((uploadedImages) => {
        const uploadedIds = uploadedImages.map(img => Number(img.id));
        const allFotoIds = [...existingIds, ...uploadedIds];

        const newItem: DraftChecklistItem & { _key: number } = {
          namaKerusakan: raw.namaKerusakan?.trim() || undefined,
          namaSparepart: raw.namaSparepart?.trim() || undefined,
          tindakanPerbaikan: raw.tindakanPerbaikan?.trim() || undefined,
          hargaItem: Number(raw.hargaItem ?? 0),
          fotoIds: allFotoIds.length > 0 ? allFotoIds : undefined,
          _key: this.editingIndex() !== null ? this.editItems()[this.editingIndex()!]._key : this.itemKey++,
        };
        if (this.editingIndex() !== null) {
          this.editItems.update(l => l.map((x, i) => i === this.editingIndex() ? newItem : x));
        } else {
          this.editItems.update(l => [...l, newItem]);
        }
        return of(null);
      }),
    ).subscribe({
      next: () => {
        this.uploading.set(false);
        this.dialogVisible.set(false);
      },
      error: () => {
        this.uploading.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Gagal mengupload foto. Coba lagi.' });
      },
    });
  }

  protected onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    const newFotos: ItemFotoState[] = files.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f)
    }));
    this.itemFotos.update(fotos => [...fotos, ...newFotos].slice(0, 5));
    input.value = ''; // reset input
  }

  protected removeFoto(i: number): void {
    this.itemFotos.update(fotos => fotos.filter((_, idx) => idx !== i));
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
    // Tampilkan konfirmasi DULU, baru hit API setelah user klik "Kirim"
    this.confirm.confirm({
      message: 'Draft checklist akan dikirim ke Pengurus Barang untuk direview. Setelah dikirim Anda tidak bisa mengubah item. Lanjutkan?',
      header: 'Konfirmasi Pengiriman', icon: 'pi pi-send', acceptLabel: 'Kirim', rejectLabel: 'Batal',
      accept: () => {
        const d = this.activeDraft();
        // Jika belum ada draft atau statusnya bukan DRAFT, simpan dulu lalu submit
        if (!d || d.status !== 'DRAFT') {
          const items: DraftChecklistItem[] = this.editItems().map(({ _key: _k, ...i }) => i);
          this.store.dispatch(new CreateDraftChecklist(this.workOrderId, { items })).subscribe(() => {
            const latest = this.activeDraft();
            if (latest) {
              this.store.dispatch(new SubmitDraft(latest.id));
              this.msg.add({ severity: 'success', summary: 'Draft terkirim ke Pengurus Barang.' });
            }
          });
        } else {
          this.store.dispatch(new SubmitDraft(d.id));
          this.msg.add({ severity: 'success', summary: 'Draft terkirim ke Pengurus Barang.' });
        }
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

  protected toggleRowExpand(event: Event, item: any): void {
    event.preventDefault();
    this.selectedItemFotos.set(item.fotos || []);
    this.photoGalleryVisible.set(true);
  }

  protected openPhotoModal(photoUrl: string): void {
    this.selectedPhotoUrl.set(photoUrl);
    this.photoModalVisible.set(true);
  }
}
