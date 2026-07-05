import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { IMAGE_DATA, type ImageDataPort } from '@core/data-access/ports/image-data.port';
import { CreateDraftChecklist, DraftChecklistState, LoadDraftChecklist, SubmitDraft } from '@features/draft-checklist/state';
import type { DraftChecklistItem, DraftChecklistRecord } from '@features/draft-checklist/state';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

type DraftStatus = 'DRAFT' | 'DIKIRIM' | 'DISETUJUI' | 'DITOLAK';
type EditingRowKey = number | 'new' | null;

interface ChecklistAttachmentRef {
  imageId: number;
  url?: string;
  fileName?: string;
  mimeType?: string;
}

interface ItemAttachmentState {
  id?: number;
  file?: File;
  url: string;
  previewUrl?: string;
  fileName: string;
  mimeType: string;
  isImage: boolean;
}

type EditableDraftChecklistItem = DraftChecklistItem & {
  _key: number;
  fotos?: ChecklistAttachmentRef[];
};

@Component({
  selector: 'app-vendor-draft-checklist',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TabsModule,
    TagModule,
    TextareaModule,
    ToastModule,
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
  private readonly fb = inject(FormBuilder);
  private readonly imageData = inject<ImageDataPort>(IMAGE_DATA);

  protected readonly uploading = signal(false);
  protected readonly attachmentAccept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
  protected readonly maxAttachments = 5;

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';

  private readonly list = this.store.selectSignal(DraftChecklistState.list);
  protected readonly drafts = computed<DraftChecklistRecord[]>(() =>
    this.list().filter((draft) => String(draft.workOrderId) === String(this.workOrderId)).sort((a, b) => b.versi - a.versi),
  );
  protected readonly activeDraft = computed<DraftChecklistRecord | null>(() => this.drafts()[0] ?? null);
  protected readonly canEdit = computed(() => {
    const draft = this.activeDraft();
    return !draft || draft.status === 'DRAFT' || draft.status === 'DITOLAK';
  });
  protected readonly isReadOnly = computed(() => !this.canEdit());
  protected readonly totalHarga = computed(() => this.editItems().reduce((sum, item) => sum + Number(item.hargaItem ?? 0), 0));

  protected readonly editItems = signal<EditableDraftChecklistItem[]>([]);
  protected readonly editingRowKey = signal<EditingRowKey>('new');

  private itemKey = 0;

  protected readonly itemForm = this.fb.group({
    namaKerusakan: [''],
    namaSparepart: [''],
    tindakanPerbaikan: [''],
    hargaItem: [null as number | null],
  });

  protected readonly itemAttachments = signal<ItemAttachmentState[]>([]);
  protected readonly attachmentGalleryVisible = signal(false);
  protected readonly selectedItemAttachments = signal<ItemAttachmentState[]>([]);
  protected readonly photoModalVisible = signal(false);
  protected readonly selectedPhotoUrl = signal('');

  constructor() {
    effect(() => {
      const draft = this.activeDraft();

      if (draft && (draft.status === 'DRAFT' || draft.status === 'DITOLAK')) {
        this.editItems.set(draft.items.map((item) => ({ ...item, _key: this.itemKey++ })));
      } else if (!draft) {
        this.editItems.set([]);
      }

      if (!draft || draft.status === 'DRAFT' || draft.status === 'DITOLAK') {
        // Avoid tracking itemAttachments() read inside resetInlineEditor,
        // otherwise this effect can subscribe to attachments and re-trigger endlessly.
        untracked(() => this.resetInlineEditor());
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(new LoadDraftChecklist(this.workOrderId));
  }

  protected isEditingRow(key: number | 'new'): boolean {
    return this.editingRowKey() === key;
  }

  protected openEditItem(index: number): void {
    const item = this.editItems()[index];
    if (!item) return;

    this.revokeTemporaryUrls(this.itemAttachments());
    this.editingRowKey.set(item._key);
    this.itemForm.reset({
      namaKerusakan: item.namaKerusakan ?? '',
      namaSparepart: item.namaSparepart ?? '',
      tindakanPerbaikan: item.tindakanPerbaikan ?? '',
      hargaItem: item.hargaItem ?? null,
    });
    this.itemAttachments.set(this.toAttachmentStates(item.fotos ?? []));
  }

  protected cancelInlineEdit(): void {
    this.resetInlineEditor();
  }

  protected saveItem(): void {
    const raw = this.itemForm.getRawValue();
    const attachments = this.itemAttachments();
    const newFiles = attachments.filter((attachment) => attachment.file).map((attachment) => attachment.file!);
    const existingIds = attachments.filter((attachment) => attachment.id).map((attachment) => attachment.id!);

    const upload$ = newFiles.length > 0
      ? forkJoin(newFiles.map((file) => this.imageData.upload(file)))
      : of([]);

    this.uploading.set(true);
    upload$.pipe(
      switchMap((uploadedImages) => {
        const uploadedIds = uploadedImages.map((image) => Number(image.id));
        const uploadedAttachments = uploadedImages.map((image, index) => ({
          imageId: Number(image.id),
          url: image.url,
          fileName: newFiles[index]?.name,
          mimeType: newFiles[index]?.type || this.mimeTypeFromName(newFiles[index]?.name ?? ''),
        }));
        const existingAttachments = attachments
          .filter((attachment) => attachment.id)
          .map((attachment) => ({
            imageId: attachment.id!,
            url: attachment.url,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
          }));

        const allAttachmentIds = [...existingIds, ...uploadedIds];
        const currentEditingKey = this.editingRowKey();
        const existingRow = typeof currentEditingKey === 'number'
          ? this.editItems().find((item) => item._key === currentEditingKey)
          : undefined;

        const nextItem: EditableDraftChecklistItem = {
          namaKerusakan: raw.namaKerusakan?.trim() || undefined,
          namaSparepart: raw.namaSparepart?.trim() || undefined,
          tindakanPerbaikan: raw.tindakanPerbaikan?.trim() || undefined,
          hargaItem: Number(raw.hargaItem ?? 0),
          fotoIds: allAttachmentIds.length > 0 ? allAttachmentIds : undefined,
          fotos: [...existingAttachments, ...uploadedAttachments],
          _key: existingRow?._key ?? this.itemKey++,
        };

        if (existingRow) {
          this.editItems.update((items) => items.map((item) => item._key === existingRow._key ? nextItem : item));
        } else {
          this.editItems.update((items) => [...items, nextItem]);
        }

        return of(null);
      }),
    ).subscribe({
      next: () => {
        this.uploading.set(false);
        this.resetInlineEditor();
      },
      error: () => {
        this.uploading.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Gagal mengupload lampiran. Coba lagi.' });
      },
    });
  }

  protected onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const pickedFiles = Array.from(input.files);
    const validFiles = pickedFiles.filter((file) => this.isAllowedAttachment(file));
    const invalidCount = pickedFiles.length - validFiles.length;

    if (invalidCount > 0) {
      this.msg.add({
        severity: 'warn',
        summary: 'Sebagian file ditolak',
        detail: 'Format yang didukung: gambar, PDF, Word, dan Excel.',
      });
    }

    const remainingSlots = this.maxAttachments - this.itemAttachments().length;
    if (remainingSlots <= 0) {
      this.msg.add({ severity: 'warn', summary: `Maksimal ${this.maxAttachments} lampiran per item.` });
      input.value = '';
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    if (filesToAdd.length < validFiles.length) {
      this.msg.add({ severity: 'warn', summary: `Hanya ${this.maxAttachments} lampiran yang dapat disimpan.` });
    }

    const nextAttachments = filesToAdd.map((file) => this.buildAttachmentFromFile(file));
    this.itemAttachments.update((currentAttachments) => [...currentAttachments, ...nextAttachments]);
    input.value = '';
  }

  protected removeAttachment(index: number): void {
    const current = this.itemAttachments();
    const target = current[index];
    if (target?.file && target.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    this.itemAttachments.set(current.filter((_, attachmentIndex) => attachmentIndex !== index));
  }

  protected removeItem(index: number): void {
    const current = this.editItems();
    const target = current[index];
    if (!target) return;

    if (this.editingRowKey() === target._key) {
      this.resetInlineEditor();
    }

    this.editItems.set(current.filter((_, itemIndex) => itemIndex !== index));
  }

  protected simpanDraft(): void {
    if (this.editItems().length === 0) {
      this.msg.add({ severity: 'warn', summary: 'Minimal 1 item checklist diperlukan.' });
      return;
    }

    const items = this.toPayloadItems();
    this.store.dispatch(new CreateDraftChecklist(this.workOrderId, { items }));
    this.msg.add({ severity: 'success', summary: 'Draft checklist tersimpan.' });
  }

  protected kirimDraft(): void {
    if (this.editItems().length === 0) {
      this.msg.add({ severity: 'warn', summary: 'Draft tidak boleh kosong.' });
      return;
    }

    this.confirm.confirm({
      message: 'Draft checklist akan dikirim ke Pengurus Barang untuk direview. Setelah dikirim Anda tidak bisa mengubah item. Lanjutkan?',
      header: 'Konfirmasi Pengiriman',
      icon: 'pi pi-send',
      acceptLabel: 'Kirim',
      rejectLabel: 'Batal',
      accept: () => {
        const draft = this.activeDraft();
        if (!draft || draft.status !== 'DRAFT') {
          const items = this.toPayloadItems();
          this.store.dispatch(new CreateDraftChecklist(this.workOrderId, { items })).subscribe(() => {
            const latest = this.activeDraft();
            if (!latest) return;

            this.store.dispatch(new SubmitDraft(latest.id));
            this.msg.add({ severity: 'success', summary: 'Draft terkirim ke Pengurus Barang.' });
          });
          return;
        }

        this.store.dispatch(new SubmitDraft(draft.id));
        this.msg.add({ severity: 'success', summary: 'Draft terkirim ke Pengurus Barang.' });
      },
    });
  }

  protected reviseDraft(): void {
    const draft = this.activeDraft();
    if (!draft || draft.status !== 'DITOLAK') return;

    this.editItems.set(draft.items.map((item) => ({ ...item, _key: this.itemKey++ })));
    this.resetInlineEditor();
    this.msg.add({ severity: 'info', summary: 'Silakan revisi item checklist dan kirim kembali.' });
  }

  protected statusSeverity(status: DraftStatus): 'secondary' | 'info' | 'success' | 'danger' {
    const mapSeverity: Record<DraftStatus, 'secondary' | 'info' | 'success' | 'danger'> = {
      DRAFT: 'secondary',
      DIKIRIM: 'info',
      DISETUJUI: 'success',
      DITOLAK: 'danger',
    };
    return mapSeverity[status];
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected attachmentCount(item: DraftChecklistItem): number {
    return item.fotos?.length ?? item.fotoIds?.length ?? 0;
  }

  protected openAttachmentGallery(item: DraftChecklistItem): void {
    this.selectedItemAttachments.set(this.toAttachmentStates(item.fotos ?? []));
    this.attachmentGalleryVisible.set(true);
  }

  protected openAttachment(attachment: ItemAttachmentState): void {
    if (!attachment.url) {
      this.msg.add({ severity: 'warn', summary: 'Lampiran belum tersedia untuk dibuka.' });
      return;
    }

    if (attachment.isImage) {
      this.selectedPhotoUrl.set(attachment.url);
      this.photoModalVisible.set(true);
      return;
    }

    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  }

  protected attachmentIcon(attachment: ItemAttachmentState): string {
    if (attachment.isImage) return 'pi pi-image';
    if (attachment.mimeType.includes('pdf')) return 'pi pi-file-pdf';
    if (attachment.mimeType.includes('word') || attachment.mimeType.includes('document')) return 'pi pi-file-word';
    if (attachment.mimeType.includes('excel') || attachment.mimeType.includes('spreadsheet') || attachment.mimeType.includes('sheet')) return 'pi pi-file-excel';
    return 'pi pi-file';
  }

  protected attachmentKindLabel(attachment: ItemAttachmentState): string {
    if (attachment.isImage) return 'Gambar';
    if (attachment.mimeType.includes('pdf')) return 'PDF';
    if (attachment.mimeType.includes('word') || attachment.mimeType.includes('document')) return 'Word';
    if (attachment.mimeType.includes('excel') || attachment.mimeType.includes('spreadsheet') || attachment.mimeType.includes('sheet')) return 'Excel';
    return 'File';
  }

  private resetInlineEditor(): void {
    this.revokeTemporaryUrls(this.itemAttachments());
    this.editingRowKey.set('new');
    this.itemForm.reset({
      namaKerusakan: '',
      namaSparepart: '',
      tindakanPerbaikan: '',
      hargaItem: null,
    });
    this.itemAttachments.set([]);
  }

  private buildAttachmentFromFile(file: File): ItemAttachmentState {
    const mimeType = file.type || this.mimeTypeFromName(file.name);
    const isImage = mimeType.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

    return {
      file,
      url: previewUrl ?? '',
      previewUrl,
      fileName: file.name,
      mimeType,
      isImage,
    };
  }

  private toAttachmentStates(attachments: ChecklistAttachmentRef[]): ItemAttachmentState[] {
    return attachments.map((attachment) => {
      const mimeType = attachment.mimeType || this.mimeTypeFromName(attachment.fileName ?? attachment.url ?? '');
      const isImage = mimeType.startsWith('image/');
      const fileName = attachment.fileName || this.fileNameFromUrl(attachment.url) || `Lampiran ${attachment.imageId}`;

      return {
        id: attachment.imageId,
        url: attachment.url ?? '',
        previewUrl: isImage ? attachment.url : undefined,
        fileName,
        mimeType,
        isImage,
      };
    });
  }

  private isAllowedAttachment(file: File): boolean {
    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]);

    const normalizedName = file.name.toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];

    return allowedMimeTypes.has(file.type) || allowedExtensions.some((extension) => normalizedName.endsWith(extension));
  }

  private mimeTypeFromName(fileName: string): string {
    const normalizedName = fileName.toLowerCase();
    if (normalizedName.endsWith('.png')) return 'image/png';
    if (normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg')) return 'image/jpeg';
    if (normalizedName.endsWith('.webp')) return 'image/webp';
    if (normalizedName.endsWith('.pdf')) return 'application/pdf';
    if (normalizedName.endsWith('.doc')) return 'application/msword';
    if (normalizedName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (normalizedName.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (normalizedName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/octet-stream';
  }

  private fileNameFromUrl(url?: string): string | null {
    if (!url) return null;
    const cleanUrl = url.split('?')[0] ?? '';
    const parts = cleanUrl.split('/').filter(Boolean);
    return parts.at(-1) ?? null;
  }

  private revokeTemporaryUrls(attachments: ItemAttachmentState[]): void {
    attachments.forEach((attachment) => {
      if (attachment.file && attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
  }

  private toPayloadItems(): DraftChecklistItem[] {
    return this.editItems().map(({ _key: _unusedKey, fotos: _unusedFotos, ...item }) => ({
      namaKerusakan: item.namaKerusakan?.trim() || undefined,
      namaSparepart: item.namaSparepart?.trim() || undefined,
      tindakanPerbaikan: item.tindakanPerbaikan?.trim() || undefined,
      hargaItem: Number(item.hargaItem ?? 0),
      fotoIds: item.fotoIds?.length ? item.fotoIds : undefined,
    }));
  }
}
