# ARMADIN — Armada Dinas Terkelola

Fleet Management System untuk instansi pemerintah.
Stack: Angular 21 · TailwindCSS · PrimeNG · NGXS · Capacitor · Laravel 11 · PostgreSQL · MinIO

---

## 🚀 Preview Mode (Demo Client — tanpa backend)

```bash
npm install
npm run start:preview
```

Buka http://localhost:4200 lalu gunakan salah satu akun demo:

| Username | Role |
|---|---|
| `admin` | Admin Sistem |
| `kasubag` | Kasubag |
| `pengurus_barang` | Pengurus Barang / Pengelola Aset |
| `auditor` | Auditor |
| `vendor1` | Vendor |
| `supir1` | Supir |

Password: `demo1234` (semua akun, preview mode tidak memvalidasi password)

### Halaman yang tersedia

| Route | Deskripsi |
|---|---|
| `/dashboard` | Ringkasan armada, biaya, notifikasi |
| `/vehicles` | Master data kendaraan (10 unit dummy) |
| `/regulations` | Regulasi versioned (interval servis, BBM, dll) |
| `/spareparts` | Sparepart & Vendor |
| `/drivers` | Manajemen supir, SIM, penugasan |
| `/checklist-templates` | Template checklist harian/mingguan/bulanan |
| `/checklist-executions` | Riwayat eksekusi checklist |
| `/pengajuan` | Pengajuan pemeliharaan dengan approval workflow |
| `/work-orders` | Order kerja vendor |
| `/fuel` | Manajemen BBM & kuota |
| `/spj` | Rekonsiliasi SPJ eksternal |
| `/audit` | Audit trail dengan filter |
| `/analytics` | Analytics & performa vendor |
| `/admin/users` | Manajemen pengguna |
| `/profile` | Profil & preferensi notifikasi |

### Banner kuning di atas = Mode Preview aktif (data dummy)

---

## 🏗️ Production Build

```bash
npm run build
```

Untuk connect ke backend Laravel:
1. Set `apiBaseUrl` di `src/environments/environment.ts`
2. `npm run build` → deploy ke Nginx

---

## 📁 Struktur Proyek

```
src/app/
├── core/          # auth guard, layout (AppShell, TopBar, SideNav), data adapters
├── shared/        # domain models, NGXS helpers (UiState, AsyncSlice)
├── features/      # halaman per fitur (vehicles, regulations, pengajuan, dst.)
├── fixtures/      # 34 JSON dummy data untuk Preview Mode
└── environments/  # environment.ts / environment.preview.ts
```

---

## 🛠️ Pengembangan

```bash
npm start          # dev server (connect ke backend)
npm run start:preview   # dev server preview mode (no backend)
npm run lint       # ESLint
npm run format     # Prettier
```
