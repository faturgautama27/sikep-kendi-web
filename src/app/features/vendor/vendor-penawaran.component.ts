import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FileUploadModule, FileUploadHandlerEvent } from 'primeng/fileupload';

import { DraftChecklistState, LoadDraftChecklist } from '@features/draft-checklist/state';
import { CreatePenawaran, LoadPenawaran, PenawaranState, RequestRevisiPenawaran, SubmitPenawaran, SubmitRevisiPenawaran, UploadInvoice } from '@features/penawaran/state';
import type { PenawaranRecord } from '@features/penawaran/state';
import { IMAGE_DATA } from '@core/data-access/ports/image-data.port';
import { catchError, of, throwError } from 'rxjs';

type PenawaranStatus = 'DRAFT' | 'DIKIRIM' | 'DIVERIFIKASI' | 'REVISI';

@Component({
  selector: 'app-vendor-penawaran', standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, DatePickerModule, ConfirmDialogModule, InputNumberModule, TextareaModule, InputTextModule, TableModule, TagModule, ToastModule, FileUploadModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vendor-penawaran.component.html', changeDetection: ChangeDetectionStrategy.OnPush
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
  protected readonly approvedItems = computed(() =>
    this.allDrafts().find(d => String(d.workOrderId) === String(this.workOrderId) && d.status === 'DISETUJUI')?.items ?? []
  );
  protected readonly draftTotalHarga = computed(() =>
    this.approvedItems().reduce((s, i) => s + i.hargaItem, 0)
  );

  // Penawaran history
  private readonly allPenawaran = this.store.selectSignal(PenawaranState.list);
  protected readonly penawaranList = computed<PenawaranRecord[]>(() =>
    this.allPenawaran().filter(p => String(p.workOrderId) === String(this.workOrderId)).sort((a, b) => b.versi - a.versi)
  );
  protected readonly activePenawaran = computed<PenawaranRecord | null>(() => this.penawaranList()[0] ?? null);
  protected readonly canEdit = computed(() => {
    const p = this.activePenawaran();
    return !p || p.status === 'DRAFT' || p.status === 'REVISI';
  });

  protected readonly form = this.fb.group({
    totalBiaya: [0, [Validators.required, Validators.min(1)]],
    catatanPerubahan: [''],
    nomorInvoice: ['', Validators.required],
    tanggalInvoice: [null as Date | null, Validators.required],
  });

  private totalBiayaChanged = signal(false);
  protected readonly submitting = signal(false);

  constructor() {
    this.form.get('totalBiaya')!.valueChanges.subscribe(v => {
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
        this.form.patchValue({ totalBiaya: p.totalBiaya, nomorInvoice: p.nomorInvoice ?? '' }, { emitEvent: false });
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
    if (this.form.invalid) { this.msg.add({ severity: 'warn', summary: 'Lengkapi semua field yang wajib.' }); return; }
    
    const p = this.activePenawaran();
    const isNew = !p || p.status === 'DRAFT';
    if (isNew && !this.invoiceFile()) {
      this.msg.add({ severity: 'warn', summary: 'Invoice Wajib Diupload', detail: 'Silakan pilih file foto/dokumen invoice terlebih dahulu.' });
      return;
    }

    this.confirm.confirm({
      message: 'Penawaran akan dikirim ke Verifikator. Pastikan seluruh data dan invoice sudah benar. Lanjutkan?',
      header: 'Kirim Penawaran', icon: 'pi pi-send', acceptLabel: 'Kirim', rejectLabel: 'Batal',
      accept: () => {
        this.submitting.set(true);
        const raw = this.form.getRawValue();
        const payloadPenawaran = {
          totalBiaya: Number(raw.totalBiaya!),
          catatanPerubahan: raw.catatanPerubahan || undefined,
          items: this.approvedItems().map(item => ({
            namaKerusakan: item.namaKerusakan,
            namaSparepart: item.namaSparepart || undefined,
            tindakanPerbaikan: item.tindakanPerbaikan,
            hargaItem: Number(item.hargaItem)
          }))
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

        action$.pipe(
          catchError((err) => {
            this.submitting.set(false);
            this.msg.add({ severity: 'error', summary: 'Gagal', detail: err.error?.message || 'Gagal menyimpan penawaran.' });
            return throwError(() => err);
          })
        ).subscribe(() => {
          // Penawaran created. Now upload image if there is one.
          const latestPenawaran = this.penawaranList()[0];
          if (!latestPenawaran) {
             this.submitting.set(false);
             return;
          }

          if (this.invoiceFile()) {
            this.imageData.upload(this.invoiceFile()!).pipe(
              catchError((err) => {
                this.submitting.set(false);
                this.msg.add({ severity: 'error', summary: 'Gagal Upload Invoice', detail: 'File gagal diunggah ke server.' });
                return throwError(() => err);
              })
            ).subscribe((imgRes: any) => {
              // Now submit UploadInvoice action
              const invoicePayload = {
                nomorInvoice: raw.nomorInvoice!,
                totalTagihan: raw.totalBiaya!,
                tanggalInvoice: raw.tanggalInvoice?.toISOString(),
                imageId: Number(imgRes.id)
              };

              this.store.dispatch(new UploadInvoice(this.workOrderId, latestPenawaran.id, invoicePayload)).pipe(
                catchError((err) => {
                  this.submitting.set(false);
                  this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Gagal memproses data invoice.' });
                  return throwError(() => err);
                })
              ).subscribe(() => {
                this.store.dispatch(new SubmitPenawaran(latestPenawaran.id));
                this.submitting.set(false);
                this.invoiceFile.set(null);
                this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Penawaran terkirim ke Verifikator.' });
              });
            });
          } else {
            // No new file (e.g. during Revisi), just finish
            if (!p || p.status === 'DRAFT') {
              this.store.dispatch(new SubmitPenawaran(latestPenawaran.id));
            }
            this.submitting.set(false);
            this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Penawaran terkirim ke Verifikator.' });
          }
        });
      },
    });
  }

  protected statusSeverity(s: PenawaranStatus): 'secondary' | 'info' | 'success' | 'warn' {
    const m: Record<PenawaranStatus, 'secondary' | 'info' | 'success' | 'warn'> = { DRAFT: 'secondary', DIKIRIM: 'info', DIVERIFIKASI: 'success', REVISI: 'warn' };
    return m[s];
  }

  protected formatCurrency(n: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }
}
