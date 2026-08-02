# SIKEP KENDI — Implementation Plan
> Tanggal: 2 Agustus 2026  
> Berdasarkan notulen revisi fitur

---

## Ringkasan Keputusan

| # | Fitur | Status Saat Ini | Keputusan |
|---|-------|----------------|-----------|
| 1 | TTD Laporan Pengajuan | Belum ada | **Skip dulu** |
| 2 | Draft Checklist → Verifikasi PPTK | PB approve saja | Tambah step PPTK setelah PB approve |
| 3 | Foto Sebelum Pengerjaan | Opsional | Vendor upload, **mandatory** |
| 4 | Export Excel | Client-side sebagian | **Server-side semua laporan** |
| 5 | BAST PDF | Hanya `bast_image_id` scan | **Generate PDF otomatis + TTD vendor & PPTK** |
| 6 | Metode Pembayaran | `crm/tunai/kkpd` | **Tunai / GIBS / KKPD + QR upload** |
| 7 | Laporan per Role | Semua bisa akses semua | Filter per role: Admin, Pembantu PB, PB, PPTK |
| 8 | Kondisi Kendaraan | Belum ada | Input PB saat vendor upload penawaran/invoice |

---

## Alur Status Baru

### Draft Checklist
```
DRAFT → DIKIRIM → DISETUJUI_PB → DISETUJUI_PPTK
                ↘ DITOLAK_PB (vendor revisi)
                              ↘ DITOLAK_PPTK (vendor revisi)
```

### Kondisi Kendaraan (di Work Order)
```
Vendor submit penawaran/invoice
  → PB input kondisi: Baik / Rusak Ringan / Rusak Berat
  → Disimpan di work_orders.kondisi_kendaraan
  → Saat WO status DIBAYAR → update kendaraan.kondisi_terakhir
```

### BAST
```
WO selesai verifikasi PPTK
  → Generate PDF BAST otomatis dari data sistem
  → Vendor TTD digital (upload atau signature pad)
  → PPTK TTD digital
  → PDF final tersimpan, bisa didownload
```

---

## BACKEND — `sikep-kendi-laravel`

### A. Migration Baru (7 file)

#### 1. `2026_08_03_000001_add_pptk_to_draft_checklists_table.php`
**Tabel:** `draft_checklists`  
**Perubahan:**
- Tambah `pptk_id` (FK → users, nullable)
- Tambah `pptk_at` (timestamp, nullable)
- Tambah `pptk_catatan` (text, nullable)
- Tambah `pptk_alasan_penolakan` (text, nullable)
- Update status enum komentar: `DRAFT, DIKIRIM, DISETUJUI_PB, DITOLAK_PB, DISETUJUI_PPTK, DITOLAK_PPTK`

#### 2. `2026_08_03_000002_add_foto_sebelum_to_work_orders_table.php`
**Tabel:** `work_orders`  
**Perubahan:**
- Tambah `foto_sebelum_pengerjaan_image_id` (FK → images, nullable)
- Tambah `foto_sebelum_at` (timestamp, nullable)
- Tambah `kondisi_kendaraan` (enum: `Baik`, `Rusak Ringan`, `Rusak Berat`, nullable)
- Tambah `kondisi_dinilai_oleh_id` (FK → users, nullable)
- Tambah `kondisi_dinilai_at` (timestamp, nullable)

#### 3. `2026_08_03_000003_add_kondisi_to_kendaraan_table.php`
**Tabel:** `kendaraan`  
**Perubahan:**
- Tambah `kondisi_terakhir` (enum: `Baik`, `Rusak Ringan`, `Rusak Berat`, nullable)
- Tambah `kondisi_updated_at` (timestamp, nullable)

#### 4. `2026_08_03_000004_add_payment_fields_to_vendors_table.php`
**Tabel:** `vendors`  
**Perubahan:**
- Tambah `nama_penerima_tunai` (string, nullable) — untuk metode Tunai
- Tambah `nama_bank` (string, nullable) — untuk GIBS
- Tambah `nomor_rekening` (string, nullable) — untuk GIBS
- Tambah `nama_pemilik_rekening` (string, nullable) — untuk GIBS
- Tambah `qr_code_image_id` (FK → images, nullable) — untuk KKPD

