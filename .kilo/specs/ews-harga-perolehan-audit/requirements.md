# Spek: EWS Engine, Harga Perolehan, Komponen SHS, dan Audit Trail

Tanggal: 2026-08-25 · Repo: `sikep-kendi-laravel` (backend) + `sikep-kendi-web` (frontend)

## Ringkasan Scope

| # | Fitur | Prioritas |
|---|-------|-----------|
| F1 | Harga Perolehan Awal kendaraan | Sedang |
| F2 | Bug fix: tanggal pajak/STNK hilang setelah simpan | Tinggi |
| F3 | EWS Engine lengkap 10 trigger + scheduler cPanel + FCM push | Tinggi |
| F4 | Komponen otomatis dari item SHS via checkbox PB | Sedang |
| F5 | Dialog konfirmasi Simpan SHS | Rendah |
| F6 | Search filter halaman SHS Master | Rendah |
| F7 | Audit trail writer (fix audit-logs kosong di produksi) | Sedang |

---

## F1 — Harga Perolehan Awal

**User story**: Sebagai PB, saya ingin mencatat harga perolehan awal kendaraan agar nilai aset terdokumentasi.

**Acceptance criteria**

1. **WHEN** PB membuka form tambah/edit kendaraan, **THE SYSTEM SHALL** menampilkan input angka format mata uang IDR bernama "Harga Perolehan (Rp)" yang boleh dikosongi.
2. **WHEN** form disimpan dengan harga terisi, **THE SYSTEM SHALL** menyimpan nilai ke kolom `kendaraan.harga_perolehan` (decimal 15,2).
3. **WHEN** detail kendaraan dimuat setelah simpan, **THE SYSTEM SHALL** menampilkan harga perolehan yang sama dengan yang disimpan (persisten setelah reload).
4. **IF** harga tidak diisi, **THE SYSTEM SHALL** menyimpan `NULL` dan tidak menampilkan error.

## F2 — Fix Tanggal Pajak/STNK

**User story**: Sebagai PB, saya ingin tanggal habis pajak & STNK yang saya simpan tetap tampil, tidak hilang.

**Acceptance criteria**

1. **WHEN** PB menyimpan tanggal habis pajak/STNK lalu halaman direfresh atau kendaraan diambil ulang dari API, **THE SYSTEM SHALL** mengisi kembali kedua field form dengan nilai dari database.
2. **THE SYSTEM SHALL** memetakan `tanggalHabisPajak`, `tanggalHabisSTNK`, dan `hargaPerolehan` dari respons API ke state aplikasi melalui `mapVehicle()`.

## F3 — EWS Engine (10 Trigger)

**User story**: Sebagai PB/pengemudi, saya ingin menerima peringatan dini otomatis (in-app + push) untuk kondisi kendaraan dan proses yang mendekati/melewati ambang batas, sesuai konfigurasi admin.

**Sumber konfigurasi**: tabel `early_warning_configs` (dikelola via `/admin` — Early Warning Config). Setiap trigger dinonaktifkan bila `is_active=false`.

### A. Trigger terjadwal (command harian 07:00 WIB)

1. **servis_berkala** — **WHEN** `hari_ini >= (tanggal paid_at WO DIBAYAR terakhir + interval_servis_hari)` **ATAU** `odometer_saat_ini >= odometer_servis_terakhir + interval_servis_km`, **THE SYSTEM SHALL** mengirim peringatan. Ambang default H-7 bila `ambang_hari` config kosong. Kendaraan NONAKTIF dan tanpa riwayat servis dilewati.
2. **komponen_umur** — **WHEN** sisa umur komponen ≤ `ambang_bulan` (default logika: umur vs `umur_estimasi_bulan` sejak `tanggal_pasang`), **THE SYSTEM SHALL** mengirim peringatan.
3. **komponen_km** — **WHEN** `km_ganti_estimasi − odometer_saat_ini ≤ ambang_km` (baris dengan `km_ganti_estimasi` NULL dilewati), **THE SYSTEM SHALL** mengirim peringatan.
4. **pajak_kendaraan** — **WHEN** `tanggal_habis_pajak` tinggal ≤ `ambang_hari` (30) hari, **THE SYSTEM SHALL** mengirim peringatan.
5. **stnk** — idem untuk `tanggal_habis_stnk`, ambang 60 hari.
6. **pengajuan_stuck** — **WHEN** pengajuan berstatus `MENUNGGU_VERIFIKASI` lebih lama dari `ambang_hari` (3) **hari kerja** (Sabtu/Minggu tidak dihitung), **THE SYSTEM SHALL** mengirim peringatan.
7. **pagu_kendaraan** — **WHEN** akumulasi `total_dibayar` WO DIBAYAR tahun berjalan mencapai ≥75% / ≥90% / ≥100% dari `pagu_tahunan`, **THE SYSTEM SHALL** mengirim peringatan per tier yang tercapai.
8. **rkbmd_belum_realisasi** — **WHEN** item RKBMD tahun berjalan belum realisasi dan akhir `bulan_rencana` tinggal ≤ `ambang_hari` (14) hari atau sudah lewat, **THE SYSTEM SHALL** mengirim peringatan.

