import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';

import { PageHeaderComponent } from '@core/layout';
import { LaporanState } from './state/laporan.state';
import { LoadLaporanBiaya } from './state/laporan.actions';
import { LaporanExportService } from './laporan-export.service';

@Component({
  selector: 'app-laporan-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    CardModule,
    DatePickerModule,
    PageHeaderComponent,
  ],
  templateUrl: './laporan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaporanListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly exportService = inject(LaporanExportService);

  protected dateRange = signal<Date[]>([
    new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of month
    new Date() // Today
  ]);

  protected readonly biaya = this.store.selectSignal(LaporanState.biaya);
  protected readonly loading = signal(false); // LaporanState doesn't have loading, use dummy for now

  protected readonly list = computed(() => this.biaya()?.details.darurat || []);

  protected readonly totalBiaya = computed(() => {
    return this.biaya()?.summary.totalDarurat || 0;
  });

  protected readonly totalKendaraan = computed(() => {
    const ids = new Set(this.list().map(x => x.vehicleId || x.kendaraanId));
    return ids.size;
  });

  ngOnInit(): void {
    this.fetchData();

    setTimeout(() => {
      console.log("list =>", this.biaya());
    }, 5000);
  }

  protected fetchData(): void {
    const dates = this.dateRange();
    let startDate, endDate;
    if (dates && dates.length === 2 && dates[0] && dates[1]) {
      startDate = dates[0].toISOString().split('T')[0];
      endDate = dates[1].toISOString().split('T')[0];
    } else {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
    }
    this.store.dispatch(new LoadLaporanBiaya({ startDate, endDate }));

    console.log("biaya =>", this.biaya());
  }

  protected exportPdf(): void {
    // Stub
  }

  protected exportExcel(): void {
    const data = this.biaya();
    if (data) {
      this.exportService.exportBiayaPerbaikan(data);
    }
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(n);
  }
}