#### 5. `2026_08_03_000005_update_metode_pembayaran_in_pembayaran_table.php`
**Tabel:** `pembayaran`  
**Perubahan:**
- Rename nilai `crm` → `gibs` (update existing rows + kolom comment)
- Tambah kolom `info_pembayaran` (JSON, nullable) — menyimpan snapshot nama penerima/rekening/QR saat pembayaran diproses

#### 6. `2026_08_03_000006_create_bast_table.php`
**Tabel baru:** `bast`  
**Kolom:**
- `id`
- `work_order_id` (FK → work_orders, unique)
- `nomor_bast` (string, unique) — format: `BAST/KENDI/{tahun}/{nomor}`
- `tanggal_bast` (date)
- `vendor_ttd_image_id` (FK → images, nullable)
- `vendor_ttd_at` (timestamp, nullable)
- `pptk_ttd_image_id` (FK → images, nullable)
- `pptk_ttd_at` (timestamp, nullable)
- `pptk_id` (FK → users, nullable)
- `pdf_image_id` (FK → images, nullable) — hasil generate PDF
- `status` (string: `DRAFT`, `VENDOR_SIGNED`, `COMPLETE`)
- `timestamps`

#### 7. `2026_08_03_000007_add_export_columns_to_laporan.php`
Tidak diperlukan tabel baru — export dikerjakan secara query di controller.

---

### B. Model yang Dimodifikasi

#### `app/Models/DraftChecklist.php`
**Perubahan `$fillable`:**
```php
// Tambahkan:
'pptk_id', 'pptk_at', 'pptk_catatan', 'pptk_alasan_penolakan',
```
**Perubahan `$casts`:**
```php
'pptk_at' => 'datetime',
```
**Relasi baru:**
```php
public function pptk(): BelongsTo  // → User
```

#### `app/Models/WorkOrder.php`
**Perubahan `$fillable`:**
```php
// Tambahkan:
'foto_sebelum_pengerjaan_image_id', 'foto_sebelum_at',
'kondisi_kendaraan', 'kondisi_dinilai_oleh_id', 'kondisi_dinilai_at',
```
**Perubahan `$casts`:**
```php
'foto_sebelum_at' => 'datetime',
'kondisi_dinilai_at' => 'datetime',
```
**Relasi baru:**
```php
public function fotoSebelumPengerjaan(): BelongsTo  // → Image
public function kondisiDinilaiOleh(): BelongsTo     // → User
public function bast(): HasOne                      // → Bast
```

#### `app/Models/Kendaraan.php`
**Perubahan `$fillable`:**
```php
// Tambahkan:
'kondisi_terakhir', 'kondisi_updated_at',
```
**Perubahan `$casts`:**
```php
'kondisi_updated_at' => 'datetime',
```

#### `app/Models/Vendor.php`
**Perubahan `$fillable`:**
```php
// Tambahkan:
'nama_penerima_tunai', 'nama_bank', 'nomor_rekening',
'nama_pemilik_rekening', 'qr_code_image_id',
```
**Relasi baru:**
```php
public function qrCodeImage(): BelongsTo  // → Image
```

#### `app/Models/Pembayaran.php`
**Perubahan `$fillable`:**
```php
// Tambahkan:
'info_pembayaran',
```
**Perubahan `$casts`:**
```php
'info_pembayaran' => 'array',
```

---

### C. Model Baru

#### `app/Models/Bast.php`
```php
protected $table = 'bast';
protected $fillable = [
    'work_order_id', 'nomor_bast', 'tanggal_bast',
    'vendor_ttd_image_id', 'vendor_ttd_at',
    'pptk_ttd_image_id', 'pptk_ttd_at', 'pptk_id',
    'pdf_image_id', 'status',
];
// Relations: workOrder, vendorTtdImage, pptkTtdImage, pptk, pdfFile
```

---

### D. Controller yang Dimodifikasi

#### `app/Http/Controllers/Api/DraftChecklistController.php`
**Method baru:**
- `approvePptk(Request $request, $woId, $id)` — PPTK setujui draft checklist
  - Validasi role PPTK
  - Update status → `DISETUJUI_PPTK`, isi `pptk_id`, `pptk_at`, `pptk_catatan`
- `rejectPptk(Request $request, $woId, $id)` — PPTK tolak, vendor bisa revisi
  - Update status → `DITOLAK_PPTK`, isi `pptk_alasan_penolakan`

**Method dimodifikasi:**
- `approvePb` / `store` — pastikan flow status baru berjalan: `DIKIRIM → DISETUJUI_PB` (bukan langsung `DISETUJUI`)

