/**
 * Barrel export untuk utilities NGXS yang dipakai lintas feature di SiKeP KenDI.
 *
 * Import dari path alias `@shared/ngxs` daripada subpath spesifik agar konsumen
 * tidak terkopling ke struktur folder internal.
 */
export * from './base-action';
export * from './select-helpers';
export * from './ui';
