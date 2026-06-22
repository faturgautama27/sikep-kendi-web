import type { AppEnvironment } from '@core/data-access/app-env.token';

export const environment: AppEnvironment = {
  production: true,
  previewMode: false,
  apiBaseUrl: 'https://apidev-sikepkendi.darmamulticorp.com/api',
  appName: 'SiKeP KenDI',
  tagline: 'Sistem Kendali Pemeliharaan Kendaraan Dinas',
  defaultLocale: 'id-ID',
  timezone: 'Asia/Jakarta',
};