#### `app/Http/Controllers/Api/WorkOrderController.php`
**Method baru:**
- `uploadFotoSebelum(Request $request, $id)` — vendor upload foto sebelum pengerjaan (mandatory)
  - Validasi: file image required
  - Simpan ke images, update `foto_sebelum_pengerjaan_image_id`, `foto_sebelum_at`
- `inputKondisi(Request $request, $id)` — PB input kondisi kendaraan
  - Validasi role PB, status WO sudah ada penawaran/invoice
  - Update `kondisi_kendaraan`, `kondisi_dinilai_oleh_id`, `kondisi_dinilai_at`

**Method dimodifikasi:**
- `show` — include relasi baru: `fotoSebelumPengerjaan`, `bast`, `kondisiDinilaiOleh`

#### `app/Http/Controllers/Api/PembayaranController.php`
**Method dimodifikasi:**
- `proses` — update validasi `metode_pembayaran`: `in:tunai,gibs,kkpd`
  - Saat proses, snapshot info vendor ke kolom `info_pembayaran` (JSON):
    - Tunai: `{ nama_penerima, nama_vendor }`
    - GIBS: `{ nama_bank, nomor_rekening, nama_pemilik_rekening }`
    - KKPD: `{ qr_code_url }`

**Method dimodifikasi:**
- `detail` — include data vendor (rekening/QR) untuk tampilkan di form pembayaran

#### `app/Http/Controllers/Api/VendorController.php`
**Method dimodifikasi:**
- `store` / `update` — tambah validasi dan handle field baru:
  - `nama_penerima_tunai`, `nama_bank`, `nomor_rekening`, `nama_pemilik_rekening`
  - `qr_code_image_id` (upload gambar QR KKPD)
- `show` — include `qrCodeImage` relation

#### `app/Http/Controllers/Api/LaporanController.php`
**Method baru (export Excel server-side):**
- `exportPengajuan(Request $request)` — export daftar pengajuan
- `exportWorkOrder(Request $request)` — export daftar work order
- `exportPembayaran(Request $request)` — export rekap pembayaran
- `exportDaftarBarang(Request $request)` — Daftar Barang Milik Daerah (kendaraan + kondisi)
- `exportHasilPemeliharaan(Request $request)` — Daftar Hasil Pemeliharaan Barang
- `exportKartuPemeliharaan(Request $request, $kendaraanId)` — per kendaraan

**Filter per role** di semua method laporan:
- `admin` — semua data
- `pembantu_pengurus_barang` — data WO yang ditangani
- `pengurus_barang` — semua data operasional
- `pptk` — data keuangan/persetujuan

---

### E. Controller Baru

#### `app/Http/Controllers/Api/BastController.php`
**Methods:**
- `show($woId)` — ambil data BAST untuk WO
- `generate($woId)` — generate PDF BAST dari data WO
  - Auto-isi: nomor BAST, tanggal, data kendaraan, vendor, item pekerjaan, total biaya
  - Gunakan library `barryvdh/laravel-dompdf`
- `uploadVendorTtd(Request $request, $woId)` — vendor upload TTD
- `uploadPptkTtd(Request $request, $woId)` — PPTK upload TTD
- `download($woId)` — download PDF BAST final

---

### F. Routes Baru

#### `routes/api/work-orders.php` — tambahkan:
```php
// Foto sebelum pengerjaan
Route::post('{id}/foto-sebelum', [WorkOrderController::class, 'uploadFotoSebelum']);

// Kondisi kendaraan (oleh PB saat penawaran masuk)
Route::post('{id}/kondisi-kendaraan', [WorkOrderController::class, 'inputKondisi']);

// Draft Checklist — PPTK
Route::post('{woId}/draft-checklist/{id}/approve-pptk', [DraftChecklistController::class, 'approvePptk']);
Route::post('{woId}/draft-checklist/{id}/reject-pptk',  [DraftChecklistController::class, 'rejectPptk']);

// BAST
Route::get('{woId}/bast',                  [BastController::class, 'show']);
Route::post('{woId}/bast/generate',        [BastController::class, 'generate']);
Route::post('{woId}/bast/vendor-ttd',      [BastController::class, 'uploadVendorTtd']);
Route::post('{woId}/bast/pptk-ttd',        [BastController::class, 'uploadPptkTtd']);
Route::get('{woId}/bast/download',         [BastController::class, 'download']);
```

