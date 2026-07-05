import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import type {
  WorkOrder,
  WorkOrderProgress,
  WorkOrderEvidence,
  WorkOrderStatus,
  Image,
} from '@shared/models';
import type {
  WorkOrderDataPort,
  WorkOrderFilter,
} from '../ports/work-order-data.port';
import { APP_ENV } from '../app-env.token';

interface BackendImageRef {
  id: number;
  signedUrl?: string;
}

interface BackendDraftChecklistFoto {
  id: number;
  urutan: number;
  imageId: number;
  image?: BackendImageRef;
}

interface BackendDraftChecklistItem {
  id: number;
  urutan?: number;
  namaKerusakan?: string;
  namaSparepart?: string;
  fotos?: BackendDraftChecklistFoto[];
}

interface BackendDraftChecklist {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items?: BackendDraftChecklistItem[];
}

interface BackendInvoice {
  nomorInvoice: string;
  imageId: number;
  totalTagihan: number | string;
  tanggalInvoice: string;
  image?: BackendImageRef & { signedUrl?: string };
}

interface BackendPenawaran {
  id: number;
  totalBiaya: number | string;
  status: string;
  createdAt: string;
  updatedAt: string;
  invoice?: BackendInvoice | null;
  items?: any[];
}

interface BackendVerifikator {
  id: number;
  fullName: string;
}

interface BackendVerifikasiHarga {
  id: number;
  status: string;
  catatanRevisi?: string | null;
  verifikasiAt?: string | null;
  updatedAt: string;
  verifikator?: BackendVerifikator | null;
  shsItems?: any[];
}

interface BackendBuktiTransfer {
  imageId: number;
  image?: BackendImageRef;
}

interface BackendBendahara {
  id: number;
  fullName: string;
}

interface BackendPembayaran {
  id: number;
  status: string;
  totalDibayar: number | string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  bendaharaId: number;
  bendahara?: BackendBendahara | null;
  buktiTransfer?: BackendBuktiTransfer | null;
}

interface BackendVendor {
  id: number;
  namaVendor: string;
}

interface BackendKendaraan {
  id: number;
  nomorPolisi: string;
  merk?: string;
  model?: string;
  odometerSaatIni?: number;
}

interface BackendPengemudi {
  id: number;
  fullName?: string;
  username?: string;
}

interface BackendPengajuan {
  id: number;
  kendaraanId: number;
  createdAt?: string;
  odometerSaatPengajuan?: number;
  pengemudi?: BackendPengemudi;
  kendaraan: BackendKendaraan;
}

interface BackendWorkOrder {
  id: number;
  nomorWo: string;
  pengajuanId: number;
  vendorId: number | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  pengajuan: BackendPengajuan;
  vendor?: BackendVendor | null;
  draftChecklists?: BackendDraftChecklist[];
  penawaran?: BackendPenawaran[];
  verifikasiHarga?: BackendVerifikasiHarga | null;
  pembayaran?: BackendPembayaran | null;
  dokumentasi?: any[];
}

interface ApiListResponse<T> {
  success?: boolean;
  data?: {
    items?: T[];
  } | T[];
}

interface ApiDetailResponse<T> {
  success?: boolean;
  data?: T;
}

function asNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function emptyImage(imageId: number, signedUrl?: string, caption?: string): Image {
  const now = new Date().toISOString();
  const id = String(imageId);
  return {
    id,
    url: signedUrl ?? '',
    thumbnailUrl: signedUrl ?? '',
    entityKind: 'work_order',
    entityId: '0',
    kategori: 'general',
    uploadedBy: '0',
    uploaderName: 'System',
    vehicleId: null,
    vehiclePlate: null,
    capturedAtClient: now,
    capturedAtServer: now,
    watermarkAppliedAt: now,
    gpsLat: null,
    gpsLng: null,
    sizeBytes: 0,
    hashSha256: '',
    caption: caption ?? '',
  };
}

