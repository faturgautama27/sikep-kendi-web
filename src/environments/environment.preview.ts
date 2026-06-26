import type { AppEnvironment } from '@core/data-access/app-env.token';

export const environment: AppEnvironment = {
  production: false,
  previewMode: true,
  apiBaseUrl: '',
  appName: 'SiKeP KenDI',
  tagline: 'Sistem Kendali Pemeliharaan Kendaraan Dinas',
  defaultLocale: 'id-ID',
  timezone: 'Asia/Jakarta',
  firebaseConfig: {
    apiKey: 'AIzaSyBdmzD_pzmOukOOOvY6-06Lbds2_fcohMU',
    authDomain: 'sikep-kendi.firebaseapp.com',
    projectId: 'sikep-kendi',
    storageBucket: 'sikep-kendi.firebasestorage.app',
    messagingSenderId: '506725239952',
    appId: '1:506725239952:web:cb6a8fa2e5f75796e31c15',
  },
};
