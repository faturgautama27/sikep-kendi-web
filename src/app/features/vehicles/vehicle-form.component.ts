import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';

import { PageHeaderComponent } from '@core/layout';
import { VehiclesState } from './state/vehicles.state';
import { CreateVehicle, UpdateVehicle, RetireVehicle } from './state/vehicles.actions';
import type { Vehicle } from '@shared/models';
import { VEHICLE_DATA, type VehicleDataPort } from '@core/data-access/ports/vehicle-data.port';

interface SelectOpt {
  label: string;
  value: string;
}

const STATUS_OPTS: SelectOpt[] = [
  { label: 'Aktif', value: 'active' },
  { label: 'Dalam Perbaikan', value: 'in_repair' },
  { label: 'Nonaktif', value: 'retired' },
];

const JENIS_OPTS: SelectOpt[] = [
  { label: 'Mobil', value: 'mobil' },
  { label: 'Motor', value: 'motor' },
  { label: 'Truk', value: 'truk' },
  { label: 'Bus', value: 'bus' },
  { label: 'Lainnya', value: 'lainnya' },
];

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    DatePickerModule,
    PageHeaderComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vehicle-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly dataPort = inject<VehicleDataPort>(VEHICLE_DATA);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly statusOpts = STATUS_OPTS;
  protected readonly jenisOpts = JENIS_OPTS;
  protected readonly isEditMode = signal(false);
  protected readonly vehicleId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly nopolConflict = signal(false);

  protected readonly form = this.fb.group({
    nomorPolisi: ['', [Validators.required, Validators.minLength(4)]],
    merk: ['', Validators.required],
    tipe: ['', Validators.required],
    tahun: [
      this.currentYear,
      [Validators.required, Validators.min(1990), Validators.max(this.currentYear)],
    ],
    jenisKendaraan: ['mobil', Validators.required],
    odometerCurrent: [0, [Validators.required, Validators.min(0)]],
    status: ['active', Validators.required],
    unitKerja: ['', Validators.required],
    nomorInventaris: [''],
    nomorRangka: [''],
    nomorMesin: [''],
    tanggalHabisPajak: [null as Date | null],
    tanggalHabisSTNK: [null as Date | null],
    // Early warning fields
    intervalServisHari: [null as number | null, [Validators.min(1)]],
    intervalServisKm: [null as number | null, [Validators.min(1)]],
    odometerServisTerakhir: [null as number | null, [Validators.min(0)]],
    paguTahunan: [null as number | null, [Validators.min(0)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.vehicleId.set(id);
      const v = this.store.selectSnapshot((state: { vehicles: { list: Vehicle[] } }) =>
        state.vehicles.list.find((x) => x.id === id),
      );
      if (v) {
        this.patchForm(v);
      } else {
        this.dataPort.getById(id).subscribe({
          next: (res) => this.patchForm(res),
          error: () =>
            this.msg.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Kendaraan tidak ditemukan.',
            }),
        });
      }
    }
  }

  private patchForm(v: Vehicle & { tanggalHabisPajak?: string; tanggalHabisSTNK?: string }): void {
    this.form.patchValue({
      nomorPolisi: v.nomorPolisi,
      merk: v.merk,
      tipe: v.tipe,
      tahun: v.tahun,
      jenisKendaraan: v.jenisKendaraan,
      odometerCurrent: v.odometerCurrent,
      status: v.status,
      unitKerja: v.unitKerja,
      nomorInventaris: v.nomorInventaris,
      nomorRangka: v.nomorRangka,
      nomorMesin: v.nomorMesin,
      tanggalHabisPajak: v.tanggalHabisPajak ? new Date(v.tanggalHabisPajak) : null,
      tanggalHabisSTNK: v.tanggalHabisSTNK ? new Date(v.tanggalHabisSTNK) : null,
      intervalServisHari: v.intervalServisHari ?? null,
      intervalServisKm: v.intervalServisKm ?? null,
      odometerServisTerakhir: v.odometerServisTerakhir ?? null,
      paguTahunan: v.paguTahunan ?? null,
    });
  }

  protected onNopolInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const upper = el.value.toUpperCase();
    this.form.get('nomorPolisi')!.setValue(upper, { emitEvent: false });
    this.nopolConflict.set(false);
  }

  get f(): { [k: string]: AbstractControl } {
    return this.form.controls;
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const rawFormValue = this.form.getRawValue();
    const raw = {
      ...rawFormValue,
      tanggalHabisPajak: rawFormValue.tanggalHabisPajak
        ? (rawFormValue.tanggalHabisPajak as Date).toISOString()
        : undefined,
      tanggalHabisSTNK: rawFormValue.tanggalHabisSTNK
        ? (rawFormValue.tanggalHabisSTNK as Date).toISOString()
        : undefined,
    } as unknown as Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> & {
      baselinePhotos?: never[];
    };

    if (this.isEditMode()) {
      this.store.dispatch(new UpdateVehicle(this.vehicleId()!, raw)).subscribe({
        next: () => {
          this.msg.add({
            severity: 'success',
            summary: 'Berhasil',
            detail: 'Data kendaraan berhasil diperbarui.',
          });
          this.saving.set(false);
          setTimeout(() => this.router.navigate(['/vehicles', this.vehicleId()]), 1500);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.msg.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message ?? 'Gagal menyimpan.',
          });
        },
      });
    } else {
      this.store.dispatch(new CreateVehicle({ ...raw, baselinePhotos: [] })).subscribe({
        next: () => {
          this.msg.add({
            severity: 'success',
            summary: 'Berhasil',
            detail: 'Kendaraan berhasil ditambahkan.',
          });
          this.saving.set(false);
          setTimeout(() => this.router.navigate(['/vehicles']), 1500);
        },
        error: (err: Error) => {
          this.saving.set(false);
          if (err?.message?.includes('409') || err?.message?.toLowerCase().includes('duplikat')) {
            this.nopolConflict.set(true);
          } else {
            this.msg.add({
              severity: 'error',
              summary: 'Error',
              detail: err?.message ?? 'Gagal menyimpan.',
            });
          }
        },
      });
    }
  }

  protected onNonaktifkan(): void {
    this.confirm.confirm({
      message:
        'Kendaraan ini akan dinonaktifkan dan tidak dapat menerima pengajuan baru. Lanjutkan?',
      header: 'Nonaktifkan Kendaraan',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Nonaktifkan',
      rejectLabel: 'Batal',
      acceptButtonStyleClass: 'danger',
      accept: () => {
        this.store.dispatch(new RetireVehicle(this.vehicleId()!));
        this.msg.add({ severity: 'warn', summary: 'Kendaraan dinonaktifkan.' });
        this.router.navigate(['/vehicles']);
      },
    });
  }

  protected onBatal(): void {
    if (this.form.dirty) {
      this.confirm.confirm({
        message: 'Perubahan belum disimpan, yakin ingin keluar?',
        header: 'Konfirmasi',
        icon: 'pi pi-question-circle',
        acceptLabel: 'Keluar',
        rejectLabel: 'Kembali',
        accept: () => this.router.navigate(['/vehicles']),
      });
    } else {
      this.router.navigate(['/vehicles']);
    }
  }
}