function mapEvidence(raw: BackendWorkOrder): WorkOrderEvidence[] {
  const latestDraft = raw.draftChecklists?.[0];
  const fromDraft =
    latestDraft?.items?.flatMap((item) =>
      (item.fotos ?? []).map((foto, index) => {
        const urutan = foto.urutan ?? index + 1;
        const kategori =
          urutan === 1
            ? 'kondisi_awal'
            : urutan === 2
              ? 'sparepart_sebelum'
              : urutan === 3
                ? 'sparepart_sesudah'
                : 'pasca_perbaikan';
        const imageId = foto.imageId ?? foto.image?.id ?? 0;
        const caption = item.namaSparepart || item.namaKerusakan || `Item ${item.urutan}`;
        return {
          id: String(foto.id),
          workOrderId: String(raw.id),
          kategori,
          imageId: String(imageId),
          image: emptyImage(imageId, foto.image?.signedUrl, caption),
          uploadedAt: latestDraft.updatedAt,
          uploadedBy: String(raw.vendorId ?? 0),
        } satisfies WorkOrderEvidence;
      }),
    ) ?? [];

  const fromPembayaran = raw.pembayaran?.buktiTransfer
    ? [
        {
          id: `bt-${raw.pembayaran.id}`,
          workOrderId: String(raw.id),
          kategori: 'pasca_perbaikan',
          imageId: String(raw.pembayaran.buktiTransfer.imageId),
          image: emptyImage(raw.pembayaran.buktiTransfer.imageId, raw.pembayaran.buktiTransfer.image?.signedUrl),
          uploadedAt: raw.pembayaran.paidAt ?? raw.pembayaran.updatedAt,
          uploadedBy: String(raw.pembayaran.bendaharaId),
        } satisfies WorkOrderEvidence,
      ]
    : [];

  const fromDokumentasi: WorkOrderEvidence[] = (raw.dokumentasi ?? []).map((dok: any) => ({
    id: `dok-${dok.id}`,
    workOrderId: String(raw.id),
    kategori: dok.kategori === 'IN_PROGRESS' ? 'sparepart_sebelum' : 'pasca_perbaikan',
    imageId: String(dok.imageId),
    image: emptyImage(dok.imageId, dok.image?.signedUrl, dok.kategori === 'IN_PROGRESS' ? 'In Progress' : 'Setelah Perbaikan'),
    uploadedAt: dok.createdAt,
    uploadedBy: String(raw.vendorId ?? 0),
  }));

  return [...fromDraft, ...fromPembayaran, ...fromDokumentasi];
}

function mapStatus(raw: BackendWorkOrder): WorkOrderStatus {
  return raw.status as WorkOrderStatus;
}

function mapProgress(raw: BackendWorkOrder): WorkOrderProgress[] {
  const events: WorkOrderProgress[] = [];
  const vendorName = raw.vendor?.namaVendor ?? 'Vendor';

  events.push({
    id: `wo-${raw.id}-created`,
    workOrderId: String(raw.id),
    status: 'received',
    occurredAt: raw.createdAt,
    actorId: String(raw.vendorId ?? 0),
    actorName: vendorName,
    notes: 'Work order dibuat',
  });

  const latestDraft = raw.draftChecklists?.[0];
  if (latestDraft) {
    const draftNotesByStatus: Record<string, string> = {
      DRAFT: 'Draft checklist disimpan vendor',
      DIKIRIM: 'Draft checklist dikirim ke Pengurus Barang',
      DISETUJUI: 'Draft checklist disetujui Pengurus Barang',
      DITOLAK: 'Draft checklist ditolak Pengurus Barang',
    };

    events.push({
      id: `wo-${raw.id}-draft-${latestDraft.id}`,
      workOrderId: String(raw.id),
      status: 'in_progress',
      occurredAt: latestDraft.updatedAt ?? latestDraft.createdAt,
      actorId: String(raw.vendorId ?? 0),
      actorName: vendorName,
      notes: draftNotesByStatus[latestDraft.status] ?? `Draft checklist status ${latestDraft.status}`,
    });
  }

  const statusNotesByWoStatus: Partial<Record<WorkOrderStatus, string>> = {
    DIBUAT: 'Work order dibuat',
    VENDOR_DITUGASKAN: 'Vendor ditugaskan',
    DRAFT_CHECKLIST: 'Menunggu review draft checklist',
    PENAWARAN: 'Masuk tahap penawaran',
    MENUNGGU_INVOICE_VENDOR: 'Menunggu invoice final dari vendor',
    MENUNGGU_VERIFIKATOR: 'Invoice vendor menunggu review verifikator',
    MENUNGGU_PPTK: 'Menunggu persetujuan PPTK',
    DISETUJUI_PPTK: 'Disetujui PPTK, menunggu pembayaran',
    DITOLAK_PB: 'Ditolak Pengurus Barang',
    DITOLAK_VERIFIKATOR: 'Ditolak Verifikator',
    DITOLAK_PPTK: 'Ditolak PPTK',
    DIBAYAR: 'Pembayaran selesai',
    DIVERIFIKASI: 'Diverifikasi',
  };

  if (statusNotesByWoStatus[raw.status as WorkOrderStatus]) {
    events.push({
      id: `wo-${raw.id}-status-${raw.status.toLowerCase()}`,
      workOrderId: String(raw.id),
      status: raw.status === 'DIBAYAR' ? 'completed' : 'in_progress',
      occurredAt:
        raw.pembayaran?.paidAt ??
        raw.verifikasiHarga?.verifikasiAt ??
        raw.penawaran?.[0]?.updatedAt ??
        raw.updatedAt ??
        raw.createdAt,
      actorId:
        raw.status === 'DIBAYAR'
          ? String(raw.pembayaran?.bendaharaId ?? 0)
          : String(raw.verifikasiHarga?.verifikator?.id ?? raw.vendorId ?? 0),
      actorName:
        raw.status === 'DIBAYAR'
          ? (raw.pembayaran?.bendahara?.fullName ?? 'Bendahara')
          : (raw.verifikasiHarga?.verifikator?.fullName ?? vendorName),
      notes: statusNotesByWoStatus[raw.status as WorkOrderStatus]!,
    });
  }

  return events.sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
  );
}

