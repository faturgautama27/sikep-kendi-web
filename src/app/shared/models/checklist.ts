import type { Uuid, Timestamp } from './common';
import type { VehicleType } from './vehicle';
import type { Image } from './image';

export type ChecklistFrequencyKind = 'daily' | 'weekly' | 'monthly' | 'every_km';
export type ItemCategory =
  | 'rem'
  | 'lampu'
  | 'ban'
  | 'oli'
  | 'dokumen'
  | 'body'
  | 'mesin'
  | 'kustom';
export type ItemRatingType = 'pass_fail' | 'scale';
export type AnswerStatus = 'ok' | 'tidak_ok' | 'perhatian';
export type ExecutionStatus = 'pending' | 'in_progress' | 'completed';

export interface ChecklistFrequency {
  kind: ChecklistFrequencyKind;
  everyKm?: number; // hanya jika kind === 'every_km'
}

export interface ChecklistTemplate {
  id: Uuid;
  nama: string;
  vehicleType: VehicleType | 'all';
  frequency: ChecklistFrequency;
  currentVersionId: Uuid;
  active: boolean;
  createdAt: Timestamp;
}

export interface ChecklistTemplateVersion {
  id: Uuid;
  templateId: Uuid;
  versionNo: number;
  publishedAt: Timestamp;
  publishedBy: Uuid;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: Uuid;
  templateVersionId: Uuid;
  kategori: ItemCategory;
  nama: string;
  description: string;
  wajibFoto: boolean;
  wajibUkur: boolean;
  satuan: string | null;
  rangeMin: number | null;
  rangeMax: number | null;
  ratingType: ItemRatingType;
  ordering: number;
}

export interface ChecklistExecution {
  id: Uuid;
  clientUuid: string;
  templateVersionId: Uuid;
  templateName: string;
  vehicleId: Uuid;
  vehiclePlate: string;
  driverId: Uuid;
  driverName: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  status: ExecutionStatus;
  gpsLat: number | null;
  gpsLng: number | null;
  answers: ChecklistAnswer[];
  totalItems: number;
  okCount: number;
  notOkCount: number;
}

export interface ChecklistAnswer {
  id: Uuid;
  executionId: Uuid;
  itemId: Uuid;
  itemName: string;
  itemCategory: ItemCategory;
  status: AnswerStatus;
  measurementValue: number | null;
  notes: string;
  imageIds: Uuid[];
  images: Image[];
}
