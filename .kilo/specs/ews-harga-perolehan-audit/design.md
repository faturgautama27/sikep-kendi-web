# Design: EWS Engine, Harga Perolehan, Komponen SHS, dan Audit Trail

## 1. Arsitektur EWS (F3)

```
cPanel cron (*/1 menit)
   │  php artisan schedule:run
   ▼
Console/Kernel::schedule ──► dailyAt('07:00', Asia/Jakarta)
                               │
                               ▼
              ews:dispatch-reminders [--dry-run]
                               │
        ┌──────────────────────┼───────────────────────────┐
        ▼                      ▼                           ▼
  EarlyWarningConfig      Evaluators (1 method       NotificationService
  (is_active + ambang)    per trigger_type)          ::dispatch (IN_APP, dedup 24h)
                                                          │
                                                          ▼
                                                     FcmService
                                              (HTTP v1, JWT RS256, cache token)
                                                          │
                                            device_tokens (web + android)
```

On-event `SPAREPART_BERULANG` tidak lewat scheduler — ditambahkan di
`PengajuanController::checkEarlyWarnings()` (pola existing, output teks warning).

## 2. Komponen Baru / Diubah

### Backend (`sikep-kendi-laravel`)

| File | Aksi | Isi |
|---|---|---|
| `database/migrations/2026_08_25_000001_...php` | baru | 4 perubahan skema (lihat §3) |
| `app/Console/Commands/DispatchEwsReminders.php` | baru | Command `ews:dispatch-reminders`, evaluator per trigger |
| `app/Services/FcmService.php` | baru | Sender FCM HTTP v1 minimal |
| `app/Services/AuditService.php` | baru | Writer audit berantai hash |
| `app/Console/Kernel.php` | edit | registrasi schedule |
| `app/Models/Kendaraan.php` | edit | fillable+cast `harga_perolehan` |
| `app/Models/StandarHargaSatuan.php` | edit | fillable `umur_estimasi_bulan` |
| `app/Models/ShsItem.php` | edit | fillable `jadikan_komponen` |
| `app/Http/Controllers/Api/VehicleController.php` | edit | validasi+map hargaPerolehan; komponen validation `kmGantiEstimasi` nullable |
| `app/Http/Controllers/Api/ShsMasterController.php` | edit | validasi+map `umurEstimasiBulan` |
| `app/Http/Controllers/Api/VerifikasiController.php` | edit | validasi `items.*.jadikanKomponen`; simpan kolom |
| `app/Http/Controllers/Api/PembayaranController.php` | edit | hook upsert komponen dalam transaksi `bukti()`; panggilan AuditService |
| `app/Http/Controllers/Api/PengajuanController.php` | edit | trigger SPAREPART_BERULANG; AuditService |
| Controller lain yang menyentuh aksi penting | edit | panggilan `AuditService->log(...)` |
| `config/services.php` + `.env.example` | edit | blok `firebase` (project_id, client_email, private_key) |

### Frontend (`sikep-kendi-web`)

| File | Aksi | Isi |
|---|---|---|
| `src/app/core/data-access/api/api-vehicle.data.ts` | edit | **F2 fix**: ApiVehicle += `tanggalHabisPajak/tanggalHabisSTNK/hargaPerolehan`; mapVehicle passthrough |
| `src/app/shared/models/vehicle.ts` | edit | `hargaPerolehan?: number \| null` |
| `src/app/features/vehicles/vehicle-form.component.ts/.html` | edit | control + input currency harga perolehan |
| `src/app/core/data-access/ports/work-order-data.port.ts` | edit | `ShsItemInput.jadikanKomponen?: boolean` |
| `src/app/core/data-access/api/api-work-order.data.ts` | edit | pass-through field |
| `src/app/features/work-orders/work-order-detail.component.ts/.html` | edit | kolom checkbox EWS, options += umur, dialog konfirmasi |
| `src/app/shared/models/shs-master.ts` | edit | `umurEstimasiBulan?` |
| `src/app/features/shs-master/shs-master-list.component.ts/.html` | edit | input umur di dialog; search box + `#dt.filterGlobal` |
| `src/app/core/data-access/api/api-shs-master.data.ts` | edit | payload umur |

## 3. Perubahan Skema (satu migration)

