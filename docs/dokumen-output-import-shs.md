# Dokumen Output Kegiatan: Import Data SHS dari Excel

**Tanggal kegiatan:** 2026-08-20
**Proyek:** Sikep Kendi (sikep-kendi-laravel)
**Status:** SELESAI — import berhasil dan tervalidasi

---

## 1. Ringkasan Kegiatan

Import data **Standar Harga Satuan (SHS)** dari file Excel resmi ke tabel `standar_harga_satuan` di database aplikasi, menggantikan seluruh data lama yang sudah tidak dipakai. Data lama dihapus terlebih dahulu sesuai persetujuan user.

---

## 2. Sumber Data

| Item | Nilai |
|---|---|
| File sumber | `sikep-kendi-laravel/database/SSH SIKEPKENDI.xlsx` |
| Jumlah sheet | 1 (`Worksheet`) |
| Total baris data | 910 (setelah 1 baris header) |
| Baris valid diimpor | **859** (Status = `Final` dan Harga Final terisi) |
| Baris dilewati | 51 (baris hirarki/kategori tanpa harga, mis. "ASET", "ASET LANCAR") |

---

## 3. Mapping Field (disetujui user)

| Kolom DB `standar_harga_satuan` | Sumber Excel | Keterangan |
|---|---|---|
| `kode_item` | `Kode Barang` | Duplikat diberi suffix counter: `{kode}-{n}` (keputusan user) |
| `nama_item` | `Uraian` + `Spesifikasi` | Format: `Uraian - Spesifikasi` (jika spesifikasi ada), maks 255 karakter |
| `satuan` | `Satuan` | Semua baris valid terisi |
| `harga_maksimum` | `Harga Final` | Numerik, tanpa pemisah |
| `keterangan` | `Spesifikasi` | Nullable |
| `sumber_referensi` | — | Konstanta `SSH SIKEPKENDI.xlsx` |
| `is_aktif` | — | `true` |

**Temuan data penting:** `Kode Barang` bukan kode unik — 24 nilai kode dipakai oleh 853 baris (satu kode dipakai hingga 115 item). Solusi suffix counter menjaga UNIQUE constraint `kode_item` tetap utuh tanpa migrasi skema.

---

## 4. Implementasi Teknis

- **File baru:** `app/Console/Commands/ImportShs.php`
- **Command:** `php artisan shs:import {file}`
- **Metode parsing:** `ZipArchive` + `SimpleXML` (baca `xl/sharedStrings.xml` + `xl/worksheets/sheet1.xml` langsung) — **tanpa dependensi baru** (phpoffice/phpspreadsheet tidak terpasang; `ext-zip` tersedia).
- **Proses tulis:** satu DB transaction — hapus semua data lama (`StandarHargaSatuan::query()->delete()`), lalu insert bertahap per 100 baris.
- **Idempotent:** re-import file sama menghasilkan data identik (delete-then-insert, suffix deterministik per urutan baris).

---

## 5. Hasil Eksekusi

```
$ php artisan shs:import "database/SSH SIKEPKENDI.xlsx"
Dibaca: 910 baris
Diimpor: 859, dilewati: 51
Kode barang duplikat (diberi suffix): 24 grup
```

---

## 6. Validasi

| Pemeriksaan | Hasil | Status |
|---|---|---|
| `COUNT(*)` vs `COUNT(DISTINCT kode_item)` | 859 == 859 | ✅ Lolos |
| Spot check item | `Bahan Bakar - Avtur · Liter · 23600` | ✅ Sesuai Excel |
| Suffix duplikat | `1.1.12.01.01.0012-2` … `-105` (kode pertama tanpa suffix) | ✅ Konsisten |
| Rentang harga | 0 – 11.556.880.000 | ✅ Wajar, semua numerik |
| `php -l` | No syntax errors | ✅ Lolos |
| `vendor/bin/pint --test` | Passed | ✅ Lolos |

---

## 7. Backup & Rollback

- **Backup DB sebelum import:** `database/database.sqlite.bak-shs-20260820-140153`
- **Rollback manual:** restore file backup tersebut ke `database/database.sqlite` (hentikan server Laravel dulu agar SQLite tidak locked).
- Tidak ada rollback otomatis selain backup file.

---

## 8. Risiko & Catatan

1. `kode_item` dengan suffix (mis. `-042`) adalah kode buatan; **kode rekening belanja asli tidak disimpan** di kolom mana pun (sesuai keputusan user). Bila nanti dibutuhkan, tambahkan kolom via migrasi terpisah lalu re-import.
2. Tabel transaksi (`shs_items`, `darurat_shs_items`) dalam kondisi kosong saat import, sehingga penghapusan data SHS lama tidak merusak FK.
3. Endpoint yang memakai SHS (mis. `VerifikasiController::shs` dengan validasi `shsMasterId`) otomatis memakai ID baru — tidak ada perubahan kode diperlukan.

---

## 9. Artefak Kegiatan

| Artefak | Lokasi |
|---|---|
| Command import | `sikep-kendi-laravel/app/Console/Commands/ImportShs.php` |
| File Excel sumber | `sikep-kendi-laravel/database/SSH SIKEPKENDI.xlsx` |
| Backup database | `sikep-kendi-laravel/database/database.sqlite.bak-shs-20260820-140153` |
| Plan kegiatan | `~/.local/share/kilo/plans/1786996266801-import-shs-excel-plan.md` |
