import { InjectionToken } from '@angular/core';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface AppEnvironment {
  production: boolean;
  previewMode: boolean;
  apiBaseUrl: string;
  appName: string;
  tagline: string;
  defaultLocale: string;
  timezone: string;
  isMobile?: boolean;
  firebaseConfig: FirebaseConfig;
}

export const APP_ENV = new InjectionToken<AppEnvironment>('APP_ENV');
