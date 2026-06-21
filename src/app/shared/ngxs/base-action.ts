/**
 * Base interface untuk semua NGXS Actions di ARMADIN.
 *
 * Setiap action class SHALL menyediakan `static readonly type` string yang unik.
 * Konvensi naming: `'[Feature] Action Name'`, mis. `'[Vehicles] Load List'`.
 *
 * Contoh:
 * ```ts
 * export class LoadVehicles implements BaseActionType {
 *   static readonly type = '[Vehicles] Load List';
 *   readonly type = LoadVehicles.type;
 * }
 * ```
 *
 * @remarks
 * Type string digunakan oleh NGXS untuk routing action ke handler `@Action()`,
 * sehingga harus konsisten dan unik di seluruh aplikasi.
 */
export interface BaseActionType {
  /** Action type string dengan format `'[Feature] Action Name'`. */
  type: string;
}

/**
 * Konstruktor type untuk class yang mengimplementasikan {@link BaseActionType}.
 *
 * Berguna untuk helper utilities yang menerima action class sebagai parameter
 * (mis. dispatcher generic, mock action helper, atau type guard).
 */
export type ActionConstructor<T extends BaseActionType = BaseActionType> = new (
  ...args: never[]
) => T;
