import type { Uuid, Timestamp } from './common';

export type ImageEntityKind =
  | 'vehicle'
  | 'pengajuan'
  | 'work_order'
  | 'checklist'
  | 'fuel'
  | 'document'
  | 'spj';

export type ImageCategory =
  | 'baseline_depan'
  | 'baseline_belakang'
  | 'baseline_kiri'
  | 'baseline_kanan'
  | 'kerusakan'
  | 'sparepart_sebelum'
  | 'sparepart_sesudah'
  | 'pasca_perbaikan'
  | 'dokumen'
  | 'fuel_evidence'
  | 'general';

export interface Image {
  id: Uuid;
  url: string;
  thumbnailUrl: string;
  entityKind: ImageEntityKind;
  entityId: Uuid;
  kategori: ImageCategory;
  uploadedBy: Uuid;
  uploaderName: string;
  vehicleId: Uuid | null;
  vehiclePlate: string | null;
  capturedAtClient: Timestamp;
  capturedAtServer: Timestamp;
  watermarkAppliedAt: Timestamp;
  gpsLat: number | null;
  gpsLng: number | null;
  sizeBytes: number;
  hashSha256: string;
  caption: string;
}
