# SiKeP KenDI — Sistem Kendali Pemeliharaan Kendaraan Dinas

Fleet maintenance management system untuk instansi pemerintah.
Stack: Angular 21 · TailwindCSS · PrimeNG · NGXS

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
| `pengurus_barang` | Pengurus Barang |
| `pengurus_barang` | Pengurus Barang / Pengelola Aset |
| `verifikator` | Verifikator |
| `vendor` | Vendor |
| `bendahara` | Bendahara |
| `pengemudi` | Pengemudi |

Password: `demo1234` (semua akun, preview mode tidak memvalidasi password)

### Halaman yang tersedia

| Route | Deskripsi |
|---|---|
| `/dashboard` | Ringkasan armada, biaya, notifikasi |
| `/vehicles` | Master data kendaraan (10 unit dummy) |
| `/pengajuan` | Pengajuan pemeliharaan dengan approval workflow |
| `/work-orders` | Order kerja vendor |
| `/audit` | Audit trail dengan filter |
| `/vendor/dashboard` | Dashboard vendor |
| `/vendor/work-orders` | Portal vendor work order/draft/penawaran |
| `/darurat` | Laporan darurat |
| `/admin/users` | Manajemen pengguna |
| `/profile` | Profil & preferensi notifikasi |

### Banner kuning di atas = Mode Preview aktif (data dummy)

---

## 🏗️ Production Build

```bash
npm run build
```

Untuk connect ke backend SiKeP KenDI API:
1. Set `apiBaseUrl` di `src/environments/environment.ts`
2. `npm run build` → deploy ke Nginx

---

## 📁 Struktur Proyek

```
src/app/
├── core/          # auth guard, layout (AppShell, TopBar, SideNav), data adapters
├── shared/        # domain models, NGXS helpers (UiState, AsyncSlice)
├── features/      # halaman per fitur (vehicles, pengajuan, work order, vendor, dst.)
├── fixtures/      # JSON dummy data untuk Preview Mode
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
