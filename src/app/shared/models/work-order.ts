import type { Uuid, Timestamp, Money } from './common';
import type { Image } from './image';

export interface WorkOrderPenawaranItem {
  id: number;
  urutan: number;
  namaKerusakan: string;
  namaSparepart: string;
  tindakanPerbaikan: string;
  hargaItem: number | string;
}

export interface WorkOrderShsItem {
  id: number;
  namaItem: string;
  hargaVendor: number | string;
  hargaStandart: number | string;
  selisih: number | string;
  keterangan: string;
  shsMasterId?: number | null;
  shsMaster?: any;
}

export interface WorkOrderVerifikasiHarga {
  id: string;
  status: string;
  catatanRevisi?: string | null;
  verifikator?: any;
  shsItems: WorkOrderShsItem[];
}

export type WorkOrderStatus =
  | 'DIBUAT'
  | 'VENDOR_DITUGASKAN'
  | 'DRAFT_CHECKLIST'
  | 'PENAWARAN'
  | 'DIVERIFIKASI'
  | 'MENUNGGU_INVOICE_VENDOR'
  | 'MENUNGGU_VERIFIKATOR'
  | 'MENUNGGU_PPTK'
  | 'DISETUJUI_PPTK'
  | 'DIBAYAR'
  | 'DITOLAK_PB'
  | 'DITOLAK_VERIFIKATOR'
  | 'DITOLAK_PPTK';
export type WorkOrderProgressStatus = 'received' | 'in_progress' | 'completed';
export type EvidenceCategory =
  | 'kondisi_awal'
  | 'sparepart_sebelum'
  | 'sparepart_sesudah'
  | 'pasca_perbaikan';

export interface WorkOrderInvoice {
  nomorInvoice: string;
  totalTagihan: number;
  tanggalInvoice: string;
  imageUrl: string | null;
}

export interface WorkOrderPenawaranDetail {
  id: string;
  versi: number;
  totalBiaya: number;
  status: string;
  catatanPerubahan?: string | null;
  invoice: WorkOrderInvoice | null;
  items: WorkOrderPenawaranItem[];
}

export interface WorkOrder {
  id: Uuid;
  nomor: string; // WO-2025-0001
  nomorWo?: string;
  pengajuanId: Uuid;
  pengajuanNomor: string;
  vehicleId: Uuid;
  vehiclePlate: string;
  vendorId: Uuid;
  vendorNama: string;
  status: WorkOrderStatus;
  totalNominal: Money;
  assignedAt: Timestamp;
  receivedAt: Timestamp | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  validatedAt: Timestamp | null;
  validatedBy: Uuid | null;
  rejectedReason: string | null;
  progressUpdates: WorkOrderProgress[];
  evidence: WorkOrderEvidence[];
  dokumentasi?: any[];
  penawaranDetail: WorkOrderPenawaranDetail | null;
  verifikasiHarga?: WorkOrderVerifikasiHarga | null;
  pengajuan?: any;
  vendor?: any;
  totalBiaya?: number;
  createdAt?: string;
  updatedAt?: string;
  pbCatatan?: string | null;
  pbVerifikasiAt?: string | null;
  pbAlasanPenolakan?: string | null;
}

export interface WorkOrderProgress {
  id: Uuid;
  workOrderId: Uuid;
  status: WorkOrderProgressStatus;
  occurredAt: Timestamp;
  actorId: Uuid;
  actorName: string;
  notes: string;
}

export interface WorkOrderEvidence {
  id: Uuid;
  workOrderId: Uuid;
  kategori: EvidenceCategory;
  imageId: Uuid;
  image: Image;
  uploadedAt: Timestamp;
  uploadedBy: Uuid;
}
