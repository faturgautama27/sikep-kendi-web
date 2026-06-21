import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { APP_ENV } from './app-env.token';
import { HydrateFromFixtures, FixturePayload } from './fixtures.action';

// Direct JSON imports — bundled by Angular at build time via `resolveJsonModule`.
// Each file's top-level wrapper key is unwrapped in `buildPayload()` to a flat
// property on `FixturePayload`. Wrapper keys verified against fixture sources.
import usersJson from '@fixtures/users.json';
import rolesJson from '@fixtures/roles.json';
import vehiclesJson from '@fixtures/vehicles.json';
import vehicleDocumentsJson from '@fixtures/vehicle-documents.json';
import odometerReadingsJson from '@fixtures/odometer-readings.json';
import driverAssignmentsJson from '@fixtures/driver-assignments.json';
import driverViolationsJson from '@fixtures/driver-violations.json';
import sparepartPriceHistoryJson from '@fixtures/sparepart-price-history.json';
import vendorsJson from '@fixtures/vendors.json';
import regulationVersionsJson from '@fixtures/regulation-versions.json';
import regulationRulesJson from '@fixtures/regulation-rules.json';
import regulationChangeHistoryJson from '@fixtures/regulation-change-history.json';
import pengajuanJson from '@fixtures/pengajuan.json';
import approvalPoliciesJson from '@fixtures/approval-policies.json';
import approvalStepsJson from '@fixtures/approval-steps.json';
import workOrdersJson from '@fixtures/work-orders.json';
import draftChecklistsJson from '@fixtures/draft-checklists.json';
import penawaranJson from '@fixtures/penawaran.json';
import verifikasiHargaJson from '@fixtures/verifikasi-harga.json';
import pembayaranJson from '@fixtures/pembayaran.json';
import daruratJson from '@fixtures/darurat.json';
import workOrderProgressJson from '@fixtures/work-order-progress.json';
import workOrderEvidenceJson from '@fixtures/work-order-evidence.json';
import fuelQuotasJson from '@fixtures/fuel-quotas.json';
import imagesJson from '@fixtures/images.json';
import notificationsJson from '@fixtures/notifications.json';
import notificationPreferencesJson from '@fixtures/notification-preferences.json';
import notificationThresholdsJson from '@fixtures/notification-thresholds.json';
import auditLogsJson from '@fixtures/audit-logs.json';
import dashboardJson from '@fixtures/dashboard.json';

/**
 * Bootstraps NGXS state dari fixture JSON lokal saat aplikasi berjalan di
 * Preview Mode (`AppEnvironment.previewMode === true`).
 *
 * @remarks
 * - Komponen dan NGXS state slice SHALL NOT inject service ini secara langsung;
 *   mereka bereaksi terhadap NGXS action {@link HydrateFromFixtures} saja.
 * - Service ini di-invoke sekali via `provideAppInitializer` di `app.config.ts`.
 * - JSON di-import langsung sebagai TypeScript module sehingga di-bundle Angular
 *   pada build time (tidak ada HTTP fetch — sesuai Requirement 2.3 "tidak
 *   melakukan panggilan HTTP ke backend").
 * - Property `snapshot` adalah immutable cache yang di-build sekali saat
 *   konstruktor; berguna untuk Preview adapter yang ingin membaca data tanpa
 *   menunggu state slice handler memproses action.
 *
 * @see HydrateFromFixtures
 * @see FixturePayload
 */
@Injectable({ providedIn: 'root' })
export class FixtureBootstrapService {
  /**
   * `Store` di-inject opsional karena `provideStore()` baru di-wire pada
   * task 5.x bersama state slice. Sebelum itu, service ini tetap aman
   * di-instantiate (mis. lewat `provideAppInitializer`) tanpa NullInjectorError;
   * `hydrate()` akan no-op bila Store belum tersedia.
   */
  private readonly store = inject(Store, { optional: true });
  private readonly env = inject(APP_ENV);
  private hydrated = false;

  /**
   * In-memory snapshot fixture payload, di-build sekali saat service
   * di-instantiate. Idempotent dan dapat dibaca berkali-kali.
   */
  readonly snapshot: FixturePayload = this.buildPayload();

