import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '@core/layout';

interface KomponenRow {
  id: string;
  namaKomponen: string;
  tanggalPasang: string;
  umurEstimasiBulan: number;
  kmGantiEstimasi: number;
  eweStatus: 'HIJAU' | 'KUNING' | 'MERAH';
  deleted?: boolean;
}

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TableModule, TagModule, PageHeaderComponent],
  templateUrl: './vehicle-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDetailComponent {
  protected namaKomponen = '';
  protected tanggalPasang = '';
  protected umurEstimasiBulan = 12;
  protected kmGantiEstimasi = 10000;

  private readonly komponen = signal<KomponenRow[]>([
    {
      id: 'kom-1',
      namaKomponen: 'Kampas Rem Depan',
      tanggalPasang: '2026-01-14',
      umurEstimasiBulan: 12,
      kmGantiEstimasi: 15000,
      eweStatus: 'KUNING',
    },
  ]);

  protected readonly activeKomponen = computed(() => this.komponen().filter((item) => !item.deleted));

  protected addKomponen(): void {
    if (!this.namaKomponen.trim()) return;
    const next: KomponenRow = {
      id: `kom-${Date.now()}`,
      namaKomponen: this.namaKomponen.trim(),
      tanggalPasang: this.tanggalPasang || new Date().toISOString().slice(0, 10),
      umurEstimasiBulan: Number(this.umurEstimasiBulan || 0),
      kmGantiEstimasi: Number(this.kmGantiEstimasi || 0),
      eweStatus: 'HIJAU',
    };
    this.komponen.set([next, ...this.komponen()]);
    this.namaKomponen = '';
  }

  protected softDelete(id: string): void {
    this.komponen.set(this.komponen().map((item) => (item.id === id ? { ...item, deleted: true } : item)));
  }

  protected eweSeverity(status: KomponenRow['eweStatus']): 'success' | 'warn' | 'danger' {
    if (status === 'HIJAU') return 'success';
    if (status === 'KUNING') return 'warn';
    return 'danger';
  }
}
