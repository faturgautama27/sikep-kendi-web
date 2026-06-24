import type { AppEnvironment } from '@core/data-access/app-env.token';

export const environment: AppEnvironment = {
  production: false,
  previewMode: false,
  apiBaseUrl: 'http://localhost:3000/api',
  appName: 'SiKeP KenDI',
  tagline: 'Sistem Kendali Pemeliharaan Kendaraan Dinas',
  defaultLocale: 'id-ID',
  timezone: 'Asia/Jakarta',
  isMobile: true,
};
