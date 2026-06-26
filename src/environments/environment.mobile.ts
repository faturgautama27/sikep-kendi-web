import type { AppEnvironment } from '@core/data-access/app-env.token';

export const environment: AppEnvironment = {
  production: true,
  previewMode: false,
  isMobile: true,
  // Pastikan URL API mengarah ke server publik atau IP backend jika dijalankan di emulator Android
  apiBaseUrl: 'https://apidev-sikepkendi.darmamulticorp.com/api', // 10.0.2.2 adalah localhost di Android emulator
  appName: 'SiKeP KenDI Pengemudi',
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
