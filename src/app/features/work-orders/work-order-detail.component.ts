import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { HttpClient } from '@angular/common/http';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ImageModule } from 'primeng/image';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  WorkOrdersState,
  GetWorkOrderDetail,
  ApprovePPTK,
  RejectPPTK,
  SaveShsMapping,
  PbReviewShs,
  SubmitInvoice,
  VerifikatorReview,
  PptkDecision,
} from './state';
import {
  DraftChecklistState,
  ApproveDraft,
  RejectDraft,
  LoadDraftChecklist,
} from '@features/draft-checklist/state';
import { AuthState } from '@features/login/state/auth.state';
import type { WorkOrderProgressStatus, WorkOrderStatus, WorkOrderEvidence } from '@shared/models';
import { APP_ENV } from '@core/data-access/app-env.token';
import { IMAGE_DATA, type ImageDataPort } from '@core/data-access/ports/image-data.port';
import type { ShsItemInput } from '@core/data-access/ports/work-order-data.port';

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  DIBUAT: 'Dibuat',
  VENDOR_DITUGASKAN: 'Vendor Ditugaskan',
  DRAFT_CHECKLIST: 'Draft Checklist',
  PENAWARAN: 'Penawaran',
  DIVERIFIKASI: 'Diverifikasi',
  MENUNGGU_INVOICE_VENDOR: 'Menunggu Invoice Vendor',
  MENUNGGU_VERIFIKATOR: 'Menunggu Verifikator',
  MENUNGGU_PPTK: 'Menunggu PPTK',
  DISETUJUI_PPTK: 'Disetujui PPTK',
  DIBAYAR: 'Dibayar',
  DITOLAK_PB: 'Ditolak PB',
  DITOLAK_VERIFIKATOR: 'Ditolak Verifikator',
  DITOLAK_PPTK: 'Ditolak PPTK',
};

const PROGRESS_LABEL: Record<WorkOrderProgressStatus, string> = {
  received: 'Kendaraan Diterima',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Pekerjaan Selesai',
};

const EVIDENCE_LABEL: Record<string, string> = {
  kondisi_awal: 'Kondisi Awal',
  sparepart_sebelum: 'Sparepart Sebelum',
  sparepart_sesudah: 'Sparepart Sesudah',
  pasca_perbaikan: 'Bukti Pembayaran',
};

interface ShsItemLocal extends ShsItemInput {
  _key: number;
  hargaShs?: number;
  melebihiShs: boolean;
  jumlah?: number;
}

