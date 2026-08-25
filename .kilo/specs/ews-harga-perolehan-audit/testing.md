# How to Test — Semua Fitur Sprint EWS

Prasyarat:
- Backend jalan (`php artisan serve` / vhost XAMPP), frontend `npm start`
- Login sesuai role yang disebut per skenario
- Untuk uji push browser: izinkan notifikasi saat app diminta, pastikan console browser ada log `registerToken`

---

## A. Yang Sudah Terverifikasi Otomatis (tidak perlu diulang)

| Uji | Hasil |
|---|---|
| Migrasi SQLite (rebuild komponen, km nullable) | ✅ |
| Syntax PHP 14 file | ✅ |
| `schedule:list` → `ews:dispatch-reminders` 07:00 WIB | ✅ |
| Dry-run: 8 evaluator jalan, temuan sesuai data uji | ✅ |
| Dedup IN_APP (re-run tidak menambah baris) | ✅ |
| OAuth2 Google dengan service account JSON | ✅ OAUTH_OK |
| Push FCM nyata ke device user 7 (tanpa error/prune) | ✅ |
| AuditService hash-chain konsisten | ✅ |
| `ng build` sukses | ✅ |

## B. Test Manual Per Fitur

### F1 + F2 — Harga Perolehan & Fix Tanggal Pajak/STNK
1. Login sebagai **PB** → menu Vehicles → edit salah satu kendaraan
2. Isi **Tanggal Habis Pajak**, **Tanggal Habis STNK**, dan **Harga Perolehan** → Simpan
3. Buka lagi form edit kendaraan yang sama (atau refresh halaman detail)
4. ✅ **Ketiga nilai tetap terisi** — ini reproduksi bug #2; sebelumnya tanggal hilang setelah simpan

### F3 — EWS Engine
1. **Lihat temuan tanpa kirim**: `php artisan ews:dispatch-reminders --dry-run`
2. **Kirim sungguhan**: `php artisan ews:dispatch-reminders`
   - Cek inbox notifikasi di aplikasi (ikon bell): muncul "Pajak Kendaraan Akan Habis …"
   - Browser yang login sbg penerima + permission granted → toast/notif OS muncul
3. **Uji push kapan pun tanpa dedup** (tinker):
   ```bash
   php artisan tinker --execute="app(App\Services\FcmService::class)->sendToUsers([7], 'Tes Push', 'Halo dari EWS', ['entityKind' => 'kendaraan']);"
   ```
   Ganti `[7]` dengan user id pemilik token lain.
4. **Uji gate config**: Admin → Early Warning Config → nonaktifkan trigger `pajak_kendaraan` → dry-run → temuan pajak hilang. Aktifkan lagi.
5. **Reminder harian otomatis** hanya lewat cron cPanel (lokal cukup jalankan manual).

### F4 — Komponen Otomatis dari SHS (checkbox)
1. **Admin** → SHS Master → edit satu item → isi **Umur Estimasi (bulan)** = `12` → Simpan
   - Kolom "Umur (bln)" di tabel menampilkan nilai
2. **PB** → buka WO berstatus DRAFT_CHECKLIST (yang punya draft checklist item spare part)
3. Di editor SHS: pilih SHS master tsb pada satu baris, set Jenis = **Spare Part**
   - ✅ Checkbox kolom **EWS** otomatis tercentang
   - Ganti jenis ke "Jasa" → checkbox auto-uncheck & disabled
4. Klik **Simpan SHS** → dialog konfirmasi muncul menyebut jumlah item yang jadi komponen (sekaligus test F5)
5. Lanjutkan alur sampai **Bendahara upload bukti bayar** → WO menjadi DIBAYAR
6. Verifikasi hasil:
   - Detail kendaraan → daftar komponen: ada baris baru `tanggal_pasang` hari ini, `km_ganti_estimasi` kosong
   - Dashboard EWS: komponen tsb ikut terhitung
7. **Uji pasang ulang**: ulangi alur dengan nama item sama → baris komponen tidak duplikat, `tanggal_pasang` ter-reset

### F5 — Dialog Konfirmasi Simpan SHS
- Di editor SHS tekan "Simpan SHS" → **Batal** pada dialog → pastikan TIDAK ada request POST ke server (tab Network)
- Accept → request terkirim & toast sukses

### F6 — Search SHS Master
- `/admin/shs-master` → ketik potongan kode/nama item → tabel terfilter realtime lintas halaman pagination