```php
Schema::table('kendaraan', fn(Blueprint $t) => $t->decimal('harga_perolehan', 15, 2)->nullable());
Schema::table('standar_harga_satuan', fn(Blueprint $t) => $t->unsignedInteger('umur_estimasi_bulan')->nullable());
Schema::table('shs_items', fn(Blueprint $t) => $t->boolean('jadikan_komponen')->default(false));
Schema::table('komponen', fn(Blueprint $t) => $t->unsignedInteger('km_ganti_estimasi')->nullable()->change());
```

Catatan: local & production sama-sama memakai **SQLite**, yang tidak mendukung
`ALTER COLUMN`. Kolom `komponen.km_ganti_estimasi` diubah ke nullable via
**rebuild tabel** (buat `komponen__rebuild` → salin data → drop → rename) —
pendekatan ini driver-agnostic dan aman juga bila kelak pindah ke MySQL.
Migrasi dibuat idempotent dengan guard `Schema::hasColumn` agar aman
di-retry bila sebagian langkah sempat terlanjur ter-apply.

## 4. Desain Detail EWS

### 4.1 Struktur command

```php
class DispatchEwsReminders extends Command {
  protected $signature = 'ews:dispatch-reminders {--dry-run}';
  // TRIGGER_MAP: 'servis_berkala' => evalServisBerkala, dst.
}
```

Tiap evaluator mengembalikan kumpulan temuan:
`['trigger','entityId','recipientIds','title','message','entityKind']`.
Command kemudian: (1) bila dry-run → tabel output; (2) selain itu →
`NotificationService::dispatch` lalu `FcmService::sendToUsers`.

dedupKey konvensi: `servis_berkala:{kendaraanId}`, `komponen_umur:{komponenId}`,
`komponen_km:{komponenId}`, `pajak_kendaraan:{id}`, `stnk:{id}`,
`pengajuan_stuck:{pengajuanId}`, `pagu_kendaraan:{id}:{tier}`,
`rkbmd_belum_realisasi:{itemId}`. Window dedup 24 jam ⇒ maksimal 1×/hari.

### 4.2 Query inti evaluator

- **servis_berkala**: `Kendaraan::where('status','AKTIF')` dengan salah satu interval terisi;
  last paid = `Pembayaran::where('status','PAID')->whereHas('workOrder', fn($w)=>$w->whereHas('pengajuan',fn($p)=>$p->where('kendaraan_id',$id))->where('status','DIBAYAR'))->max('paid_at')`.
- **komponen_***: `Komponen::with('kendaraan:id,nomor_polisi,pengemudi_id,odometer_saat_ini')->where('is_deleted',false)`.
- **pagu**: agregasi `Pembayaran PAID tahun berjalan` per kendaraan via join pengajuan.
- **rkbmd**: `RkbmdItem::where('tahun_anggaran',$thn)->where('is_realisasi',false)`; deadline =
  `Carbon::create($thn,$bulan_rencana,1)->endOfMonth()`.

### 4.3 FcmService (tanpa dependency composer baru)

1. Bangun JWT RS256: header `{alg:RS256,typ:JWT}`, claims `{iss:client_email, scope:'https://www.googleapis.com/auth/firebase.messaging', aud:'https://oauth2.googleapis.com/token', iat, exp:+3600}`; sign `openssl_sign(Sha256)`.
2. Tukar ke access token OAuth2 (POST form grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer); cache `Cache::put('fcm_access_token', ..., 3000 detik)`.
3. Kirim `Http::withToken($tok)->post("https://fcm.googleapis.com/v1/projects/{project_id}/messages:send")` per token, message berisi `notification{title,body}` + `data{entityKind,...}`.
4. Prune: hapus row `device_tokens` bila respons error `UNREGISTERED`/`INVALID_ARGUMENT`/`NOT_FOUND`.
5. Credential dibaca dari env `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   (isi `.env` di server dari service-account JSON; private key pakai tanda kutip ganda dan `\n` literal).
6. Semua kegagalan jaringan di-catch & dilog; **tidak boleh** menggagalkan IN_APP.

### 4.4 Cron cPanel

```
* * * * * cd /home/<user>/sikep-kendi-laravel && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
```
(Path PHP disesuaikan versi cPanel; dokumentasikan di README/deploy notes.)

## 5. Hook Komponen pada Pembayaran (F4)

Di `PembayaranController::bukti()` **di dalam** `DB::transaction` setelah WO→DIBAYAR:

```
$wo->load('pengajuan.kendaraan','verifikasiHarga.shsItems.shsMaster')
foreach shsItems where jadikan_komponen && shsMaster.umur_estimasi_bulan && jenis=='spare part':
    Komponen::updateOrCreate(
      ['kendaraan_id'=>$wo->pengajuan->kendaraan_id,
       'nama_komponen'=>DB::raw lower-trim nama_item]   // match case-insensitive
      ['tanggal_pasang'=>now(), 'umur_estimasi_bulan'=>$master->umur..., 'km_ganti_estimasi'=>null]
    )
