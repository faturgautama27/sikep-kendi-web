export interface ShsMaster {
  id: number;
  kodeItem: string;
  namaItem: string;
  satuan: string;
  hargaMaksimum: number;
  sumberReferensi?: string;
  keterangan?: string;
  isAktif: boolean;
  createdAt: string;
  updatedAt: string;
}
