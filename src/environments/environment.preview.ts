import type { AppEnvironment } from '@core/data-access/app-env.token';

export const environment: AppEnvironment = {
  production: false,
  previewMode: true,
  apiBaseUrl: '',
  appName: 'SiKeP KenDI',
  tagline: 'Sistem Kendali Pemeliharaan Kendaraan Dinas',
  defaultLocale: 'id-ID',
  timezone: 'Asia/Jakarta',
};