```

Matching "pasang ulang": normalisasi `mb_strtolower(trim(nama))`; pertimbangkan
kolom generated/virtual tidak perlu — query `WHERE kendaraan_id=? AND LOWER(nama_komponen)=?`.

## 6. AuditService (F7)

```php
AuditService::log(string $action, string $entity, string $entityId, ?array $before, ?array $after): void
```

- actor: `auth()->user()` (nullable untuk login gagal), role utama diambil relasi roles pertama.
- hash chain: ambil `hash` baris terakhir (`orderByDesc('id')`); payload canonical =
  `json_encode([actor_id, action, entity, entity_id, before, after, occurred_at, prev_hash], JSON_UNESCAPED_UNICODE|SORT_KEYS)`;
  `hash = hash('sha256', $payload)`. Retry sekali bila unique violation; tangkap `Throwable` agar operasi bisnis tak gagal.
- IP/User-Agent dari `request()`.
- Pemanggilan manual di titik-titik aksi penting (tanpa observer global agar eksplisit):
  AuthController (login sukses/gagal), VehicleController (store/update/retire/komponen CUD),
  PengajuanController, WorkOrderController (transisi status), VerifikasiController (shs/review),
  PembayaranController, EarlyWarningController::updateConfig.

## 7. Keputusan UI

- Harga perolehan: `p-inputnumber mode="currency" currency="IDR" locale="id-ID"`, diletakkan dekat grup paguTahunan di vehicle-form.
- Checkbox EWS di editor SHS: kolom sempit setelah Status; `[disabled]` ketika `!item.umurMaster || item.jenis!=='spare part'`; tooltip penjelasan; default tercentang otomatis saat master dipilih dan memenuhi syarat.
- Dialog konfirmasi: PrimeNG `ConfirmationService` (pola existing) — target accept menjalankan dispatch asli.
- Search SHS Master: `<input pInputText [(ngModel)]="globalSearch">` + `#dt` pada `p-table` + `(ngModelChange)="dt.filterGlobal($event,'contains')"`.

## 8. Error Handling & Risiko

| Risiko | Mitigasi |
|---|---|
| `doctrine/dbal` belum ada untuk `->change()` | Gunakan `DB::statement(ALTER TABLE ... MODIFY)` MySQL |
| FCM credential belum dipasang di server | Push dilewati + log warning; IN_APP tetap jalan |
| Jam server cPanel ≠ WIB | `timezone('Asia/Jakarta')` di schedule; evaluator pakai `now()` app timezone |
| Hash chain race saat 2 request bersamaan | Retry 1×; kegagalan kedua diabaikan + log |
| Data historis audit tetap kosong di produksi | Jalankan `MigrateFromPrisma` opsional bila DB Prisma lama tersedia |
| Komponen duplikat karena beda kapital/spasi | Normalisasi lower-trim saat matching |

## 9. Strategi Verifikasi

1. `php artisan migrate` lokal.
2. `php artisan ews:dispatch-reminders --dry-run` → review temuan vs data uji.
3. Tanpa `--dry-run` → cek tabel `notifications` (channel IN_APP, dedup_key terisi).
4. Simulasi push: satu device token web dari log browser → pastikan toast muncul (listener existing).
5. Alur SHS→checkbox→bayar WO→cek tabel `komponen` & dashboard EWS.
6. Aksi mutating acak → `GET /audit-logs` menampilkan baris baru dengan hash chain konsisten.
7. `npm run build` (type-check Angular) + smoke test form kendaraan (tanggal persist setelah reload).
