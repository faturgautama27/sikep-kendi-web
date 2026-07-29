export interface ServisInfoItem {
  namaKerusakan: string;
  namaSparepart: string | null;
  tindakanPerbaikan: string;
  hargaItem: number;
}

export interface LastServisDetail {
  pengajuanId: number;
  workOrderId: number | null;
  nomorWo: string | null;
  /** ISO timestamp pembayaran */
  servisAt: string | null;
  odometerSaatServis: number | null;
  /** Jumlah hari sejak servis terakhir */
  hariSejak: number | null;
  /** Selisih km sejak servis terakhir */
  kmSejak: number | null;
  vendor: string | null;
  totalDibayar: number | null;
  items: ServisInfoItem[];
}

export interface ServisInfo {
  kendaraanId: number;
  odometerSaatIni: number;
  intervalServisHari: number | null;
  intervalServisKm: number | null;
  /** true jika sudah waktunya servis (OR logic) atau interval belum dikonfigurasi */
  sudahWaktunya: boolean;
  /** Daftar alasan mengapa belum waktunya servis (kosong jika sudahWaktunya = true) */
  alasanBelumWaktunya: string[];
  /** null jika belum pernah ada servis rutin yang terbayar */
  lastServis: LastServisDetail | null;
}
