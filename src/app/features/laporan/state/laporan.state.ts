import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';
import { APP_ENV } from '@core/data-access/app-env.token';
import { LAPORAN_DATA, type LaporanDataPort, type LaporanBiayaResponse } from '@core/data-access/ports/laporan-data.port';
import { LoadLaporanBiaya } from './laporan.actions';

interface LaporanStateModel {
  biaya: LaporanBiayaResponse | null;
}

@State<LaporanStateModel>({ name: 'laporan', defaults: { biaya: null } })
@Injectable()
export class LaporanState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<LaporanDataPort>(LAPORAN_DATA);

  @Selector()
  static biaya(state: LaporanStateModel): LaporanBiayaResponse | null {
    return state.biaya;
  }

  @Action(LoadLaporanBiaya)
  loadBiaya(ctx: StateContext<LaporanStateModel>, action: LoadLaporanBiaya) {
    if (this.env.previewMode) {
      ctx.patchState({ biaya: { summary: { totalKeseluruhan: 0, totalNormatif: 0, totalDarurat: 0 }, details: { normatif: [], darurat: [] } } });
      return;
    }
    return this.data.getLaporanBiaya(action.filter).pipe(
      tap((raw) => {
        console.log("raw =>", raw);
        ctx.patchState({ biaya: raw });
      }),
    );
  }
}
