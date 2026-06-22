import { Vehicle } from './vehicle';
import { User } from './user';
import { Image } from './image';

export type DaruratStatus =
  | 'MENUNGGU_VERIFIKASI'
  | 'TERVERIFIKASI'
  | 'DITOLAK'
  | 'REIMBURSE_APPROVED';

export interface LaporanDaruratFoto {
  id: number;
  laporanDaruratId: number;
  tipe: 'KERUSAKAN' | 'INVOICE';
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
  totalPengeluaran: number;
  status: DaruratStatus;
  verifikasiOlehId: string | null;
  verifikasiAt: string | null;
  approveReimburseOlehId: string | null;
  approveReimburseAt: string | null;
  createdAt: string;
  updatedAt: string;

  // relations
  kendaraan?: Vehicle;
  pengemudi?: User;
  verifikasiOleh?: User;
  approveReimburseOleh?: User;
  fotos?: LaporanDaruratFoto[];
}
