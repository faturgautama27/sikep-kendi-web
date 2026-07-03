import { Vehicle } from './vehicle';
import { User } from './user';
import { Image } from './image';

export type DaruratStatus =
  | 'MENUNGGU_VERIFIKASI_PB'
  | 'DISETUJUI_PB'
  | 'DITOLAK_PB'
  | 'MENUNGGU_REIMBURSEMENT'
  | 'REIMBURSEMENT_DIAJUKAN'
  | 'MENUNGGU_SHS_PB'
  | 'SHS_DIKERJAKAN'
  | 'MENUNGGU_PPTK'
  | 'DISETUJUI_PPTK'
  | 'DIBAYAR'
  | 'DITOLAK_VERIFIKATOR'
  | 'DITOLAK_PPTK';

export interface LaporanDaruratFoto {
  id: number;
  laporanDaruratId: number;
  tipe: 'KERUSAKAN' | 'NOTA_KWITANSI' | 'SETELAH_PERBAIKAN';
  imageId: number;
  urutan: number;
  image?: Image;
  url?: string;
}

export interface LaporanDarurat {
  id: string; // mapped from backend number to string in frontend if needed, or keep as number
  clientUuid: string;
  kendaraanId: string;
  pengemudiId: string;
  deskripsiDarurat: string;
  lokasiKejadian: string | null;
  latitude: number | null;
  longitude: number | null;
  estimasiBiaya?: number | null;
  totalReimbursement?: number | null;
  totalPengeluaran?: number | null;
  status: DaruratStatus;
  verifikasiOlehId: string | null;
  verifikasiAt: string | null;
  catatanVerifikasiPB?: string | null;
  catatanVerifikator?: string | null;
  catatanPptk?: string | null;
  alasanPenolakanPptk?: string | null;
  pembayaranAt?: string | null;
  createdAt: string;
  updatedAt: string;
  historiMaintenance?: any;
  shsItems?: any[];
  buktiDarurat?: any;
  pembayaran?: {
    id: number;
    buktiTransfer?: {
      id: number;
      image?: any;
      url?: string;
    };
  };
  statusTimeline?: Array<{
    status: string;
    label: string;
    timestamp: string | Date;
    actor?: { id: number; fullName: string };
    notes?: string;
  }>;

  // relations
  kendaraan?: Vehicle;
  pengemudi?: User;
  verifikasiOleh?: User;
  approveReimburseOleh?: User;
  bendahara?: User;
  fotos?: LaporanDaruratFoto[];
}
