import type { Uuid, Timestamp, Money } from './common';
import type { Image } from './image';

export type PengajuanJenis = 'SERVIS_RUTIN' | 'PERBAIKAN_KERUSAKAN' | 'GANTI_SPARE_PART';
export type PengajuanStatus =
  | 'draft'
  | 'menunggu_verifikasi'
  | 'terverifikasi'
  | 'ditolak'
  | 'work_order_terbuat';
export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export interface Pengajuan {
  id: Uuid;
  nomor: string; // human-friendly: PMNT-2025-0001
  jenis: PengajuanJenis;
  vehicleId: Uuid;
  vehiclePlate: string;
  regulationVersionId: Uuid;
  judul: string;
  deskripsi: string;
  kategoriKerusakan: string | null;
  totalEstimasi: Money;
  status: PengajuanStatus;
  createdBy: Uuid;
  createdByName: string;
  sourceExecutionId: Uuid | null; // referensi ke ChecklistExecution jika auto
  sourceItemId: Uuid | null;
  spareparts: PengajuanSparepart[];
  approvalSteps: ApprovalStep[];
  workOrderId: Uuid | null;
  photos: Image[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  submittedAt: Timestamp | null;
  approvedAt: Timestamp | null;
  rejectedAt: Timestamp | null;
  vehicleMerk?: string;
  vehicleModel?: string;
  vehicleTahun?: number;
  odometerSaatPengajuan?: number;
  odometerSaatIni?: number;
  verifikasiOlehId?: string | null;
  verifikasiAt?: Timestamp | null;
  komentarVerifikasi?: string | null;
  alasanPenolakan?: string | null;
  warnings?: string[];
}

export interface PengajuanSparepart {
  id: Uuid;
  pengajuanId: Uuid;
  sparepartId: Uuid;
  sparepartKode: string;
  sparepartNama: string;
  qty: number;
  hargaSatuanSnapshot: Money;
  subtotal: Money;
}

export interface ApprovalStep {
  id: Uuid;
  pengajuanId: Uuid;
  jenjangNo: number;
  role: string; // 'pengurus_barang' | 'verifikator' | 'admin_sistem'
  approverId: Uuid | null;
  approverName: string | null;
  decision: ApprovalDecision;
  decidedAt: Timestamp | null;
  comment: string;
  ambangNominalMin: Money;
}

export interface ApprovalPolicy {
  id: Uuid;
  jenis: PengajuanJenis;
  jenjangNo: number;
  ambangNominalMin: Money;
  role: string;
}