#### `routes/api/laporan.php` — tambahkan:
```php
Route::get('pengajuan',           [LaporanController::class, 'pengajuan']);
Route::get('pengajuan/export',    [LaporanController::class, 'exportPengajuan']);
Route::get('work-order',          [LaporanController::class, 'workOrder']);
Route::get('work-order/export',   [LaporanController::class, 'exportWorkOrder']);
Route::get('pembayaran',          [LaporanController::class, 'pembayaran']);
Route::get('pembayaran/export',   [LaporanController::class, 'exportPembayaran']);
Route::get('daftar-barang',       [LaporanController::class, 'daftarBarang']);
Route::get('daftar-barang/export',[LaporanController::class, 'exportDaftarBarang']);
Route::get('hasil-pemeliharaan',          [LaporanController::class, 'hasilPemeliharaan']);
Route::get('hasil-pemeliharaan/export',   [LaporanController::class, 'exportHasilPemeliharaan']);
Route::get('kartu-pemeliharaan/{id}',        [LaporanController::class, 'kartuPemeliharaan']);
Route::get('kartu-pemeliharaan/{id}/export', [LaporanController::class, 'exportKartuPemeliharaan']);
```

---

### G. Package Baru (composer)

```bash
composer require barryvdh/laravel-dompdf    # generate PDF BAST
composer require maatwebsite/excel           # export Excel server-side
```

---

## FRONTEND — `sikep-kendi-web`

### A. Fitur / Komponen yang Dimodifikasi

#### `src/app/features/draft-checklist/`
**File yang berubah:**
- `draft-checklist-detail.*` — tambah section step PPTK:
  - Jika role PPTK dan status `DISETUJUI_PB`: tampilkan tombol Setujui/Tolak + form catatan
  - Jika status `DITOLAK_PPTK`: tampilkan alasan penolakan dan info vendor bisa revisi
  - Update badge status: `DISETUJUI_PB`, `DITOLAK_PPTK`, `DISETUJUI_PPTK`

#### `src/app/features/work-orders/`
**File yang berubah:**
- `work-order-detail.*` — tambah:
  - Section "Foto Sebelum Pengerjaan" (vendor view): upload mandatory, blokir lanjut jika belum ada
  - Section "Kondisi Kendaraan" (PB view): dropdown Baik/Rusak Ringan/Rusak Berat, muncul saat ada penawaran masuk
  - Section "BAST": tombol generate, lihat status TTD vendor & PPTK, tombol download PDF

#### `src/app/features/penawaran/`
**File yang berubah:**
- `penawaran-detail.*` / `penawaran-list.*` — setelah vendor submit penawaran/invoice:
  - Trigger notifikasi ke PB untuk input kondisi kendaraan

#### `src/app/features/pembayaran/`
**File yang berubah:**
- `pembayaran-form.*` — update UI metode pembayaran:
  - Radio: **Tunai** / **GIBS** / **KKPD**
  - Tunai: tampilkan nama penerima dari data vendor (read-only)
  - GIBS: tampilkan nama bank, nomor rekening, nama pemilik (read-only dari vendor)
  - KKPD: tampilkan gambar QR dari data vendor

#### `src/app/features/admin/vendor/`
**File yang berubah:**
- `vendor-form.*` — tambah section "Informasi Pembayaran":
  - Field: Nama Penerima Tunai
  - Field: Nama Bank
  - Field: Nomor Rekening
  - Field: Nama Pemilik Rekening
  - Upload QR KKPD (image)

#### `src/app/features/laporan/`
**File yang berubah (semua halaman laporan):**
- Tambah tombol **Export Excel** di header setiap halaman laporan
- Filter akses berdasarkan role (hide menu laporan yang tidak relevan)
- Halaman baru: `laporan-daftar-barang` — Daftar Barang Milik Daerah dengan kolom kondisi kendaraan
- Halaman baru: `laporan-hasil-pemeliharaan` — Daftar Hasil Pemeliharaan Barang

#### `src/app/features/vehicles/`
**File yang berubah:**
- `vehicle-detail.*` — tampilkan field `kondisi_terakhir` (read-only, update otomatis)
- `vehicle-list.*` — tambah kolom kondisi di tabel

---

### B. Komponen Baru

#### `src/app/features/bast/`
File baru:
- `bast-detail.component.ts/html` — view detail BAST, status TTD, tombol generate & download
- `bast.routes.ts`

