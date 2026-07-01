import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { APP_ENV, AppEnvironment } from './app-env.token';

import {
  AUTH_DATA,
  VEHICLE_DATA,
  PENGAJUAN_DATA,
  WORKORDER_DATA,
  DRAFT_CHECKLIST_DATA,
  PENAWARAN_DATA,
  VERIFIKASI_DATA,
  PEMBAYARAN_DATA,
  DARURAT_DATA,
  IMAGE_DATA,
  NOTIFICATION_DATA,
  AUDIT_DATA,
  DASHBOARD_DATA,
  SHS_MASTER_DATA,
  LAPORAN_DATA,
} from './ports';

import {
  PreviewAuthData,
  PreviewVehicleData,
  PreviewPengajuanData,
  PreviewWorkOrderData,
  PreviewDraftChecklistData,
  PreviewPenawaranData,
  PreviewVerifikasiData,
  PreviewPembayaranData,
  PreviewDaruratData,
  PreviewImageData,
  PreviewNotificationData,
  PreviewAuditData,
  PreviewDashboardData,
  PreviewShsMasterData,
  PreviewLaporanData,
} from './preview';

import {
  ApiAuthData,
  ApiVehicleData,
  ApiPengajuanData,
  ApiWorkOrderData,
  ApiDraftChecklistData,
  ApiPenawaranData,
  ApiVerifikasiData,
  ApiPembayaranData,
  ApiDaruratData,
  ApiImageData,
  ApiNotificationData,
  ApiAuditData,
  ApiDashboardData,
  ApiShsMasterData,
  ApiLaporanData,
} from './api';

/**
 * Provides SiKeP KenDI data adapters with switching based on `environment.previewMode`.
 *
 * - When `previewMode === true`: in-memory NGXS-backed `Preview*Data` adapters
 *   (Phase 1 stub; full impl pada Task 5.x bersamaan dengan NGXS state slices).
 * - When `previewMode === false`: HttpClient-based `Api*Data` adapters
 *   (Phase 1 stub; full impl pada Phase 4 saat backend siap).
 *
 * Components dan NGXS state MUST inject port tokens (mis. `VEHICLE_DATA`),
 * tidak pernah class konkret, agar swap implementasi tetap transparan.
 */
export function provideSikepKendiData(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: AUTH_DATA,
      useFactory: chooseAdapter<PreviewAuthData, ApiAuthData>(),
      deps: [APP_ENV, PreviewAuthData, ApiAuthData],
    },
    {
      provide: VEHICLE_DATA,
      useFactory: chooseAdapter<PreviewVehicleData, ApiVehicleData>(),
      deps: [APP_ENV, PreviewVehicleData, ApiVehicleData],
    },
    {
      provide: PENGAJUAN_DATA,
      useFactory: chooseAdapter<PreviewPengajuanData, ApiPengajuanData>(),
      deps: [APP_ENV, PreviewPengajuanData, ApiPengajuanData],
    },
    {
      provide: WORKORDER_DATA,
      useFactory: chooseAdapter<PreviewWorkOrderData, ApiWorkOrderData>(),
      deps: [APP_ENV, PreviewWorkOrderData, ApiWorkOrderData],
    },
    {
      provide: DRAFT_CHECKLIST_DATA,
      useFactory: chooseAdapter<PreviewDraftChecklistData, ApiDraftChecklistData>(),
      deps: [APP_ENV, PreviewDraftChecklistData, ApiDraftChecklistData],
    },
    {
      provide: PENAWARAN_DATA,
      useFactory: chooseAdapter<PreviewPenawaranData, ApiPenawaranData>(),
      deps: [APP_ENV, PreviewPenawaranData, ApiPenawaranData],
    },
    {
      provide: VERIFIKASI_DATA,
      useFactory: chooseAdapter<PreviewVerifikasiData, ApiVerifikasiData>(),
      deps: [APP_ENV, PreviewVerifikasiData, ApiVerifikasiData],
    },
    {
      provide: PEMBAYARAN_DATA,
      useFactory: chooseAdapter<PreviewPembayaranData, ApiPembayaranData>(),
      deps: [APP_ENV, PreviewPembayaranData, ApiPembayaranData],
    },
    {
      provide: DARURAT_DATA,
      useFactory: chooseAdapter<PreviewDaruratData, ApiDaruratData>(),
      deps: [APP_ENV, PreviewDaruratData, ApiDaruratData],
    },
    {
      provide: IMAGE_DATA,
      useFactory: chooseAdapter<PreviewImageData, ApiImageData>(),
      deps: [APP_ENV, PreviewImageData, ApiImageData],
    },
    {
      provide: NOTIFICATION_DATA,
      useFactory: chooseAdapter<PreviewNotificationData, ApiNotificationData>(),
      deps: [APP_ENV, PreviewNotificationData, ApiNotificationData],
    },
    {
      provide: AUDIT_DATA,
      useFactory: chooseAdapter<PreviewAuditData, ApiAuditData>(),
      deps: [APP_ENV, PreviewAuditData, ApiAuditData],
    },
    {
      provide: DASHBOARD_DATA,
      useFactory: chooseAdapter<PreviewDashboardData, ApiDashboardData>(),
      deps: [APP_ENV, PreviewDashboardData, ApiDashboardData],
    },
    {
      provide: SHS_MASTER_DATA,
      useFactory: chooseAdapter<PreviewShsMasterData, ApiShsMasterData>(),
      deps: [APP_ENV, PreviewShsMasterData, ApiShsMasterData],
    },
    {
      provide: LAPORAN_DATA,
      useFactory: chooseAdapter<PreviewLaporanData, ApiLaporanData>(),
      deps: [APP_ENV, PreviewLaporanData, ApiLaporanData],
    },
  ]);
}

/**
 * Returns a factory function that selects the preview or api adapter based on
 * `AppEnvironment.previewMode`. Both implementations are pre-resolved by Angular DI
 * via `deps: [APP_ENV, PreviewClass, ApiClass]` and the factory returns one of them.
 */
function chooseAdapter<P, A>(): (env: AppEnvironment, preview: P, api: A) => P | A {
  return (env, preview, api) => (env.previewMode ? preview : api);
}