### F7 — Audit Trail
1. Logout → coba login **salah password** sekali → lalu login benar
2. `GET {{api}}/audit-logs` (atau halaman audit admin jika ada) → muncul baris `LOGIN_GAGAL` dan `LOGIN_SUAKSES`
3. Edit sebuah kendaraan → muncul `KENDARAAN_DIUBAH` dengan before/after
4. Bayarkan WO → muncul `PEMBAYARAN_DIBAYAR`; ubah config EWS → `KONFIG_EWS_DIUBAH`

---

## C. Checklist Deploy cPanel

1. Pull kode → `php artisan migrate` (migrasi idempotent, aman re-run)
2. Upload `service-account.json` — detail lengkap lihat §D
3. `.env` produksi — pakai **path relatif** (tidak perlu tahu path absolut):
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON=storage/app/firebase/service-account.json
   ```
4. Cron cPanel (per menit):
   ```
   * * * * * cd /home/<user>/<path-project> && php artisan schedule:run >> /dev/null 2>&1
   ```
5. Smoke test server:
   ```bash
   php artisan config:clear
   php artisan tinker --execute="Cache::forget('fcm_access_token'); $m=new ReflectionMethod(app(App\Services\FcmService::class),'accessToken'); $m->setAccessible(true); var_dump($m->invoke(app(App\Services\FcmService::class)) ? 'OAUTH_OK' : 'OAUTH_FAIL');"
   ```
6. Opsional: `php artisan migrate-from-prisma` bila ingin audit historis lama
7. Keamanan: revoke service account key `fatur-gautama` yang pernah tersebar

## D. Upload Service Account JSON ke cPanel (FileZilla)

### D.1 Pastikan root FileZilla = project live

Akun FTP `sikepapi@disperindag...` adalah **directory-scoped account** — saat connect,
FileZilla langsung berada di dalam suatu folder tanpa terlihat `/home/...`. Verifikasi
dulu bahwa scope-nya benar-benar folder project Laravel yang live:

```
✅ Harus terlihat di root:  artisan  composer.json  .env  app/  public/  storage/  routes/
❌ Kalau tidak ada → akun FTP menunjuk folder yang salah.
   Cari project lewat File Manager cPanel utama (login cPanel, bukan FTP sub-account).
```

### D.2 Buat folder & upload file

1. Di panel **Remote site** FileZilla: masuk ke `storage/app/`
2. Klik kanan → **Create directory** → beri nama `firebase`
3. Masuk ke `storage/app/firebase/`
4. Drag-and-drop file lokal:
   ```
   C:\Users\fatur\Documents\sikep-kendi-laravel\storage\app\firebase\service-account.json
   ```
   (pastikan yang di-upload adalah file project **sikep-kendi** — nama unduhanannya
   berawalan `sikep-kendi-firebase-adminsdk-...`, BUKAN `fatur-gautama-...`)

### D.3 Set permission `600`

**Cara FileZilla:**
1. Klik kanan `service-account.json` di panel remote → **File permissions...**
2. Isi Numeric value: **600** (Owner: Read+Write; Group/Others: kosong semua)
3. OK

**Cara cPanel File Manager (alternatif):**
1. Navigasi ke `<project>/storage/app/firebase/`
2. Klik kanan file → **Change Permissions**
3. Centang hanya **Read + Write** untuk Owner → Save

Kenapa penting: permission longgar (644/664) membuat user lain di shared hosting
berpotensi membaca kredensial. `600` membatasi ke owner saja.

### D.4 Isi `.env` di server

```env
FIREBASE_SERVICE_ACCOUNT_JSON=storage/app/firebase/service-account.json
```

Path relatif otomatis di-resolve `FcmService` terhadap root project (`base_path()`),
jadi tidak perlu tahu path absolut `/home/...`. Path absolut Linux (`/home/...`) juga
tetap diterima bila suatu saat dibutuhkan.

Lalu jalankan:
```bash
php artisan config:clear && php artisan optimize:clear
```

### D.5 Hal yang TIDAK boleh dilakukan

- ❌ Menaruh JSON di dalam folder `public/` — bisa diakses publik via URL
- ❌ Commit file JSON ke git (lokal sudah digitignore via `storage/app/firebase`)
- ❌ Memakai path relatif dengan awalan `/` (itu dianggap absolut oleh resolver)
- ❌ Rename/move file setelah `.env` mengacu padanya — kalau rotate key di Firebase
  Console, cukup replace isi file di path yang sama