### B. Trigger on-event (saat buat pengajuan)

9. **PENGAJUAN_TERLALU_CEPAT** — sudah terimplementasi; **SHALL NOT** berubah perilaku.
10. **SPAREPART_BERULANG** — **WHEN** pengajuan baru dibuat dan deskripsi/item cocok dengan `shs_items` jenis "spare part" dari WO DIBAYAR kendaraan yang sama dalam `ambang_hari` (90) hari terakhir, **THE SYSTEM SHALL** menambahkan teks peringatan pada hasil pembuatan pengajuan (pola existing `checkEarlyWarnings`).

### C. Mekanisme pengiriman

1. **THE SYSTEM SHALL** menulis notifikasi IN_APP via `NotificationService::dispatch` dengan `dedupKey` stabil `{trigger}:{entity_id}` sehingga window dedup 24 jam menjadikan pengiriman maksimal 1×/hari per entitas per trigger.
2. **THE SYSTEM SHALL** mengirim push FCM HTTP v1 ke semua `device_tokens` milik penerima, dengan payload `data.entityKind` agar frontend me-reload state terkait.
3. **IF** token FCM ditolak permanen (unregistered/invalid), **THE SYSTEM SHALL** menghapus token tersebut dari database.
4. **IF** penerima tidak memiliki device token, **THE SYSTEM SHALL** tetap mengirim notifikasi IN_APP.
5. Penerima: pengemudi terdaftar pada kendaraan (bila ada) + semua user role `pengurus_barang`.
6. **WHEN** command dijalankan dengan `--dry-run`, **THE SYSTEM SHALL** hanya mencetak daftar temuan tanpa menulis notifikasi atau mengirim push.
7. **THE SYSTEM SHALL** dapat dijadwalkan via cron cPanel (`schedule:run` tiap menit, command dailyAt 07:00 Asia/Jakarta).

## F4 — Komponen Otomatis dari Item SHS (Checkbox Manual)

1. **WHEN** admin mengelola SHS Master, **THE SYSTEM SHALL** menyediakan input opsional "Umur Estimasi (bulan)" yang tersimpan di `standar_harga_satuan.umur_estimasi_bulan`.
2. **WHEN** PB memetakan item SHS pada WO, **THE SYSTEM SHALL** menampilkan checkbox "Jadikan Komponen (EWS)" per baris yang **hanya aktif** bila item bertipe "spare part" DAN SHS master terpilih memiliki umur estimasi.
3. **WHEN** pembayaran WO dikonfirmasi (status menjadi DIBAYAR), **THE SYSTEM SHALL** membuat baris `komponen` untuk setiap item tercentang: `nama_komponen`=nama item, `tanggal_pasang`=waktu pembayaran, `umur_estimasi_bulan`=umur master, `km_ganti_estimasi`=NULL.
4. **IF** komponen dengan nama sama sudah ada pada kendaraan tersebut, **THE SYSTEM SHALL** memperbarui (bukan menduplikasi): reset `tanggal_pasang` dan umur.
5. **WHEN** komponen baru tercipta, dashboard EWS existing **SHALL** otomatis memperhitungkannya tanpa perubahan tambahan.

## F5 — Konfirmasi Simpan SHS

1. **WHEN** PB menekan tombol "Simpan SHS", **THE SYSTEM SHALL** menampilkan dialog konfirmasi berisi ringkasan jumlah item dan jumlah item yang akan menjadi komponen.
2. **IF** PB membatalkan dialog, **THE SYSTEM SHALL** tidak mengirim apa pun ke server.

## F6 — Search SHS Master

1. **WHEN** admin mengetik pada kolom pencarian halaman SHS Master, **THE SYSTEM SHALL** memfilter baris secara realtime berdasarkan kode dan nama item (client-side, kolom apapun halaman pagination).

## F7 — Audit Trail Writer

**User story**: Sebagai admin, saya ingin endpoint `GET /audit-logs` menampilkan jejak audit aktual di produksi.

**Konteks bug**: tabel `audit_logs` tidak pernah ditulis oleh kode manapun; data lokal hanya warisan `MigrateFromPrisma`. Produksi fresh → kosong.

1. **THE SYSTEM SHALL** menyediakan `AuditService->log(actor, action, entity, entityId, before, after)` yang menulis baris dengan rantai hash: `hash = sha256(prev_hash ‖ canonical_json(payload))` dan `prev_hash` = hash baris terakhir.
2. **THE SYSTEM SHALL** mencatat aksi mutating penting minimal pada: login sukses/gagal, CRUD kendaraan, buat/update pengajuan & perubahan statusnya, transisi status WO, verifikasi harga/SHS, pembayaran (proses & bukti), perubahan config EWS.
3. **WHEN** penulisan audit gagal (mis. race condition unique hash), **THE SYSTEM SHALL** mencoba sekali lagi lalu menyerah tanpa membatalkan operasi bisnis utama.
4. **WHEN** `GET /audit-logs` dipanggil di lingkungan mana pun setelah fitur aktif, **THE SYSTEM SHALL** mengembalikan baris-baris aksi nyata (data historis pra-fitur tetap hanya dari migrasi lama).
