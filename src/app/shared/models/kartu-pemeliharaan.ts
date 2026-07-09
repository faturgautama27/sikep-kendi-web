export interface KartuPemeliharaanIdentitas {
  namaBarang: string;
  kodeBarang: string;
  nomorRegister: string;
  nomorPolisi: string;
  merkTipe: string;
  tahunPerolehan: number;
  nomorMesin: string | null;
  nomorRangka: string | null;
  warna: string | null;
  opd: string;
  unitKerja: string | null;
  pengguna: string | null;
  kondisiAwal: string;
}

export interface KartuPemeliharaanRiwayat {
  tanggal: string;
  kilometer: number;
  jenisPemeliharaan: string;
  bahanDigunakan: string;
  biayaJasa: number;
  biayaSparepart: number;
  totalBiaya: number;
  pelaksana: string;
  keterangan: string;
}

export interface KartuPemeliharaanRekapitulasi {
  totalKegiatan: number;
  totalBiayaJasa: number;
  totalBiayaSparepart: number;
  totalKeseluruhan: number;
  paguTahunan: number | null;
  sisaPagu: number | null;
}

export interface KartuPemeliharaan {
  identitas: KartuPemeliharaanIdentitas;
  riwayat: KartuPemeliharaanRiwayat[];
  rekapitulasi: KartuPemeliharaanRekapitulasi;
  tahun: number;
}