function mapWorkOrder(raw: BackendWorkOrder): WorkOrder {
  const latestPenawaran = raw.penawaran?.[0];
  const mappedStatus = mapStatus(raw);
  return {
    id: String(raw.id),
    nomor: raw.nomorWo,
    pengajuanId: String(raw.pengajuanId),
    pengajuanNomor: `PENGAJUAN-${raw.pengajuan.id}`,
    vehicleId: String(raw.pengajuan.kendaraanId),
    vehiclePlate: raw.pengajuan.kendaraan.nomorPolisi,
    vendorId: String(raw.vendorId ?? 0),
    vendorNama: raw.vendor?.namaVendor ?? 'Belum ditugaskan',
    status: mappedStatus,
    totalNominal: asNumber(raw.pembayaran?.totalDibayar ?? latestPenawaran?.totalBiaya ?? latestPenawaran?.invoice?.totalTagihan),
    assignedAt: raw.createdAt,
    receivedAt: raw.draftChecklists?.[0]?.createdAt ?? null,
    startedAt: raw.draftChecklists?.[0]?.updatedAt ?? null,
    completedAt: raw.verifikasiHarga?.verifikasiAt ?? null,
    validatedAt: raw.pembayaran?.paidAt ?? (raw.verifikasiHarga?.status === 'REVISI_DIMINTA' ? raw.verifikasiHarga?.updatedAt ?? null : null),
    validatedBy:
      mappedStatus === 'DIBAYAR'
        ? String(raw.pembayaran?.bendaharaId ?? 0)
        : raw.verifikasiHarga?.status === 'REVISI_DIMINTA'
          ? String(raw.verifikasiHarga?.verifikator?.id ?? 0)
          : null,
    rejectedReason: raw.verifikasiHarga?.status === 'REVISI_DIMINTA' ? (raw.verifikasiHarga.catatanRevisi ?? null) : null,
    progressUpdates: mapProgress(raw),
    evidence: mapEvidence(raw),
    penawaranDetail: latestPenawaran
      ? {
          id: String(latestPenawaran.id),
          versi: 1,
          totalBiaya: asNumber(latestPenawaran.totalBiaya),
          status: latestPenawaran.status,
          catatanPerubahan: null,
          items: latestPenawaran.items?.map((item: any) => ({
            id: item.id,
            urutan: item.urutan ?? 1,
            namaKerusakan: item.namaKerusakan ?? '',
            namaSparepart: item.namaSparepart ?? '',
            tindakanPerbaikan: item.tindakanPerbaikan ?? '',
            hargaItem: asNumber(item.hargaItem),
          })) ?? [],
          invoice: latestPenawaran.invoice
            ? {
                nomorInvoice: latestPenawaran.invoice.nomorInvoice,
                totalTagihan: asNumber(latestPenawaran.invoice.totalTagihan),
                tanggalInvoice: latestPenawaran.invoice.tanggalInvoice,
                imageUrl: latestPenawaran.invoice.image?.signedUrl ?? null,
              }
            : null,
        }
      : null,
    verifikasiHarga: raw.verifikasiHarga
      ? {
          id: String(raw.verifikasiHarga.id),
          status: raw.verifikasiHarga.status,
          catatanRevisi: raw.verifikasiHarga.catatanRevisi,
          shsItems: raw.verifikasiHarga.shsItems?.map((s: any) => ({
            id: s.id,
            namaItem: s.namaItem ?? '',
            hargaVendor: asNumber(s.hargaVendor),
            hargaStandart: asNumber(s.hargaStandart),
            selisih: asNumber(s.selisih),
            keterangan: s.keterangan ?? '',
            shsMasterId: s.shsMasterId ?? null,
            shsMaster: s.shsMaster ?? null,
          })) ?? [],
        }
      : null,
    pengajuan: {
      id: raw.pengajuan.id,
      createdAt: raw.pengajuan.createdAt,
      odometerSaatPengajuan: raw.pengajuan.odometerSaatPengajuan,
      pengemudi: raw.pengajuan.pengemudi,
      kendaraan: raw.pengajuan.kendaraan,
    },
    vendor: raw.vendor ?? null,
  };
}

