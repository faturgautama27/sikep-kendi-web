import { InjectionToken } from '@angular/core';

export interface AppEnvironment {
  production: boolean;
  previewMode: boolean;
  apiBaseUrl: string;
  appName: string;
  tagline: string;
  defaultLocale: string;
  timezone: string;
  isMobile?: boolean;
}

export const APP_ENV = new InjectionToken<AppEnvironment>('APP_ENV');
