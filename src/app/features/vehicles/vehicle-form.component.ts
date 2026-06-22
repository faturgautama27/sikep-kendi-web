import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { PageHeaderComponent } from '@core/layout';
import { VehiclesState } from './state/vehicles.state';
import { CreateVehicle, UpdateVehicle, RetireVehicle } from './state/vehicles.actions';
import type { Vehicle } from '@shared/models';

interface SelectOpt { label: string; value: string }

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
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.vehicleId.set(id);
      const v = this.store.selectSnapshot(
        (state: { vehicles: { list: Vehicle[] } }) =>
          state.vehicles.list.find((x) => x.id === id),
      );
      if (v) {
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
        });
      }
    }
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
    const raw = this.form.getRawValue() as Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> & {
      baselinePhotos?: never[];
    };

    if (this.isEditMode()) {
      this.store.dispatch(new UpdateVehicle(this.vehicleId()!, raw));
      this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Data kendaraan berhasil diperbarui.' });
      this.saving.set(false);
      this.router.navigate(['/vehicles', this.vehicleId()]);
    } else {
      this.store
        .dispatch(new CreateVehicle({ ...raw, baselinePhotos: [] }))
        .subscribe({
          next: () => {
            this.msg.add({ severity: 'success', summary: 'Berhasil', detail: 'Kendaraan berhasil ditambahkan.' });
            this.saving.set(false);
            this.router.navigate(['/vehicles']);
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
