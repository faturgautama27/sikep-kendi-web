import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';

import { PageHeaderComponent } from '@core/layout';
import type { Vehicle, Komponen, KomponenEweStatus } from '@shared/models';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TagModule,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vehicle-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly vehicleId = signal<string>('');
  protected readonly vehicle = signal<Vehicle | null>(null);
  protected readonly today = new Date();

  private readonly komponenList = signal<Komponen[]>([
    {
      id: 'kom-1',
      kendaraanId: '',
      namaKomponen: 'Kampas Rem Depan',
      tanggalPasang: '2026-01-14',
      umurEstimasiBulan: 12,
      kmGantiEstimasi: 15000,
      eweStatus: 'KUNING',
    },
    {
      id: 'kom-2',
      kendaraanId: '',
      namaKomponen: 'Oli Mesin',
      tanggalPasang: '2026-04-01',
      umurEstimasiBulan: 6,
      kmGantiEstimasi: 10000,
      eweStatus: 'HIJAU',
    },
  ]);

  protected readonly activeKomponen = computed(() =>
    this.komponenList().filter((k) => !k.isDeleted),
  );

  protected readonly dialogVisible = signal(false);
  protected readonly editingKomponenId = signal<string | null>(null);

  protected readonly komponenForm = this.fb.group({
    namaKomponen: ['', [Validators.required, Validators.minLength(2)]],
    tanggalPasang: [null as Date | null, Validators.required],
    umurEstimasiBulan: [12, [Validators.required, Validators.min(1), Validators.max(360)]],
    kmGantiEstimasi: [10000, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.vehicleId.set(id);
    const v = this.store.selectSnapshot(
      (state: { vehicles: { list: Vehicle[] } }) =>
        state.vehicles.list.find((x) => x.id === id),
    );
    if (v) this.vehicle.set(v);
  }

  protected openAddDialog(): void {
    this.editingKomponenId.set(null);
    this.komponenForm.reset({ umurEstimasiBulan: 12, kmGantiEstimasi: 10000 });
    this.dialogVisible.set(true);
  }

  protected openEditDialog(k: Komponen): void {
    this.editingKomponenId.set(k.id);
    this.komponenForm.patchValue({
      namaKomponen: k.namaKomponen,
      tanggalPasang: new Date(k.tanggalPasang),
      umurEstimasiBulan: k.umurEstimasiBulan,
      kmGantiEstimasi: k.kmGantiEstimasi,
    });
    this.dialogVisible.set(true);
  }

  protected saveKomponen(): void {
    if (this.komponenForm.invalid) {
      this.komponenForm.markAllAsTouched();
      return;
    }
    const raw = this.komponenForm.getRawValue();
    const tanggal = (raw.tanggalPasang as Date).toISOString().slice(0, 10);
    const editId = this.editingKomponenId();
    if (editId) {
      this.komponenList.update((list) =>
        list.map((k) =>
          k.id === editId
            ? { ...k, namaKomponen: raw.namaKomponen!, tanggalPasang: tanggal,
                umurEstimasiBulan: raw.umurEstimasiBulan!, kmGantiEstimasi: raw.kmGantiEstimasi!,
                eweStatus: this.calcEwe(raw.umurEstimasiBulan!, tanggal) }
            : k,
        ),
      );
      this.msg.add({ severity: 'success', summary: 'Komponen diperbarui.' });
    } else {
      const newK: Komponen = {
        id: `kom-${Date.now()}`,
        kendaraanId: this.vehicleId(),
        namaKomponen: raw.namaKomponen!,
        tanggalPasang: tanggal,
        umurEstimasiBulan: raw.umurEstimasiBulan!,
        kmGantiEstimasi: raw.kmGantiEstimasi!,
        eweStatus: this.calcEwe(raw.umurEstimasiBulan!, tanggal),
      };
      this.komponenList.update((list) => [newK, ...list]);
      this.msg.add({ severity: 'success', summary: 'Komponen ditambahkan.' });
    }
    this.dialogVisible.set(false);
  }

  protected confirmDelete(k: Komponen): void {
    this.confirm.confirm({
      message: `Hapus komponen "${k.namaKomponen}"? Data riwayat tetap tersimpan.`,
      header: 'Hapus Komponen',
      icon: 'pi pi-trash',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      accept: () => {
        this.komponenList.update((list) =>
          list.map((item) => (item.id === k.id ? { ...item, isDeleted: true } : item)),
        );
        this.msg.add({ severity: 'info', summary: 'Komponen dihapus.' });
      },
    });
  }

  private calcEwe(umurBulan: number, tanggalPasang: string): KomponenEweStatus {
    const pasang = new Date(tanggalPasang);
    const now = new Date();
    const bulanTerpakai =
      (now.getFullYear() - pasang.getFullYear()) * 12 + (now.getMonth() - pasang.getMonth());
    const sisa = umurBulan - bulanTerpakai;
    if (sisa <= 0) return 'MERAH';
    if (sisa <= 3) return 'KUNING';
    return 'HIJAU';
  }

  protected eweSeverity(status: KomponenEweStatus): 'success' | 'warn' | 'danger' {
    return status === 'HIJAU' ? 'success' : status === 'KUNING' ? 'warn' : 'danger';
  }

  protected eweLabel(status: KomponenEweStatus): string {
    return status === 'HIJAU' ? 'Normal' : status === 'KUNING' ? 'Mendekati Batas' : 'Melewati Batas';
  }

  protected sisaBulan(k: Komponen): number {
    const pasang = new Date(k.tanggalPasang);
    const now = new Date();
    return k.umurEstimasiBulan -
      ((now.getFullYear() - pasang.getFullYear()) * 12 + (now.getMonth() - pasang.getMonth()));
  }

  protected sisaKm(k: Komponen): number {
    return k.kmGantiEstimasi - (this.vehicle()?.odometerCurrent ?? 0);
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
}