@Component({
  selector: 'app-work-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    DialogModule,
    SelectModule,
    ImageModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TagModule,
    TextareaModule,
    TimelineModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './work-order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);
  private readonly fb = inject(FormBuilder);
  private readonly imageData = inject<ImageDataPort>(IMAGE_DATA);
  private readonly msg = inject(MessageService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly detail = this.store.selectSignal(WorkOrdersState.detail);
  private readonly draftList = this.store.selectSignal(DraftChecklistState.list);
  protected readonly permissions = this.store.selectSignal(AuthState.permissions);

  protected catatan = '';

  protected readonly drafts = computed(() =>
    this.draftList().filter((d) => parseFloat(d.workOrderId) === parseFloat(this.id)),
  );

  protected readonly latestDraft = computed(() => {
    const list = this.drafts();
    if (!list.length) return null;
    return list.sort((a, b) => b.versi - a.versi)[0];
  });

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly isPPTK = computed(() => this.user()?.roles?.includes('pptk'));
  protected readonly isAdmin = computed(() => this.user()?.roles?.includes('admin_sistem'));
  protected readonly isPB = computed(() => this.user()?.roles?.includes('pengurus_barang'));
  protected readonly isVendor = computed(() => this.user()?.roles?.includes('vendor'));
  protected readonly isVerifikator = computed(() => this.user()?.roles?.includes('verifikator'));
  protected readonly isBendahara = computed(() => this.user()?.roles?.includes('bendahara'));

  // ─── Step D: SHS Mapping State ───────────────────────────────────────────
  private itemKey = 0;
  protected readonly shsItems = signal<ShsItemLocal[]>([]);
  protected readonly shsMasterOptions = signal<any[]>([]);
  protected readonly savingShsMappingLoading = signal(false);

  protected readonly hasItemExceedingShs = computed(() =>
    this.shsItems().some((i) => i.melebihiShs),
  );
  protected readonly shsTotal = computed(() =>
    this.shsItems().reduce((sum, i) => sum + i.hargaVendor * (i.jumlah ?? 1), 0),
  );

  // ─── Step D: PB Review Dialog ─────────────────────────────────────────────
  protected readonly pbReviewDialogVisible = signal(false);
  protected readonly pbReviewApproved = signal(false);
  protected readonly pbCatatan = signal('');
  protected readonly pbAlasanPenolakan = signal('');
  protected readonly pbReviewLoading = signal(false);

  // ─── Step E: Vendor Submit Invoice ────────────────────────────────────────
  protected readonly invoiceDialogVisible = signal(false);
  protected readonly invoiceImageId = signal<number | null>(null);
  protected readonly invoiceImageUrl = signal<string>('');
  protected readonly invoiceDraftImageId = signal<number | null>(null);
  protected readonly invoiceDraftUrl = signal<string>('');
  protected readonly invoiceUploadLoading = signal(false);

  // ─── Step F: Verifikator Review Dialog ────────────────────────────────────
  protected readonly verifikatorDialogVisible = signal(false);
  protected readonly verifikatorApproved = signal(false);
  protected readonly verifikatorCatatan = signal('');
  protected readonly verifikatorAlasan = signal('');
  protected readonly verifikatorLoading = signal(false);

  // ─── Step G: PPTK Decision Dialog ─────────────────────────────────────────
  protected readonly pptkDialogVisible = signal(false);
  protected readonly pptkApprovedSignal = signal(false);
  protected readonly pptkKomentar = signal('');
  protected readonly pptkAlasan = signal('');
  protected readonly pptkLoading = signal(false);

  private readonly hydrateShsItemsEffect = effect(() => {
    const serverItems = this.detail()?.verifikasiHarga?.shsItems ?? [];
    if (!serverItems.length) {
      this.shsItems.set([]);
      this.itemKey = 0;
      return;
    }

    this.itemKey = 0;
    const mapped: ShsItemLocal[] = serverItems.map((item) => {
      const hargaVendor = Number(item.hargaVendor) || 0;
      const hargaStandart = Number(item.hargaStandart) || 0;
      return {
        _key: this.itemKey++,
        namaItem: item.namaItem ?? '',
        hargaVendor,
        hargaStandart,
        jumlah: 1,
        shsMasterId: item.shsMasterId ?? undefined,
        hargaShs: hargaStandart || undefined,
        melebihiShs: hargaVendor > hargaStandart && hargaStandart > 0,
      };
    });

    this.shsItems.set(mapped);
  });

  ngOnInit() {
    this.store.dispatch(new GetWorkOrderDetail(this.id));
    if (!this.user()?.roles[0]?.includes('driver')) {
      this.store.dispatch(new LoadDraftChecklist(this.id));
    }
    this.loadShsMasterOptions();
  }

  private loadShsMasterOptions() {
    if (this.env.previewMode) return;
    this.http.get<any>(`${this.env.apiBaseUrl}/shs-master?limit=200&isAktif=true`).subscribe({
      next: (res) => {
        const items = res?.data?.items ?? res?.data ?? res ?? [];
        this.shsMasterOptions.set(
          items.map((s: any) => ({
            label: `${s.namaItem} (max: ${this.formatRupiah(s.hargaMaksimum)})`,
            value: s.id,
            namaItem: s.namaItem,
            hargaMaksimum: Number(s.hargaMaksimum),
          })),
        );
      },
    });
  }

  protected goBack() {
    this.router.navigate(['/work-orders']);
  }

  protected statusLabel(status: WorkOrderStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected statusSeverity(
    status: WorkOrderStatus,
  ): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'DIBUAT':
      case 'VENDOR_DITUGASKAN':
        return 'info';
      case 'DRAFT_CHECKLIST':
      case 'PENAWARAN':
      case 'MENUNGGU_INVOICE_VENDOR':
      case 'MENUNGGU_VERIFIKATOR':
      case 'MENUNGGU_PPTK':
        return 'warn';
      case 'DIVERIFIKASI':
      case 'DIBAYAR':
      case 'DISETUJUI_PPTK':
        return 'success';
      case 'DITOLAK_PB':
      case 'DITOLAK_VERIFIKATOR':
      case 'DITOLAK_PPTK':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  protected progressLabel(status: WorkOrderProgressStatus): string {
    return PROGRESS_LABEL[status] ?? status;
  }

  protected progressIcon(status: WorkOrderProgressStatus): string {
    switch (status) {
      case 'received':
        return 'pi pi-inbox';
      case 'in_progress':
        return 'pi pi-wrench';
      case 'completed':
        return 'pi pi-check';
      default:
        return 'pi pi-clock';
    }
  }

  protected evidenceUrl(ev: WorkOrderEvidence): string {
    return ev.image?.url ?? '';
  }

  protected evidenceLabel(ev: WorkOrderEvidence): string {
    console.log('ev =>', ev);
    const base = EVIDENCE_LABEL[ev.kategori] ?? ev.kategori;
    return ev.image?.caption ? `${ev.image.caption}` : base;
  }

  protected openDraftAttachment(imageId: number, fallbackUrl?: string): void {
    if (!imageId) {
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    this.http.get<any>(`${this.env.apiBaseUrl}/images/${imageId}/url`).subscribe({
      next: (res) => {
        const freshUrl = res?.signedUrl ?? res?.url ?? fallbackUrl;
        if (!freshUrl) {
          this.msg.add({ severity: 'warn', summary: 'Lampiran tidak tersedia.' });
          return;
        }
        window.open(freshUrl, '_blank', 'noopener,noreferrer');
      },
      error: () => {
        if (fallbackUrl) {
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        this.msg.add({
          severity: 'error',
          summary: 'Gagal membuka lampiran.',
          detail: 'Coba muat ulang halaman lalu buka lagi.',
        });
      },
    });
  }

  protected fotoMimeType(foto: any): string {
    return foto?.mimeType ?? foto?.image?.mimeType ?? '';
  }

  protected fotoFileName(foto: any): string {
    return foto?.fileName ?? foto?.image?.originalFilename ?? '';
  }

  protected fotoUrl(foto: any): string {
    return foto?.url ?? foto?.image?.signedUrl ?? '';
  }

  protected isImageFile(foto: any): boolean {
    return this.fotoMimeType(foto).startsWith('image/');
  }

  protected isPdfFile(foto: any): boolean {
    return this.fotoMimeType(foto) === 'application/pdf';
  }

  protected isDocFile(foto: any): boolean {
    const mt = this.fotoMimeType(foto);
    return (
      mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mt === 'application/msword'
    );
  }

  protected fotoIcon(foto: any): string {
    if (this.isImageFile(foto)) return 'pi pi-image';
    if (this.isPdfFile(foto)) return 'pi pi-file-pdf';
    if (this.isDocFile(foto)) return 'pi pi-file-word';
    return 'pi pi-file';
  }

  protected fotoLabel(foto: any, idx: number): string {
    const name = this.fotoFileName(foto);
    if (name) return name;
    if (this.isPdfFile(foto)) return `PDF ${idx + 1}`;
    if (this.isDocFile(foto)) return `Word ${idx + 1}`;
    if (this.isImageFile(foto)) return `Foto ${idx + 1}`;
    return `File ${idx + 1}`;
  }

  protected formatDateTime(val: string): string {
    if (!val) return '-';
    return new Date(val).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatRupiah(n: number | string): string {
    const val = typeof n === 'string' ? parseFloat(n) : n;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  // ─── Legacy Draft Actions ─────────────────────────────────────────────────
  protected approve() {
    const draft = this.latestDraft();
    if (!draft) return;
    this.store.dispatch(new ApproveDraft(draft.id)).subscribe(() => {
      this.store.dispatch(new GetWorkOrderDetail(this.id));
    });
    this.catatan = '';
  }

  protected reject() {
    const draft = this.latestDraft();
    if (!draft) return;
    this.store
      .dispatch(new RejectDraft(draft.id, this.catatan || 'Perlu koreksi item dan harga.'))
      .subscribe(() => {
        this.store.dispatch(new GetWorkOrderDetail(this.id));
      });
    this.catatan = '';
  }

  protected approvePenawaran() {
    const pnw = this.detail()?.penawaranDetail;
    if (!pnw) return;
    this.http
      .post(`${this.env.apiBaseUrl}/work-orders/${this.id}/penawaran/${pnw.id}/approve-pb`, {})
      .subscribe({
        next: () => this.store.dispatch(new GetWorkOrderDetail(this.id)),
      });
  }

  protected requestRevisiPenawaran() {
    const pnw = this.detail()?.penawaranDetail;
    if (!pnw) return;
    this.http
      .post(`${this.env.apiBaseUrl}/work-orders/${this.id}/penawaran/${pnw.id}/request-revisi-pb`, {
        catatanRevisi: this.catatan || 'Silakan revisi penawaran Anda.',
      })
      .subscribe({
        next: () => {
          this.store.dispatch(new GetWorkOrderDetail(this.id));
          this.catatan = '';
        },
      });
  }

  // ─── Step D: SHS Mapping (PB) ─────────────────────────────────────────────
  protected addShsItem() {
    this.shsItems.update((items) => [
      ...items,
      {
        _key: this.itemKey++,
        namaItem: '',
        hargaVendor: 0,
        hargaStandart: 0,
        jumlah: 1,
        melebihiShs: false,
      },
    ]);
  }

  protected removeShsItem(key: number) {
    this.shsItems.update((items) => items.filter((i) => i._key !== key));
  }

  protected onShsMasterSelect(key: number, shsId: number | null | undefined) {
    if (!shsId) {
      this.shsItems.update((items) =>
        items.map((item) => {
          if (item._key !== key) return item;
          return {
            ...item,
            shsMasterId: undefined,
            hargaStandart: 0,
            hargaShs: undefined,
            melebihiShs: false,
          };
        }),
      );
      return;
    }

    const master = this.shsMasterOptions().find((s) => s.value === shsId);
    if (!master) return;
    this.shsItems.update((items) =>
      items.map((item) => {
        if (item._key !== key) return item;
        const melebihiShs = item.hargaVendor > master.hargaMaksimum;
        return {
          ...item,
          shsMasterId: shsId,
          namaItem: item.namaItem || master.namaItem,
          hargaStandart: master.hargaMaksimum,
          hargaShs: master.hargaMaksimum,
          melebihiShs,
        };
      }),
    );
  }

  protected updateShsItemField(key: number, field: keyof ShsItemLocal, value: any) {
    this.shsItems.update((items) =>
      items.map((item) => {
        if (item._key !== key) return item;
        const updated = {
          ...item,
          [field]: field === 'hargaVendor' || field === 'jumlah' ? Number(value) : value,
        };
        // Recheck melebihi SHS jika harga berubah
        if (field === 'hargaVendor' && item.hargaShs) {
          updated.melebihiShs = Number(value) > item.hargaShs;
        }
        return updated;
      }),
    );
  }

  protected saveShsMapping() {
    if (this.shsItems().length === 0) {
      this.msg.add({ severity: 'warn', summary: 'Minimal 1 item SHS diperlukan' });
      return;
    }
    if (this.hasItemExceedingShs()) {
      this.msg.add({
        severity: 'error',
        summary: 'Ada item melebihi SHS',
        detail: 'Perbaiki harga item sebelum menyimpan',
      });
      return;
    }

    const payload: ShsItemInput[] = this.shsItems().map(
      ({ _key, hargaShs, melebihiShs, jumlah, ...item }) => item,
    );
    this.savingShsMappingLoading.set(true);
    this.store.dispatch(new SaveShsMapping(this.id, payload)).subscribe({
      next: () => {
        this.savingShsMappingLoading.set(false);
        this.msg.add({ severity: 'success', summary: 'SHS mapping tersimpan' });
      },
      error: (err: any) => {
        this.savingShsMappingLoading.set(false);
        this.msg.add({
          severity: 'error',
          summary: 'Gagal simpan',
          detail: err?.error?.message ?? 'Terjadi kesalahan',
        });
      },
    });
  }

  protected openPbReviewDialog(approved: boolean) {
    this.pbReviewApproved.set(approved);
    this.pbCatatan.set('');
    this.pbAlasanPenolakan.set('');
    this.pbReviewDialogVisible.set(true);
  }

  protected submitPbReview() {
    if (!this.pbReviewApproved() && !this.pbAlasanPenolakan().trim()) {
      this.msg.add({ severity: 'warn', summary: 'Alasan penolakan wajib diisi' });
      return;
    }
    this.pbReviewLoading.set(true);
    this.store
      .dispatch(
        new PbReviewShs(
          this.id,
          this.pbReviewApproved(),
          this.pbCatatan() || undefined,
          this.pbAlasanPenolakan() || undefined,
        ),
      )
      .subscribe({
        next: () => {
          this.pbReviewLoading.set(false);
          this.pbReviewDialogVisible.set(false);
          this.msg.add({
            severity: 'success',
            summary: this.pbReviewApproved() ? 'Draft disetujui' : 'Draft ditolak',
          });
        },
        error: (err: any) => {
          this.pbReviewLoading.set(false);
          this.msg.add({
            severity: 'error',
            summary: 'Gagal',
            detail: err?.error?.message ?? 'Terjadi kesalahan',
          });
        },
      });
  }

  // ─── Step E: Vendor Submit Invoice ────────────────────────────────────────
  protected openInvoiceDialog() {
    this.invoiceImageId.set(null);
    this.invoiceImageUrl.set('');
    this.invoiceDraftImageId.set(null);
    this.invoiceDraftUrl.set('');
    this.invoiceDialogVisible.set(true);
  }

  protected async onInvoiceFileSelected(event: Event, type: 'invoice' | 'draft') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.invoiceUploadLoading.set(true);
    this.imageData.upload(file).subscribe({
      next: (uploaded) => {
        this.invoiceUploadLoading.set(false);
        if (type === 'invoice') {
          this.invoiceImageId.set(Number(uploaded.id));
          this.invoiceImageUrl.set(uploaded.url ?? '');
        } else {
          this.invoiceDraftImageId.set(Number(uploaded.id));
          this.invoiceDraftUrl.set(uploaded.url ?? '');
        }
      },
      error: () => {
        this.invoiceUploadLoading.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal upload file' });
      },
    });
    input.value = '';
  }

  protected submitInvoice() {
    if (!this.invoiceImageId()) {
      this.msg.add({ severity: 'warn', summary: 'Invoice wajib diupload' });
      return;
    }
    this.invoiceUploadLoading.set(true);
    this.store
      .dispatch(
        new SubmitInvoice(this.id, this.invoiceImageId()!, this.invoiceDraftImageId() ?? undefined),
      )
      .subscribe({
        next: () => {
          this.invoiceUploadLoading.set(false);
          this.invoiceDialogVisible.set(false);
          this.msg.add({ severity: 'success', summary: 'Invoice berhasil dikirim ke Verifikator' });
        },
        error: (err: any) => {
          this.invoiceUploadLoading.set(false);
          this.msg.add({
            severity: 'error',
            summary: 'Gagal kirim invoice',
            detail: err?.error?.message ?? 'Terjadi kesalahan',
          });
        },
      });
  }

  // ─── Step F: Verifikator Review ───────────────────────────────────────────
  protected openVerifikatorDialog(approved: boolean) {
    this.verifikatorApproved.set(approved);
    this.verifikatorCatatan.set('');
    this.verifikatorAlasan.set('');
    this.verifikatorDialogVisible.set(true);
  }

  protected submitVerifikatorReview() {
    if (!this.verifikatorApproved() && !this.verifikatorAlasan().trim()) {
      this.msg.add({ severity: 'warn', summary: 'Alasan penolakan wajib diisi' });
      return;
    }
    this.verifikatorLoading.set(true);
    this.store
      .dispatch(
        new VerifikatorReview(
          this.id,
          this.verifikatorApproved(),
          this.verifikatorCatatan() || undefined,
          this.verifikatorAlasan() || undefined,
        ),
      )
      .subscribe({
        next: () => {
          this.verifikatorLoading.set(false);
          this.verifikatorDialogVisible.set(false);
          this.msg.add({
            severity: 'success',
            summary: this.verifikatorApproved() ? 'Terverifikasi, menunggu PPTK' : 'Ditolak',
          });
        },
        error: (err: any) => {
          this.verifikatorLoading.set(false);
          this.msg.add({
            severity: 'error',
            summary: 'Gagal',
            detail: err?.error?.message ?? 'Terjadi kesalahan',
          });
        },
      });
  }

  // ─── Step G: PPTK Decision ────────────────────────────────────────────────
  protected openPptkDialog(approved: boolean) {
    this.pptkApprovedSignal.set(approved);
    this.pptkKomentar.set('');
    this.pptkAlasan.set('');
    this.pptkDialogVisible.set(true);
  }

  protected submitPptkDecision() {
    if (!this.pptkApprovedSignal() && !this.pptkAlasan().trim()) {
      this.msg.add({ severity: 'warn', summary: 'Alasan penolakan wajib diisi' });
      return;
    }
    this.pptkLoading.set(true);
    this.store
      .dispatch(
        new PptkDecision(
          this.id,
          this.pptkApprovedSignal(),
          this.pptkKomentar() || undefined,
          this.pptkAlasan() || undefined,
        ),
      )
      .subscribe({
        next: () => {
          this.pptkLoading.set(false);
          this.pptkDialogVisible.set(false);
          this.msg.add({
            severity: 'success',
            summary: this.pptkApprovedSignal() ? 'Disetujui PPTK' : 'Ditolak PPTK',
          });
        },
        error: (err: any) => {
          this.pptkLoading.set(false);
          this.msg.add({
            severity: 'error',
            summary: 'Gagal',
            detail: err?.error?.message ?? 'Terjadi kesalahan',
          });
        },
      });
  }

  // Legacy
  protected approvePPTK() {
    this.store.dispatch(new ApprovePPTK(this.id)).subscribe(() => (this.catatan = ''));
  }

  protected rejectPPTK() {
    this.store
      .dispatch(new RejectPPTK(this.id, this.catatan || 'Ditolak PPTK.'))
      .subscribe(() => (this.catatan = ''));
  }
}
