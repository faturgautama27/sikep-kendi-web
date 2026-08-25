# Tasks: EWS Engine, Harga Perolehan, Komponen SHS, dan Audit Trail

Legend: `[R#]` referensi acceptance criteria di requirements.md · Backend = `sikep-kendi-laravel` · Frontend = `sikep-kendi-web`

## 1. Fondasi Skema

- [ ] 1.1 Buat migration `2026_08_25_000001_ews_and_harga_perolehan.php`: `kendaraan.harga_perolehan` decimal(15,2) nullable, `standar_harga_satuan.umur_estimasi_bulan` unsignedInt nullable, `shs_items.jadikan_komponen` boolean default false, `komponen.km_ganti_estimasi` jadi nullable via `DB::statement(ALTER ... MODIFY)` [R-F4.3]
- [ ] 1.2 Jalankan `php artisan migrate` dan verifikasi kolom via tinker/SHOW COLUMNS
- [ ] 1.3 Update model: `Kendaraan` (fillable+cast harga_perolehan), `StandarHargaSatuan`, `ShsItem`, `Komponen` fillable

## 2. Fitur Harga Perolehan + Fix Tanggal (F1, F2)

- [ ] 2.1 `VehicleController`: validasi `hargaPerolehan => nullable|numeric|min:0` di store & update; mapping ke kolom; output di `formatKendaraan()` [R-F1.2, R-F1.4]
- [ ] 2.2 Frontend: `api-vehicle.data.ts` — tambah `tanggalHabisPajak/tanggalHabisSTNK/hargaPerolehan` ke `ApiVehicle` + passthrough di `mapVehicle()` [R-F2.1, R-F2.2]
- [ ] 2.3 Frontend: `vehicle.ts` model += `hargaPerolehan?: number | null`
- [ ] 2.4 Frontend: vehicle-form component — control `hargaPerolehan` (p-inputnumber currency IDR), patchForm, payload, input di template [R-F1.1]
- [ ] 2.5 Verifikasi manual: simpan kendaraan dengan pajak/STNK/harga → reload → nilai kembali terisi

## 3. EWS Engine — Command & Evaluators (F3-A)

- [ ] 3.1 Buat `app/Console/Commands/DispatchEwsReminders.php` dengan signature `ews:dispatch-reminders {--dry-run}` dan struktur TRIGGER_MAP evaluator→method
- [ ] 3.2 Implement evaluator `servis_berkala` (hari & km variant, skip NONAKTIF & tanpa riwayat) [R-F3A.1]
- [ ] 3.3 Implement evaluator `komponen_umur` & `komponen_km` [R-F3A.2, R-F3A.3]
- [ ] 3.4 Implement evaluator `pajak_kendaraan` & `stnk` [R-F3A.4, R-F3A.5]
- [ ] 3.5 Implement evaluator `pengajuan_stuck` (hari kerja, skip Sabtu/Minggu) [R-F3A.6]
- [ ] 3.6 Implement evaluator `pagu_kendaraan` tier 75/90/100% [R-F3A.7]
- [ ] 3.7 Implement evaluator `rkbmd_belum_realisasi` (deadline akhir bulan_rencana) [R-F3A.8]
- [ ] 3.8 Semua evaluator gate oleh `EarlyWarningConfig` (`is_active` + ambang; fallback default bila null)
- [ ] 3.9 Output temuan: dedupKey stabil `{trigger}:{entityId}`, recipientIds pengemudi+PB, title/message Indonesia berisi konteks (nomor polisi/nama komponen/angka sisa)
- [ ] 3.10 Mode `--dry-run`: tampilkan tabel temuan tanpa menulis/mengirim [R-F3C.6]
- [ ] 3.11 Uji lokal: seed data uji per trigger → `--dry-run` → hasil sesuai ekspektasi

## 4. FCM Push (F3-C)

- [ ] 4.1 Tambah blok `firebase` di `config/services.php` + placeholder `.env.example` [R-F3C.2]
- [ ] 4.2 Buat `app/Services/FcmService.php`: JWT RS256 → OAuth2 token cache 3000s → POST HTTP v1 per token → prune token UNREGISTERED/INVALID/NOT_FOUND [R-F3C.2, R-F3C.3]
- [ ] 4.3 Integrasi command: setelah IN_APP dispatch, fan-out FCM dengan `data.entityKind`; kegagalan FCM tidak menggagalkan IN_APP [R-F3C.1, R-F3C.4]
- [ ] 4.4 Daftarkan schedule di `Kernel.php`: `dailyAt('07:00')->timezone('Asia/Jakarta')`; dokumentasikan baris cron cPanel di design/deploy notes [R-F3C.7]