/**
 * Production HttpClient-based implementation of WorkOrderDataPort.
 *
 * Stub placeholder Phase 1: ringkas, akan di-implement penuh di Phase 4.
 */
@Injectable({ providedIn: 'root' })
export class ApiWorkOrderData implements WorkOrderDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  list(filter?: WorkOrderFilter): Observable<WorkOrder[]> {
    let params = new HttpParams();
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.vendorId) params = params.set('vendorId', filter.vendorId);
    return this.http
      .get<BackendWorkOrder[] | ApiListResponse<BackendWorkOrder>>(this.url('/work-orders'), { params })
      .pipe(
        map((res) => {
          const rows = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : res?.data?.items ?? [];
          return rows.map(mapWorkOrder);
        }),
      );
  }

  getById(id: string): Observable<WorkOrder> {
    return this.http
      .get<BackendWorkOrder | ApiDetailResponse<BackendWorkOrder>>(this.url(`/work-orders/${id}`))
      .pipe(map((res) => mapWorkOrder((res as ApiDetailResponse<BackendWorkOrder>)?.data ?? (res as BackendWorkOrder))));
  }

  assignVendor(workOrderId: string, vendorId: string): Observable<WorkOrder> {
    return this.http
      .post<BackendWorkOrder>(this.url(`/work-orders/${workOrderId}/assign`), {
        vendorId: Number(vendorId),
      })
      .pipe(map((row) => mapWorkOrder(row)));
  }

  approvePPTK(workOrderId: string): Observable<WorkOrder> {
    return this.http
      .post<BackendWorkOrder>(this.url(`/work-orders/${workOrderId}/approve-pptk`), {})
      .pipe(map((row) => mapWorkOrder(row)));
  }

  rejectPPTK(workOrderId: string, catatan: string): Observable<WorkOrder> {
    return this.http
      .post<BackendWorkOrder>(this.url(`/work-orders/${workOrderId}/reject-pptk`), { catatanRevisi: catatan })
      .pipe(map((row) => mapWorkOrder(row)));
  }

  // Step D: PB input SHS mapping
  saveShsMapping(workOrderId: string, items: import('../ports/work-order-data.port').ShsItemInput[]): Observable<any> {
    return this.http.post<any>(this.url(`/work-orders/${workOrderId}/verifikasi/shs`), { items });
  }

  // Step D: PB review approve/reject
  pbReviewShs(workOrderId: string, approved: boolean, catatan?: string, alasanPenolakan?: string): Observable<WorkOrder> {
    return this.http
      .post<any>(this.url(`/work-orders/${workOrderId}/verifikasi/pb-review`), { approved, catatan, alasanPenolakan })
      .pipe(map((res) => mapWorkOrder(res?.data ?? res)));
  }

  // Step E: Vendor submit invoice
  submitInvoice(workOrderId: string, invoiceImageId: number, invoiceDraftImageId?: number, dokumentasiImageIds?: number[], dokumentasiKategori?: string[]): Observable<WorkOrder> {
    return this.http
      .post<any>(this.url(`/work-orders/${workOrderId}/submit-invoice`), { invoiceImageId, invoiceDraftImageId, dokumentasiImageIds, dokumentasiKategori })
      .pipe(map((res) => mapWorkOrder(res?.data ?? res)));
  }

  // Step F: Verifikator review
  verifikatorReview(workOrderId: string, approved: boolean, catatan?: string, alasanPenolakan?: string): Observable<WorkOrder> {
    return this.http
      .post<any>(this.url(`/work-orders/${workOrderId}/verifikasi/verifikator-review`), { approved, catatan, alasanPenolakan })
      .pipe(map((res) => mapWorkOrder(res?.data ?? res)));
  }

  // Step G: PPTK unified approve/reject
  pptkApprove(workOrderId: string, approved: boolean, komentar?: string, alasan?: string): Observable<WorkOrder> {
    return this.http
      .post<any>(this.url(`/work-orders/${workOrderId}/verifikasi/pptk-approve`), { approved, komentar, alasan })
      .pipe(map((res) => mapWorkOrder(res?.data ?? res)));
  }
}
