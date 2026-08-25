# Panduan Bengkel Mitra (Vendor): Proses Pengerjaan & Kirim ke PB

Dokumen ini menjelaskan langkah-langkah bagi **bengkel mitra (vendor)** dalam mengerjakan Work Order (WO) melalui menu **Proses Pengerjaan** sampai hasil pekerjaan dikirim ke **Pengurus Barang (PB)**.

---

## 1. Alur Singkat

```
WO DITUGASKAN → Vendor buat Draft Checklist → PB setujui + mapping SHS
→ PPTK "Setujui Estimasi & Terbitkan SPK"
→ PENGERJAAN (vendor bekerja & upload dokumen bertahap)
→ "Selesai Pengerjaan & Kirim ke PB"
→ PB review → (disetujui → Verifikator → PPTK → Bendahara → DIBAYAR)
```

Menu **Proses Pengerjaan** baru terbuka setelah status WO menjadi **Pengerjaan** (setelah PPTK menyetujui estimasi dan SPK diterbitkan).

---

## 2. Mengakses Menu Proses Pengerjaan

1. Login ke aplikasi menggunakan akun vendor.
2. Buka menu **Proses Pengerjaan** di sidebar (sebelumnya "Penawaran & Invoice").
3. Pilih WO aktif yang berstatus **Pengerjaan**.
4. Halaman **Proses Pengerjaan** menampilkan:
   - Ringkasan WO (kendaraan, deskripsi kerusakan, vendor)
   - Item pekerjaan yang disetujui dari Draft Checklist
   - Form upload dokumentasi dan dokumen pembayaran
   - Tombol **Selesai Pengerjaan & Kirim ke PB**

> Tips: tombol **Cetak SPK** tersedia di halaman detail WO untuk acuan lingkup pekerjaan.

---

## 3. Upload Dokumentasi Pekerjaan

Upload dapat dilakukan **bertahap** selama pengerjaan berjalan (tidak harus sekaligus). Semua foto disimpan otomatis setiap kali diupload.

| Kategori | Wajib? | Keterangan |
|---|---|---|
| Foto Spare Part | Opsional | Foto spare part yang diganti/dipasang |
| Foto Sebelum Perbaikan | Opsional | Kondisi kendaraan/komponen sebelum dikerjakan |
| Foto Saat Pengerjaan | Opsional | Proses pengerjaan, boleh lebih dari 1 |
| Foto Setelah Perbaikan | **Wajib min 1** | Hasil pekerjaan yang sudah selesai |

Cara upload:

1. Klik kotak **Tambah** pada kategori yang diinginkan.
2. Pilih satu atau beberapa foto (bisa multiple).
3. Foto muncul sebagai pratinjau; klik tombol ✕ untuk menghapus sebelum kirim.
4. Ulangi untuk kategori lain sesuai kebutuhan.

---

## 4. Upload Dokumen Pembayaran

| Dokumen | Wajib? | Keterangan |
|---|---|---|
| Invoice Final | **Wajib** | JPG/PNG/PDF, maks 5 MB |
| Draft Berttd/Cap Bengkel | Opsional | Invoice yang sudah ditandatangani/dicap |
| Faktur Pajak | Opsional | JPG/PNG/PDF, jika ada |

Nominal invoice harus sesuai total yang telah disetujui (estimasi dari Draft Checklist).

---

## 5. Selesai Pengerjaan & Kirim ke PB

Tombol **Selesai Pengerjaan & Kirim ke PB** hanya aktif jika:

- ✅ Invoice Final sudah diupload
- ✅ Minimal 1 **Foto Setelah Perbaikan** sudah diupload
- Tidak ada proses upload yang masih berjalan

Setelah tombol diklik:

1. Semua dokumen & dokumentasi dikirim ke PB.
2. Status WO berubah menjadi **Menunggu PB**.
3. Vendor akan menerima notifikasi hasil review PB.

---

## 6. Jika Ditolak PB

- WO kembali ke status **Pengerjaan**.
- Alasan penolakan tampil di halaman Proses Pengerjaan (kotak merah "Alasan Penolakan").
- Perbaiki sesuai catatan, upload ulang dokumen yang diperlukan, lalu kirim kembali ke PB.

---

## 7. Setelah Disetujui PB

1. WO diteruskan ke **Verifikator** (review invoice & dokumentasi).
2. Jika verifikator menolak → WO kembali ke Pengerjaan dengan alasan.
3. Jika disetujui → **PPTK** memberi persetujuan final.
4. **Bendahara** memproses pembayaran (Tunai / GIBS / KKPD).
5. Status akhir: **Dibayar**. Vendor dapat melihat info pembayaran di detail WO.

---

## 8. Status WO yang Relevan

| Status | Arti untuk vendor |
|---|---|
| Pengerjaan | Silakan bekerja & upload dokumen bertahap |
| Menunggu PB | Hasil pekerjaan sedang direview PB |
| Menunggu Verifikator | Sedang diverifikasi verifikator |
| Menunggu PPTK | Menunggu persetujuan final PPTK |
| Disetujui PPTK | Menunggu diproses Bendahara |
| Dibayar | Pembayaran selesai |

---

## 9. Pertanyaan Umum

**Q: Bisa upload foto sebelum semua pekerjaan selesai?**
Ya. Upload bertahap didukung; data tersimpan otomatis.

**Q: Invoice salah upload, bisa diganti?**
Ya, hapus (tombol 🗑) lalu upload ulang sebelum menekan tombol kirim ke PB.

**Q: Kenapa tombol "Selesai Pengerjaan & Kirim ke PB" tidak aktif?**
Periksa: invoice final belum diupload, atau belum ada minimal 1 foto setelah perbaikan.

**Q: Di mana melihat SPK?**
Di halaman detail WO, tombol **Cetak SPK** (terbuka untuk semua peran setelah SPK diterbitkan).
