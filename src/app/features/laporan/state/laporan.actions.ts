import { LaporanBiayaFilter } from '@core/data-access/ports/laporan-data.port';

export class LoadLaporanBiaya {
  static readonly type = '[Laporan] Load Biaya';
  constructor(public readonly filter: LaporanBiayaFilter) {}
}
