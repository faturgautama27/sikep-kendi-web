import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  effect,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FileUploadModule, FileUploadHandlerEvent } from 'primeng/fileupload';

import { DraftChecklistState, LoadDraftChecklist } from '@features/draft-checklist/state';
import {
  CreatePenawaran,
  LoadPenawaran,
  PenawaranState,
  RequestRevisiPenawaran,
  SubmitPenawaran,
  SubmitRevisiPenawaran,
  UploadInvoice,
} from '@features/penawaran/state';
import type { PenawaranRecord } from '@features/penawaran/state';
import { IMAGE_DATA } from '@core/data-access/ports/image-data.port';
import { WorkOrdersState, GetWorkOrderDetail, SubmitInvoice } from '@features/work-orders/state';
import { catchError, of, throwError, forkJoin } from 'rxjs';

type PenawaranStatus = 'DRAFT' | 'DIKIRIM' | 'DIVERIFIKASI' | 'REVISI';

interface UploadedPhoto {
  id: number;
  previewUrl: string;
  name: string;
}

@Component({
  selector: 'app-vendor-penawaran',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    ConfirmDialogModule,
    DividerModule,
    InputNumberModule,
    CardModule,
    TextareaModule,
    InputTextModule,
    TableModule,
    TagModule,
    ToastModule,
    FileUploadModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-penawaran.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorPenawaranComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly imageData = inject(IMAGE_DATA);

  protected readonly workOrderId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly today = new Date();

  protected readonly invoiceFile = signal<File | null>(null);
  protected readonly invoiceFileUrl = computed(() => {
    const f = this.invoiceFile();
    return f ? URL.createObjectURL(f) : null;
  });

  // Approved draft items (read-only reference)
  private readonly allDrafts = this.store.selectSignal(DraftChecklistState.list);
  protected readonly approvedItems = computed(
    () =>
      this.allDrafts().find(
        (d) => String(d.workOrderId) === String(this.workOrderId) && d.status === 'DISETUJUI',
      )?.items ?? [],
  );
  protected readonly draftTotalHarga = computed(() =>
    this.approvedItems().reduce((s, i) => s + (i.hargaItem ?? 0), 0),
  );

  // Penawaran history
  private readonly allPenawaran = this.store.selectSignal(PenawaranState.list);
  protected readonly penawaranList = computed<PenawaranRecord[]>(() =>
    this.allPenawaran()
      .filter((p) => String(p.workOrderId) === String(this.workOrderId))
      .sort((a, b) => b.versi - a.versi),
  );
  protected readonly activePenawaran = computed<PenawaranRecord | null>(
    () => this.penawaranList()[0] ?? null,
  );
  protected readonly canEdit = computed(() => {
    const p = this.activePenawaran();
    return !p || p.status === 'DRAFT' || p.status === 'REVISI';
  });

  // ── WO Detail for Step E detection ────────────────────────────────────────
  private readonly woDetail = this.store.selectSignal(WorkOrdersState.detail);
  protected readonly wo = computed<any>(() => this.woDetail() as any);
  protected readonly isStepE = computed(
    () =>
      this.woDetail()?.status === 'MENUNGGU_INVOICE_VENDOR' &&
      String(this.woDetail()?.id) === String(this.workOrderId),
  );
  protected readonly shsItemsReadonly = computed(() => this.wo()?.verifikasiHarga?.shsItems ?? []);
  protected readonly workOrder = computed<any>(() => this.wo());
  protected readonly pengajuan = computed<any>(() => this.wo()?.pengajuan ?? null);
  protected readonly vehicle = computed<any>(() => this.wo()?.pengajuan?.kendaraan ?? null);
  protected readonly vendor = computed<any>(() => this.wo()?.vendor ?? null);
  protected readonly pbNotes = computed(() => {
    const wo = this.wo() as any;
    return {
      catatan: wo?.pbCatatan,
      diputuskanAt: wo?.pbVerifikasiAt,
      diputuskanOleh: wo?.pbVerifikatorId ? 'Pengurus Barang' : null,
    };
  });
  protected readonly pengajuanPhotos = computed(() => this.wo()?.pengajuan?.fotos ?? []);
  protected readonly dokumentasiPhotos = computed(() => this.wo()?.dokumentasi ?? []);
  protected readonly draftApproved = computed(
    () => this.wo()?.draftChecklists?.find((d: any) => d.status === 'DISETUJUI') ?? null,
  );

  protected formatKm(value: unknown): string {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value ?? 0));
  }

  // ── Step E: Upload signals ─────────────────────────────────────────────────
  protected readonly stepEInvoiceImageId = signal<number | null>(null);
  protected readonly stepEInvoicePreview = signal<string>('');
  protected readonly stepEDraftImageId = signal<number | null>(null);
  protected readonly stepEDraftPreview = signal<string>('');
  protected readonly stepEFakturPajakImageId = signal<number | null>(null);
  protected readonly stepEFakturPajakPreview = signal<string>('');
  protected readonly fotoInProgress = signal<UploadedPhoto[]>([]);
  protected readonly fotoAfterWork = signal<UploadedPhoto[]>([]);
  protected readonly stepEUploading = signal(false);
  protected readonly stepESubmitting = signal(false);

  protected readonly form = this.fb.group({
    totalBiaya: [0, [Validators.required, Validators.min(1)]],
    catatanPerubahan: [''],
    nomorInvoice: ['', Validators.required],
    tanggalInvoice: [null as Date | null, Validators.required],
  });

  private totalBiayaChanged = signal(false);
  protected readonly submitting = signal(false);

  constructor() {
    this.form.get('totalBiaya')!.valueChanges.subscribe((v) => {
      this.totalBiayaChanged.set(Number(v) !== this.draftTotalHarga());
      if (this.totalBiayaChanged()) {
        this.form.get('catatanPerubahan')!.addValidators(Validators.required);
      } else {
        this.form.get('catatanPerubahan')!.clearValidators();
      }
      this.form.get('catatanPerubahan')!.updateValueAndValidity();
    });

    effect(() => {
      const p = this.activePenawaran();
      if (p && (p.status === 'DRAFT' || p.status === 'REVISI')) {
        this.form.patchValue(
          { totalBiaya: p.totalBiaya, nomorInvoice: p.nomorInvoice ?? '' },
          { emitEvent: false },
        );
      } else {
        const t = this.draftTotalHarga();
        if (t > 0 && this.form.get('totalBiaya')!.value === 0) {
          this.form.patchValue({ totalBiaya: t }, { emitEvent: false });
        }
      }
    });
  }

  ngOnInit() {
    this.store.dispatch(new LoadDraftChecklist(this.workOrderId));
    this.store.dispatch(new LoadPenawaran(this.workOrderId));
    this.store.dispatch(new GetWorkOrderDetail(this.workOrderId));
  }

  protected readonly needsCatatan = this.totalBiayaChanged;

  protected onSelectInvoice(event: FileUploadHandlerEvent, uploader: unknown) {
    if (event.files && event.files.length > 0) {
      this.invoiceFile.set(event.files[0]);
    }
  }

  protected removeInvoiceFile(uploader: unknown) {
    this.invoiceFile.set(null);
    if (uploader && typeof (uploader as any).clear === 'function') {
      (uploader as any).clear();
    }
  }

  protected kirimPenawaran(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.msg.add({ severity: 'warn', summary: 'Lengkapi semua field yang wajib.' });
      return;
    }

    const p = this.activePenawaran();
    const isNew = !p || p.status === 'DRAFT';
    if (isNew && !this.invoiceFile()) {
      this.msg.add({
        severity: 'warn',
        summary: 'Invoice Wajib Diupload',
        detail: 'Silakan pilih file foto/dokumen invoice terlebih dahulu.',
      });
      return;
    }

    this.confirm.confirm({
      message:
        'Penawaran akan dikirim ke Verifikator. Pastikan seluruh data dan invoice sudah benar. Lanjutkan?',
      header: 'Kirim Penawaran',
      icon: 'pi pi-send',
      acceptLabel: 'Kirim',
      rejectLabel: 'Batal',
      accept: () => {
        this.submitting.set(true);
        const raw = this.form.getRawValue();
        const payloadPenawaran = {
          totalBiaya: Number(raw.totalBiaya!),
          catatanPerubahan: raw.catatanPerubahan || undefined,
          items: this.approvedItems().map((item) => ({
            namaKerusakan: item.namaKerusakan,
            namaSparepart: item.namaSparepart || undefined,
            tindakanPerbaikan: item.tindakanPerbaikan,
            hargaItem: Number(item.hargaItem),
          })),
        };

        let action$: any;
        if (!p) {
          action$ = this.store.dispatch(new CreatePenawaran(this.workOrderId, payloadPenawaran));
        } else if (p.status === 'REVISI') {
          action$ = this.store.dispatch(new SubmitRevisiPenawaran(p.id, payloadPenawaran));
        } else if (p.status === 'DRAFT') {
          action$ = of(null);
        } else {
          this.submitting.set(false);
          return;
        }

        action$
          .pipe(
            catchError((err) => {
              this.submitting.set(false);
              this.msg.add({
                severity: 'error',
                summary: 'Gagal',
                detail: err.error?.message || 'Gagal menyimpan penawaran.',
              });
              return throwError(() => err);
            }),
          )
          .subscribe(() => {
            // Penawaran created. Now upload image if there is one.
            const latestPenawaran = this.penawaranList()[0];
            if (!latestPenawaran) {
              this.submitting.set(false);
              return;
            }

            if (this.invoiceFile()) {
              this.imageData
                .upload(this.invoiceFile()!)
                .pipe(
                  catchError((err) => {
                    this.submitting.set(false);
                    this.msg.add({
                      severity: 'error',
                      summary: 'Gagal Upload Invoice',
                      detail: 'File gagal diunggah ke server.',
                    });
                    return throwError(() => err);
                  }),
                )
                .subscribe((imgRes: any) => {
                  // Now submit UploadInvoice action
                  const invoicePayload = {
                    nomorInvoice: raw.nomorInvoice!,
                    totalTagihan: raw.totalBiaya!,
                    tanggalInvoice: raw.tanggalInvoice?.toISOString(),
                    imageId: Number(imgRes.id),
                  };

                  this.store
                    .dispatch(
                      new UploadInvoice(this.workOrderId, latestPenawaran.id, invoicePayload),
                    )
                    .pipe(
                      catchError((err) => {
                        this.submitting.set(false);
                        this.msg.add({
                          severity: 'error',
                          summary: 'Gagal',
                          detail: 'Gagal memproses data invoice.',
                        });
                        return throwError(() => err);
                      }),
                    )
                    .subscribe(() => {
                      this.store.dispatch(new SubmitPenawaran(latestPenawaran.id));
                      this.submitting.set(false);
                      this.invoiceFile.set(null);
                      this.msg.add({
                        severity: 'success',
                        summary: 'Berhasil',
                        detail: 'Penawaran terkirim ke Verifikator.',
                      });
                    });
                });
            } else {
              // No new file (e.g. during Revisi), just finish
              if (!p || p.status === 'DRAFT') {
                this.store.dispatch(new SubmitPenawaran(latestPenawaran.id));
              }
              this.submitting.set(false);
              this.msg.add({
                severity: 'success',
                summary: 'Berhasil',
                detail: 'Penawaran terkirim ke Verifikator.',
              });
            }
          });
      },
    });
  }

  // ── Step E: Upload handlers ────────────────────────────────────────────────
  protected onStepEFileSelected(event: Event, type: 'invoice' | 'draft' | 'faktur_pajak'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.stepEUploading.set(true);
    this.imageData.upload(file).subscribe({
      next: (res: any) => {
        this.stepEUploading.set(false);
        const previewUrl = URL.createObjectURL(file);
        if (type === 'invoice') {
          this.stepEInvoiceImageId.set(Number(res.id));
          this.stepEInvoicePreview.set(previewUrl);
        } else if (type === 'draft') {
          this.stepEDraftImageId.set(Number(res.id));
          this.stepEDraftPreview.set(previewUrl);
        } else {
          this.stepEFakturPajakImageId.set(Number(res.id));
          this.stepEFakturPajakPreview.set(previewUrl);
        }
      },
      error: () => {
        this.stepEUploading.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal upload file' });
      },
    });
    input.value = '';
  }

  protected onDokumentasiSelected(event: Event, kategori: 'in_progress' | 'after_work'): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    this.stepEUploading.set(true);
    let pending = files.length;
    files.forEach((file) => {
      this.imageData.upload(file).subscribe({
        next: (res: any) => {
          const photo: UploadedPhoto = {
            id: Number(res.id),
            previewUrl: URL.createObjectURL(file),
            name: file.name,
          };
          if (kategori === 'in_progress') {
            this.fotoInProgress.update((arr) => [...arr, photo]);
          } else {
            this.fotoAfterWork.update((arr) => [...arr, photo]);
          }
          pending--;
          if (pending === 0) this.stepEUploading.set(false);
        },
        error: () => {
          pending--;
          if (pending === 0) this.stepEUploading.set(false);
          this.msg.add({ severity: 'error', summary: 'Gagal upload foto' });
        },
      });
    });
    input.value = '';
  }

  protected removePhoto(kategori: 'in_progress' | 'after_work', index: number): void {
    if (kategori === 'in_progress') {
      this.fotoInProgress.update((arr) => arr.filter((_, i) => i !== index));
    } else {
      this.fotoAfterWork.update((arr) => arr.filter((_, i) => i !== index));
    }
  }

  protected submitStepE(): void {
    if (!this.stepEInvoiceImageId()) {
      this.msg.add({ severity: 'warn', summary: 'Invoice wajib diupload' });
      return;
    }
    if (!this.fotoAfterWork().length) {
      this.msg.add({
        severity: 'warn',
        summary: 'Minimal 1 foto setelah perbaikan wajib diupload',
      });
      return;
    }
    const allDokIds = [
      ...this.fotoInProgress().map((p) => p.id),
      ...this.fotoAfterWork().map((p) => p.id),
    ];
    const allDokKategori = [
      ...this.fotoInProgress().map(() => 'IN_PROGRESS'),
      ...this.fotoAfterWork().map(() => 'SETELAH_PERBAIKAN'),
    ];

    this.stepESubmitting.set(true);
    this.store
      .dispatch(
        new SubmitInvoice(
          this.workOrderId,
          this.stepEInvoiceImageId()!,
          this.stepEDraftImageId() ?? undefined,
          allDokIds,
          allDokKategori,
          this.stepEFakturPajakImageId() ?? undefined,
        ),
      )
      .subscribe({
        next: () => {
          this.stepESubmitting.set(false);
          this.msg.add({
            severity: 'success',
            summary: 'Invoice & dokumentasi berhasil dikirim ke Verifikator',
          });
          this.stepEInvoiceImageId.set(null);
          this.stepEInvoicePreview.set('');
          this.stepEDraftImageId.set(null);
          this.stepEDraftPreview.set('');
          this.stepEFakturPajakImageId.set(null);
          this.stepEFakturPajakPreview.set('');
          this.fotoInProgress.set([]);
          this.fotoAfterWork.set([]);
        },
        error: (err: any) => {
          this.stepESubmitting.set(false);
          this.msg.add({
            severity: 'error',
            summary: 'Gagal kirim',
            detail: err?.error?.message ?? 'Terjadi kesalahan',
          });
        },
      });
  }

  protected statusSeverity(s: PenawaranStatus): 'secondary' | 'info' | 'success' | 'warn' {
    const m: Record<PenawaranStatus, 'secondary' | 'info' | 'success' | 'warn'> = {
      DRAFT: 'secondary',
      DIKIRIM: 'info',
      DIVERIFIKASI: 'success',
      REVISI: 'warn',
    };
    return m[s];
  }

  protected formatCurrency(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(n);
  }
}
