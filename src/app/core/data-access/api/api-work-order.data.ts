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
}

interface BackendPengajuan {
  id: number;
  kendaraanId: number;
  kendaraan: BackendKendaraan;
}

interface BackendWorkOrder {
  id: number;
  nomorWo: string;
  pengajuanId: number;
  vendorId: number | null;
  status: string;
  createdAt: string;
  pengajuan: BackendPengajuan;
  vendor?: BackendVendor | null;
  draftChecklists?: BackendDraftChecklist[];
  penawaran?: BackendPenawaran[];
  verifikasiHarga?: BackendVerifikasiHarga | null;
  pembayaran?: BackendPembayaran | null;
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

  return [...fromDraft, ...fromPembayaran];
}

function mapStatus(raw: BackendWorkOrder): WorkOrderStatus {
  return raw.status as WorkOrderStatus;
}

function mapProgress(raw: BackendWorkOrder): WorkOrderProgress[] {
  const events: WorkOrderProgress[] = [
    {
      id: `wo-${raw.id}-assigned`,
      workOrderId: String(raw.id),
      status: 'received',
      occurredAt: raw.createdAt,
      actorId: String(raw.vendorId ?? 0),
      actorName: raw.vendor?.namaVendor ?? 'Vendor belum ditentukan',
      notes: 'Work order dibuat dan ditugaskan ke vendor.',
    },
  ];

  if (raw.draftChecklists?.length) {
    events.push({
      id: `wo-${raw.id}-draft`,
      workOrderId: String(raw.id),
      status: 'in_progress',
      occurredAt: raw.draftChecklists[0].updatedAt,
      actorId: String(raw.vendorId ?? 0),
      actorName: raw.vendor?.namaVendor ?? 'Vendor',
      notes: `Draft checklist ${raw.draftChecklists[0].status === 'DISETUJUI' ? 'disetujui oleh Pengurus Barang.' : 'dikirim oleh Vendor.'}`,
    });
  }

  if (raw.penawaran?.length) {
    const pnw = raw.penawaran[0];
    events.push({
      id: `wo-${raw.id}-penawaran`,
      workOrderId: String(raw.id),
      status: 'in_progress',
      occurredAt: pnw.updatedAt,
      actorId: String(raw.vendorId ?? 0),
      actorName: raw.vendor?.namaVendor ?? 'Vendor',
      notes: pnw.status === 'DIKIRIM'
        ? 'Penawaran resmi dikirim ke Verifikator, menunggu persetujuan.'
        : pnw.status === 'DIVERIFIKASI'
          ? 'Penawaran telah diverifikasi.'
          : pnw.status === 'REVISI'
            ? 'Revisi penawaran diminta oleh Verifikator.'
            : `Penawaran status ${pnw.status}.`,
    });
  }

  if (raw.verifikasiHarga?.status === 'DISETUJUI' || raw.status === 'DIVERIFIKASI' || raw.status === 'DIBAYAR') {
    events.push({
      id: `wo-${raw.id}-verified`,
      workOrderId: String(raw.id),
      status: 'completed',
      occurredAt:
        raw.verifikasiHarga?.verifikasiAt ??
        raw.pembayaran?.createdAt ??
        raw.penawaran?.[0]?.updatedAt ??
        raw.createdAt,
      actorId: String(raw.verifikasiHarga?.verifikator?.id ?? 0),
      actorName: raw.verifikasiHarga?.verifikator?.fullName ?? 'Verifikator',
      notes: 'Penawaran diverifikasi dan siap diproses lebih lanjut.',
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
      .get<BackendWorkOrder[]>(this.url('/work-orders'), { params })
      .pipe(map((rows) => rows.map(mapWorkOrder)));
  }

  getById(id: string): Observable<WorkOrder> {
    return this.http
      .get<BackendWorkOrder>(this.url(`/work-orders/${id}`))
      .pipe(map((row) => mapWorkOrder(row)));
  }

  assignVendor(workOrderId: string, vendorId: string): Observable<WorkOrder> {
    return this.http
      .post<BackendWorkOrder>(this.url(`/work-orders/${workOrderId}/assign`), {
        vendorId: Number(vendorId),
      })
      .pipe(map((row) => mapWorkOrder(row)));
  }
}