  /**
   * Hydrates NGXS state slices dengan dispatch {@link HydrateFromFixtures}.
   *
   * Idempotent: panggilan berikutnya menjadi no-op. Dipanggil dari
   * `provideAppInitializer` saat `env.previewMode === true`. Di mode non-preview
   * service ini juga no-op agar aman untuk di-wire unconditional.
   */
  hydrate(): void {
    if (!this.env.previewMode || this.hydrated || !this.store) {
      return;
    }
    this.hydrated = true;
    this.store.dispatch(new HydrateFromFixtures(this.snapshot));
  }

  /**
   * Membangun aggregate {@link FixturePayload} dengan unwrap top-level wrapper
   * key dari masing-masing JSON file ke camelCase property datar.
   *
   * @remarks
   * Wrapper key per fixture diverifikasi terhadap source di
   * `src/app/fixtures/`. Perubahan struktur fixture (mis. rename top-level key)
   * SHALL diikuti dengan update method ini.
   */
  private buildPayload(): FixturePayload {
    return {
      users: (usersJson as { users: unknown[] }).users,
      roles: (rolesJson as { roles: unknown[] }).roles,
      vehicles: (vehiclesJson as { vehicles: unknown[] }).vehicles,
      vehicleDocuments: (vehicleDocumentsJson as { vehicleDocuments: unknown[] }).vehicleDocuments,
      odometerReadings: (odometerReadingsJson as { odometerReadings: unknown[] }).odometerReadings,
      driverAssignments: (driverAssignmentsJson as { driverAssignments: unknown[] }).driverAssignments,
      driverViolations: (driverViolationsJson as { driverViolations: unknown[] }).driverViolations,
      sparepartPriceHistory: (sparepartPriceHistoryJson as { sparepartPriceHistory: unknown[] })
        .sparepartPriceHistory,
      vendors: (vendorsJson as { vendors: unknown[] }).vendors,
      regulationVersions: (regulationVersionsJson as { regulationVersions: unknown[] })
        .regulationVersions,
      regulationRules: (regulationRulesJson as { regulationRules: unknown[] }).regulationRules,
      regulationChangeHistory: (
        regulationChangeHistoryJson as { regulationChangeHistory: unknown[] }
      ).regulationChangeHistory,
      pengajuan: (pengajuanJson as { pengajuan: unknown[] }).pengajuan,
      approvalPolicies: (approvalPoliciesJson as { approvalPolicies: unknown[] }).approvalPolicies,
      approvalSteps: (approvalStepsJson as { approvalSteps: unknown[] }).approvalSteps,
      workOrders: (workOrdersJson as { workOrders: unknown[] }).workOrders,
      draftChecklists: (draftChecklistsJson as { draftChecklists: unknown[] }).draftChecklists,
      penawaran: (penawaranJson as { penawaran: unknown[] }).penawaran,
      verifikasiHarga: (verifikasiHargaJson as { verifikasiHarga: unknown[] }).verifikasiHarga,
      pembayaran: (pembayaranJson as { pembayaran: unknown[] }).pembayaran,
      darurat: (daruratJson as { darurat: unknown[] }).darurat,
      workOrderProgress: (workOrderProgressJson as { workOrderProgress: unknown[] })
        .workOrderProgress,
      workOrderEvidence: (workOrderEvidenceJson as { workOrderEvidence: unknown[] })
        .workOrderEvidence,
      fuelQuotas: (fuelQuotasJson as { fuelQuotas: unknown[] }).fuelQuotas,
      images: (imagesJson as { images: unknown[] }).images,
      notifications: (notificationsJson as { notifications: unknown[] }).notifications,
      notificationPreferences: (
        notificationPreferencesJson as { notificationPreferences: unknown[] }
      ).notificationPreferences,
      notificationThresholds: (notificationThresholdsJson as { thresholds: unknown }).thresholds,
      auditLogs: (auditLogsJson as { auditLogs: unknown[] }).auditLogs,
      dashboard: dashboardJson,
    };
  }
}
