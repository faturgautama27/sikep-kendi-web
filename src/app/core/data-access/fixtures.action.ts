/**
 * NGXS action untuk hydrate seluruh state slice dari fixture JSON.
 *
 * Action ini dispatch sekali saat aplikasi boot di Preview Mode oleh
 * {@link FixtureBootstrapService}. Setiap state slice yang relevan SHALL
 * meng-handle action ini dengan reading payload yang sesuai (mis.
 * `VehiclesState` membaca `payload.vehicles`).
 *
 * @remarks
 * - Payload bertipe `unknown[]` per slice agar action ini tidak terkopling ke
 *   tipe domain konkret. State slice yang meng-handle bertanggung jawab
 *   melakukan cast/parse ke shape domain mereka.
 * - Action ini idempotent dari sisi service (lihat `FixtureBootstrapService.hydrate`),
 *   sehingga state slice dapat berasumsi diterima paling banyak satu kali per session.
 *
 * @see FixtureBootstrapService
 */
export class HydrateFromFixtures {
  static readonly type = '[Fixtures] Hydrate From Fixtures';
  readonly type = HydrateFromFixtures.type;

  constructor(public readonly payload: FixturePayload) {}
}

/**
 * Aggregate payload dari seluruh fixture JSON file untuk seed initial state
 * NGXS di Preview Mode.
 *
 * Setiap properti merepresentasikan koleksi entitas dari satu bounded context.
 * Properti `notificationThresholds` dan `dashboard` bukan list karena fixture
 * source-nya berupa objek konfigurasi, bukan koleksi entitas.
 */
export interface FixturePayload {
  users: unknown[];
  roles: unknown[];
  vehicles: unknown[];
  vehicleDocuments: unknown[];
  odometerReadings: unknown[];
  driverAssignments: unknown[];
  driverViolations: unknown[];
  sparepartPriceHistory: unknown[];
  vendors: unknown[];
  regulationVersions: unknown[];
  regulationRules: unknown[];
  regulationChangeHistory: unknown[];
  pengajuan: unknown[];
  approvalPolicies: unknown[];
  approvalSteps: unknown[];
  workOrders: unknown[];
  draftChecklists: unknown[];
  penawaran: unknown[];
  verifikasiHarga: unknown[];
  pembayaran: unknown[];
  darurat: unknown[];
  workOrderProgress: unknown[];
  workOrderEvidence: unknown[];
  fuelQuotas: unknown[];
  images: unknown[];
  notifications: unknown[];
  notificationPreferences: unknown[];
  notificationThresholds: unknown;
  auditLogs: unknown[];
  dashboard: unknown;
}
