import type { Uuid, Timestamp, Money } from './common';
import type { Image } from './image';

export type WorkOrderStatus =
  | 'DIBUAT'
  | 'VENDOR_DITUGASKAN'
  | 'DRAFT_CHECKLIST'
  | 'PENAWARAN'
  | 'DIVERIFIKASI'
  | 'DIBAYAR';
export type WorkOrderProgressStatus = 'received' | 'in_progress' | 'completed';
export type EvidenceCategory =
  | 'kondisi_awal'
  | 'sparepart_sebelum'
  | 'sparepart_sesudah'
  | 'pasca_perbaikan';

export interface WorkOrder {
  id: Uuid;
  nomor: string; // WO-2025-0001
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