## 5. Trigger On-event SPAREPART_BERULANG (F3-B)

- [ ] 5.1 `PengajuanController::checkEarlyWarnings()`: tambahkan cek shs_items "spare part" dari WO DIBAYAR kendaraan sama ≤ ambang_hari yang cocok deskripsi → append warning text [R-F3B.10]
- [ ] 5.2 Uji: buat pengajuan duplikatif < 90 hari → warning muncul pada respons/detail pengajuan

## 6. Komponen dari SHS Checkbox (F4)

- [ ] 6.1 Backend `ShsMasterController`: validasi+map `umurEstimasiBulan` store/update [R-F4.1]
- [ ] 6.2 Backend `VerifikasiController::shs`: validasi `items.*.jadikanKomponen => nullable|boolean`, simpan kolom [R-F4.2]
- [ ] 6.3 Backend `PembayaranController::bukti()`: dalam transaksi, upsert Komponen untuk item tercentang (normalisasi lower-trim matching; reset tanggal_pasang bila pasang ulang; km NULL) [R-F4.3, R-F4.4]
- [ ] 6.4 Backend `VehicleController`: validation `kmGantiEstimasi` nullable di create/update komponen
- [ ] 6.5 Frontend port/api: `ShsItemInput.jadikanKomponen?` + pass-through `saveShsMapping`
- [ ] 6.6 Frontend `work-order-detail.component.ts`: options += `umurEstimasiBulan`; auto-set/reset checkbox saat master dipilih; payload ikut
- [ ] 6.7 Frontend template editor SHS: kolom checkbox "EWS" disabled bila bukan spare part/master tanpa umur + tooltip [R-F4.2]
- [ ] 6.8 Verifikasi end-to-end: mapping SHS → centang → bayar WO → row komponen benar → muncul di dashboard EWS [R-F4.5]

## 7. Dialog Konfirmasi Simpan SHS (F5)

- [ ] 7.1 `work-order-detail.component.ts`: injeksi `ConfirmationService`; `saveShsMapping()` menampilkan confirm berisi ringkasan item & jumlah jadi-komponen; accept → dispatch asli [R-F5.1]
- [ ] 7.2 Cancel dialog tidak mengirim request [R-F5.2]

## 8. Search SHS Master (F6)

- [ ] 8.1 Template list: search input + `#dt` pada p-table + `filterGlobal($event,'contains')` realtime [R-F6.1]

## 9. Admin SHS Master Umur (UI)

- [ ] 9.1 `shs-master.ts` model += `umurEstimasiBulan?`; api-shs-master.data payload += umur
- [ ] 9.2 Dialog form admin += input "Umur Estimasi (bulan)"; opsional kolom umur di tabel list

## 10. Audit Trail Writer (F7)

- [ ] 10.1 Buat `app/Services/AuditService.php`: hash chain sha256(prev‖payload), canonical JSON SORT_KEYS, retry 1× unique violation, swallow Throwable + log [R-F7.1, R-F7.3]
- [ ] 10.2 Panggilan di AuthController (login sukses/gagal) [R-F7.2]
- [ ] 10.3 Panggilan di VehicleController (store/update/retire/komponen CUD) [R-F7.2]
- [ ] 10.4 Panggilan di PengajuanController & WorkOrderController (create/transisi status) [R-F7.2]
- [ ] 10.5 Panggilan di VerifikasiController, PembayaranController, EarlyWarningController::updateConfig [R-F7.2]
- [ ] 10.6 Verifikasi: beberapa aksi mutating → `GET /audit-logs` mengembalikan baris baru; hash chain berurutan konsisten [R-F7.4]

## 11. Verifikasi Akhir

- [ ] 11.1 `php artisan migrate:fresh --seed` lokal lalu jalankan seluruh alur smoke test utama
- [ ] 11.2 `php artisan ews:dispatch-reminders` penuh (non-dry-run) → notifikasi masuk inbox + push toast web
- [ ] 11.3 `npm run build` frontend sukses (type check)
- [ ] 11.4 Siapkan checklist deploy cPanel: migrate, isi env FIREBASE_*, pasang baris cron, (opsional) MigrateFromPrisma untuk audit historis

## Catatan Eksekusi

- Urutan dependency: 1 → (2,3,4,5,6 backend) → frontend (6-9) → 10 → 11
- Tanpa commit sampai diminta; setiap kelompok diverifikasi sebelum lanjut