---

### C. API Adapters (Port/Adapter)

File yang perlu diupdate di `src/app/api/` dan `src/app/ports/`:

| Port/Adapter | Perubahan |
|---|---|
| `draft-checklist.port.ts` | Tambah method `approvePptk`, `rejectPptk` |
| `draft-checklist.api.ts` | Implementasi POST ke endpoint baru |
| `work-order.port.ts` | Tambah `uploadFotoSebelum`, `inputKondisi` |
| `work-order.api.ts` | Implementasi endpoint baru |
| `vendor.port.ts` | Tambah field payment info |
| `vendor.api.ts` | Update request/response shape |
| `pembayaran.port.ts` | Update shape metode: `tunai/gibs/kkpd` + `infoPembayaran` |
| `pembayaran.api.ts` | Update validasi & mapping |
| `laporan.port.ts` | Tambah semua method export & laporan baru |
| `laporan.api.ts` | Implementasi GET endpoint export (return blob untuk download) |
| `bast.port.ts` | **BARU** — generate, uploadTtd, download |
| `bast.api.ts` | **BARU** — implementasi |

---

### D. NGXS State

File yang perlu diupdate di `src/app/core/state/` atau `src/app/features/*/state/`:

| State | Perubahan |
|---|---|
| `draft-checklist.state.ts` | Tambah action: `ApprovePptkDraftChecklist`, `RejectPptkDraftChecklist` |
| `work-order.state.ts` | Tambah action: `UploadFotoSebelum`, `InputKondisiKendaraan` |
| `vendor.state.ts` | Update model dengan field payment |
| `pembayaran.state.ts` | Update model metode pembayaran |
| `laporan.state.ts` | Tambah action export per laporan |

---

### E. Routing

#### `src/app/app.routes.ts` — tambahkan:
```typescript
{
  path: 'work-orders/:id/bast',
  loadComponent: () => import('./features/bast/bast-detail.component')
}
```

#### Permission guard — tambahkan permission baru:
- `bast.generate`
- `bast.sign`
- `bast.download`
- `laporan.daftar-barang`
- `laporan.hasil-pemeliharaan`

---

## Urutan Pengerjaan

### Phase 1 — Database & Model (Backend)
1. Buat 6 migration baru
2. Update model: `DraftChecklist`, `WorkOrder`, `Kendaraan`, `Vendor`, `Pembayaran`
3. Buat model baru: `Bast`
4. Jalankan `php artisan migrate`

### Phase 2 — Controller & Routes (Backend)
5. Install package: `dompdf`, `maatwebsite/excel`
6. Update `DraftChecklistController` — method PPTK
7. Update `WorkOrderController` — foto sebelum + kondisi kendaraan
8. Update `PembayaranController` — metode GIBS/KKPD
9. Update `VendorController` — field payment
10. Update `LaporanController` — semua export Excel
11. Buat `BastController` — generate PDF + TTD
12. Update routes `work-orders.php` + `laporan.php`

### Phase 3 — Frontend API Layer
13. Update semua port & adapter yang terdampak
14. Update NGXS state & actions

### Phase 4 — Frontend UI
15. Draft Checklist — step PPTK
16. Work Order — foto sebelum & kondisi kendaraan
17. Pembayaran — UI Tunai/GIBS/KKPD
18. Vendor form — info pembayaran
19. BAST — halaman baru
20. Laporan — tombol export Excel + halaman baru
21. Vehicles — tampilkan kondisi terakhir

### Phase 5 — Testing & Bugfix
22. Test alur end-to-end per fitur
23. Fix bug `jenis` di `DraftChecklistItem.$fillable` (sudah ada migration `2026_07_31`)

---

## Catatan Teknis

- **BAST PDF**: gunakan `barryvdh/laravel-dompdf`, template Blade di `resources/views/pdf/bast.blade.php`
- **Export Excel**: gunakan `maatwebsite/excel` dengan class terpisah per laporan di `app/Exports/`
- **QR KKPD**: disimpan sebagai image di tabel `images` via endpoint upload yang sudah ada (`/api/images`)
- **Kondisi Kendaraan**: update `kendaraan.kondisi_terakhir` dilakukan di event/observer saat `pembayaran.status` berubah ke `LUNAS` — bukan langsung di controller pembayaran
- **Rename crm → gibs**: buat migration yang mengupdate data existing di tabel `pembayaran` sebelum rename enum
