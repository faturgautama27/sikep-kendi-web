import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { provideStore } from '@ngxs/store';
import { withNgxsLoggerPlugin } from '@ngxs/logger-plugin';
import { withNgxsRouterPlugin } from '@ngxs/router-plugin';
import { withNgxsStoragePlugin } from '@ngxs/storage-plugin';
import { providePrimeNG } from 'primeng/config';

// Register Indonesian locale data for Angular pipes (date, number, currency)
registerLocaleData(localeId, 'id-ID');

import { APP_ENV } from '@core/data-access/app-env.token';
import { FixtureBootstrapService } from '@core/data-access/fixture-bootstrap.service';
import { provideArmadinData } from '@core/data-access/provide-armadin-data';
import { authInterceptor } from '@core/http/auth.interceptor';
import { errorInterceptor } from '@core/http/error.interceptor';
import { idempotencyKeyInterceptor } from '@core/http/idempotency-key.interceptor';
import { previewSafetyNetInterceptor } from '@core/http/preview-safety-net.interceptor';
import { UiState } from '@shared/ngxs/ui';
import { AuthState } from '@features/login/state';
import { VehiclesState } from '@features/vehicles/state';
import { RegulationsState } from '@features/regulations/state';
import { SparepartsState } from '@features/spareparts/state';
import { DriversState } from '@features/drivers/state';
import {
  ChecklistTemplatesState,
  ChecklistExecutionsState,
} from '@features/checklist/state';
import { PengajuanState } from '@features/pengajuan/state';
import { WorkOrdersState } from '@features/work-orders/state';
import { FuelState } from '@features/fuel/state';
import { SpjState } from '@features/spj/state';
import { NotificationsState } from '@features/notifications/state';
import { AuditState } from '@features/audit/state';
import { DashboardState } from '@features/analytics/state';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

/**
 * ARMADIN PrimeNG preset: extends Aura and overrides the semantic primary palette
 * to the ARMADIN biru-putih brand (Tailwind blue scale, anchored at blue.700 = #1d4ed8).
 */
const ArmadinPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

/**
 * Daftar seluruh NGXS state slice yang diregister untuk aplikasi.
 *
 * Tiap slice di-register sekali di sini supaya `HydrateFromFixtures` dapat
 * disebar ke seluruh state secara serempak saat boot di Preview Mode.
 */
const ARMADIN_STATES = [
  UiState,
  AuthState,
  VehiclesState,
  RegulationsState,
  SparepartsState,
  DriversState,
  ChecklistTemplatesState,
  ChecklistExecutionsState,
  PengajuanState,
  WorkOrdersState,
  FuelState,
  SpjState,
  NotificationsState,
  AuditState,
  DashboardState,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([
        previewSafetyNetInterceptor,
        authInterceptor,
        idempotencyKeyInterceptor,
        errorInterceptor,
      ]),
    ),
    provideStore(
      ARMADIN_STATES,
      { developmentMode: !environment.production },
      withNgxsRouterPlugin(),
      withNgxsStoragePlugin({
        keys: ['auth', 'ui'],
      }),
      ...(!environment.production ? [withNgxsLoggerPlugin({ disabled: false })] : []),
    ),
    providePrimeNG({
      theme: {
        preset: ArmadinPreset,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
    }),
    { provide: APP_ENV, useValue: environment },
    { provide: LOCALE_ID, useValue: 'id-ID' },
    provideArmadinData(),
    provideAppInitializer(() => {
      // Hydrate NGXS state dari fixture JSON saat Preview Mode aktif.
      // No-op di non-preview build (lihat FixtureBootstrapService.hydrate).
      inject(FixtureBootstrapService).hydrate();
    }),
  ],
};
