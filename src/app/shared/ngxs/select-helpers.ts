/**
 * Helper types dan factories untuk pola async slice di NGXS state ARMADIN.
 *
 * Setiap state slice yang merepresentasikan data asynchronous (load, save,
 * pengajuan, dll.) MENGGUNAKAN bentuk {@link AsyncSlice} agar konsisten dan
 * mudah dirender di UI (loading spinner, error banner, last-fetched indicator).
 */

/**
 * Status lifecycle untuk operasi async generik.
 *
 * - `idle`: belum pernah dimuat atau sudah di-reset.
 * - `loading`: sedang menunggu hasil (request in-flight).
 * - `success`: data terakhir berhasil dimuat.
 * - `error`: percobaan terakhir gagal; `error` field berisi pesan.
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Bentuk standar slice async untuk state NGXS.
 *
 * @typeParam T - Tipe payload data yang dibungkus.
 */
export interface AsyncSlice<T> {
  /** Data terakhir yang berhasil dimuat (atau nilai initial). */
  data: T;
  /** Status lifecycle saat ini. */
  status: LoadingState;
  /** Pesan error human-readable bila `status === 'error'`, selain itu `null`. */
  error: string | null;
  /** ISO 8601 timestamp dari fetch terakhir yang sukses, atau `null`. */
  lastFetchedAt: string | null;
}

/**
 * Factory untuk membuat {@link AsyncSlice} pada state initial.
 *
 * @param initial - Nilai awal payload.
 * @returns Slice baru dengan status `idle`, error `null`, lastFetchedAt `null`.
 *
 * @example
 * ```ts
 * @State<VehiclesStateModel>({
 *   name: 'vehicles',
 *   defaults: { list: initialAsyncSlice<Vehicle[]>([]) },
 * })
 * ```
 */
export function initialAsyncSlice<T>(initial: T): AsyncSlice<T> {
  return {
    data: initial,
    status: 'idle',
    error: null,
    lastFetchedAt: null,
  };
}

/**
 * Helper untuk transisi slice ke status `loading` tanpa kehilangan data lama.
 *
 * Berguna untuk UX "stale-while-revalidate" — UI tetap menampilkan data
 * sebelumnya sambil indikator loading aktif.
 */
export function toLoading<T>(slice: AsyncSlice<T>): AsyncSlice<T> {
  return { ...slice, status: 'loading', error: null };
}

/**
 * Helper untuk transisi slice ke status `success` dengan data baru.
 *
 * Set `lastFetchedAt` ke timestamp ISO saat ini secara default; bisa di-override
 * untuk testing atau replay deterministik.
 */
export function toSuccess<T>(data: T, now: Date = new Date()): AsyncSlice<T> {
  return {
    data,
    status: 'success',
    error: null,
    lastFetchedAt: now.toISOString(),
  };
}

/**
 * Helper untuk transisi slice ke status `error` dengan mempertahankan data lama.
 *
 * @param slice - Slice sebelumnya (data-nya dipertahankan).
 * @param message - Pesan error human-readable.
 */
export function toError<T>(slice: AsyncSlice<T>, message: string): AsyncSlice<T> {
  return { ...slice, status: 'error', error: message };
}

/**
 * Type guard: `true` bila slice sedang loading.
 */
export function isLoading<T>(slice: AsyncSlice<T>): boolean {
  return slice.status === 'loading';
}

/**
 * Type guard: `true` bila slice sudah pernah sukses dimuat.
 */
export function hasData<T>(slice: AsyncSlice<T>): boolean {
  return slice.status === 'success' && slice.lastFetchedAt !== null;
}
