import type { AppEnvironment } from '@core/data-access/app-env.token';

export const environment: AppEnvironment = {
  production: true,
  previewMode: false,
  isMobile: true,
  // Pastikan URL API mengarah ke server publik atau IP backend jika dijalankan di emulator Android
  apiBaseUrl: 'http://10.0.2.2:3000/api', // 10.0.2.2 adalah localhost di Android emulator
  appName: 'SiKeP KenDI Pengemudi',
  tagline: 'Sistem Kendali Pemeliharaan Kendaraan Dinas',
  defaultLocale: 'id-ID',
  timezone: 'Asia/Jakarta',
};
