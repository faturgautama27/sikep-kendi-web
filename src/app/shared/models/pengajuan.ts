export interface PengajuanDetailLengkap {
  id: number;
  jenisPengajuan: string;
  deskripsiKerusakan: string;
  odometerSaatPengajuan: number;
  status: string;
  verifikasiAt: string | null;
  komentarVerifikasi: string | null;
  alasanPenolakan: string | null;
  createdAt: string;
  updatedAt: string;
  kendaraan: {
    nomorPolisi: string;
    merk: string;
    model: string;
    tahun: number;
    odometerSaatIni: number;
    jenisKendaraan: string | null;
    nomorInventaris: string | null;
    nomorMesin: string | null;
    nomorRangka: string | null;
    unitKerja: string | null;
  };
  pengemudi: { id: number; fullName: string; email: string };
  verifikasiOleh: { id: number; fullName: string; email: string } | null;
  fotos: Array<{ urutan: number; url: string }>;
  workOrder: {
    id: number;
    nomorWo: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    vendor: {
      namaVendor: string;
      alamat: string;
      kontak: string;
      email: string;
    } | null;
    pbVerifikasiAt: string | null;
    pbCatatan: string | null;
    pbAlasanPenolakan: string | null;
    pbVerifikator: { fullName: string } | null;
    verifikasiAt: string | null;
    verifikatorCatatan: string | null;
    verifikatorAlasanPenolakan: string | null;
    verifikator: { fullName: string } | null;
    pptkeAt: string | null;
    catatanPptk: string | null;
    alasanPenolakanPptk: string | null;
    pptk: { fullName: string } | null;
    invoiceUploadAt: string | null;
    penawaran: Array<{
      id: number;
      versi: number;
      totalBiaya: number;
      status: string;
      createdAt: string;
      items: Array<{
        namaKerusakan: string;
        namaSparepart: string | null;
        tindakanPerbaikan: string;
        hargaItem: number;
        urutan: number;
      }>;
      invoice: {
        nomorInvoice: string;
        totalTagihan: number;
        tanggalInvoice: string;
      } | null;
    }>;
    verifikasiHarga: {
      status: string;
      catatanRevisi: string | null;
      verifikasiAt: string | null;
      verifikator: { fullName: string };
      shsItems: Array<{
        namaItem: string;
        hargaVendor: number;
        hargaStandart: number;
        selisih: number;
        keterangan: string | null;
      }>;
    } | null;
    dokumentasi: Array<{ kategori: string; url: string }>;
    pembayaran: {
      metodePembayaran: string;
      tanggalPembayaran: string;
      totalDibayar: number;
      status: string;
      paidAt: string | null;
      bendahara: { fullName: string };
      buktiTransfer: { image: { url: string } } | null;
    } | null;
  } | null;
}
