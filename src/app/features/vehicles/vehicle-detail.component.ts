import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { AbstractControl, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { DatePipe } from '@angular/common';

import { APP_ENV } from '@core/data-access/app-env.token';
import { VEHICLE_DATA, type VehicleDataPort } from '@core/data-access/ports/vehicle-data.port';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';

import { PageHeaderComponent } from '@core/layout';
import { VehiclesState } from './state/vehicles.state';
import { CreateVehicle, UpdateVehicle, RetireVehicle } from './state/vehicles.actions';
import type { Vehicle, VehicleStatus } from '@shared/models';

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
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    ButtonModule,
    DatePickerModule,
    ConfirmDialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
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
  private readonly env = inject(APP_ENV);
  private readonly dataPort = inject<VehicleDataPort>(VEHICLE_DATA);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly statusOpts = STATUS_OPTS;
  protected readonly jenisOpts = JENIS_OPTS;

  protected readonly vehicleId = signal<string>('');
  protected readonly vehicle = signal<Vehicle | null>(null);
  protected readonly isCreateMode = signal(false);
  protected readonly isEditMode = signal(false);
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
    intervalServisHari: [null as number | null, [Validators.min(1)]],
    intervalServisKm: [null as number | null, [Validators.min(1)]],
    odometerServisTerakhir: [null as number | null, [Validators.min(0)]],
    paguTahunan: [null as number | null, [Validators.min(0)]],
  });

  get f(): { [k: string]: AbstractControl } {
    return this.form.controls;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    // Mode create — route /vehicles/new
    if (!id || id === 'new') {
      this.isCreateMode.set(true);
      this.isEditMode.set(true);
      this.form.enable();
      return;
    }

    this.vehicleId.set(id);

    const cached = this.store.selectSnapshot(
      (state: { vehicles: { list: Vehicle[] } }) =>
        state.vehicles.list.find((x) => x.id === id),
    );
    if (cached) {
      this.vehicle.set(cached);
      this.patchForm(cached);
    } else {
      this.dataPort.getById(id).subscribe({
        next: (res) => {
          this.vehicle.set(res);
          this.patchForm(res);
        },
        error: () =>
          this.msg.add({ severity: 'error', summary: 'Error', detail: 'Kendaraan tidak ditemukan.' }),
      });
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
    // Start in read-only mode
    this.form.disable();
  }

  protected toggleEdit(): void {
    if (this.isEditMode()) {
      // Cancel — revert to saved state
      this.patchForm(this.vehicle()!);
      this.isEditMode.set(false);
      this.nopolConflict.set(false);
    } else {
      this.form.enable();
      this.isEditMode.set(true);
    }
  }

  protected onNopolInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.form.get('nomorPolisi')!.setValue(el.value.toUpperCase(), { emitEvent: false });
    this.nopolConflict.set(false);
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
    } as unknown as Partial<Vehicle>;

    if (this.isCreateMode()) {
      this.store.dispatch(new CreateVehicle({ ...(raw as Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>), baselinePhotos: [] })).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Kendaraan berhasil ditambahkan.' });
          this.saving.set(false);
          setTimeout(() => this.router.navigate(['/vehicles']), 1500);
        },
        error: (err: Error) => {
          this.saving.set(false);
          if (err?.message?.includes('409') || err?.message?.toLowerCase().includes('duplikat')) {
            this.nopolConflict.set(true);
          } else {
            this.msg.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'Gagal menyimpan.' });
          }
        },
      });
      return;
    }

    this.store.dispatch(new UpdateVehicle(this.vehicleId(), raw)).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Data kendaraan berhasil diperbarui.' });
        this.saving.set(false);
        this.isEditMode.set(false);
        this.form.disable();
        // Update local vehicle signal
        this.vehicle.set({ ...this.vehicle()!, ...raw } as Vehicle);
      },
      error: (err: Error) => {
        this.saving.set(false);
        if (err?.message?.includes('409') || err?.message?.toLowerCase().includes('duplikat')) {
          this.nopolConflict.set(true);
        } else {
          this.msg.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'Gagal menyimpan.' });
        }
      },
    });
  }

  protected onNonaktifkan(): void {
    this.confirm.confirm({
      message: 'Kendaraan ini akan dinonaktifkan dan tidak dapat menerima pengajuan baru. Lanjutkan?',
      header: 'Nonaktifkan Kendaraan',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Nonaktifkan',
      rejectLabel: 'Batal',
      acceptButtonStyleClass: 'danger',
      accept: () => {
        this.store.dispatch(new RetireVehicle(this.vehicleId()));
        this.msg.add({ severity: 'warn', summary: 'Kendaraan dinonaktifkan.' });
        this.router.navigate(['/vehicles']);
      },
    });
  }

  protected statusSeverity(s: VehicleStatus): 'success' | 'warn' | 'secondary' {
    return s === 'active' ? 'success' : s === 'in_repair' ? 'warn' : 'secondary';
  }

  protected statusLabel(s: VehicleStatus): string {
    return s === 'active' ? 'Aktif' : s === 'in_repair' ? 'Dalam Perbaikan' : 'Nonaktif';
  }
}
