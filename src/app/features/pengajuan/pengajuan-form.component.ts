import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { StepsModule } from 'primeng/steps';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent } from '@core/layout';
import { VehiclesState } from '@features/vehicles/state/vehicles.state';
import { CreatePengajuan } from './state/pengajuan.actions';
import type { Vehicle } from '@shared/models';

type Step = 0 | 1 | 2;

@Component({
  selector: 'app-pengajuan-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    TextareaModule,
    RadioButtonModule,
    SelectModule,
    StepsModule,
    TagModule,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './pengajuan-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PengajuanFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly msg = inject(MessageService);

  protected readonly step = signal<Step>(0);
  protected readonly submitting = signal(false);
  protected readonly clientUuid = crypto.randomUUID();

  private readonly allVehicles = this.store.selectSignal(VehiclesState.list);
  protected readonly vehicleOpts = computed(() =>
    this.allVehicles()
      .filter((v) => v.status === 'active' || v.status === 'in_repair')
      .map((v) => ({ label: `${v.nomorPolisi} — ${v.merk} ${v.tipe}`, value: v.id })),
  );

  protected readonly steps = [
    { label: 'Data Kendaraan' },
    { label: 'Detail Kerusakan' },
    { label: 'Konfirmasi' },
  ];

  // Step 1 form
  protected readonly step1 = this.fb.group({
    vehicleId: ['', Validators.required],
    jenisPengajuan: ['servis_rutin', Validators.required],
    odometerSaatPengajuan: [0, [Validators.required, Validators.min(0)]],
  });

  // Step 2 form
  protected readonly step2 = this.fb.group({
    deskripsiKerusakan: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
    ],
  });

  protected readonly selectedVehicle = computed<Vehicle | null>(() => {
    const id = this.step1.get('vehicleId')!.value;
    return this.allVehicles().find((v) => v.id === id) ?? null;
  });

  ngOnInit(): void {}

  protected onVehicleChange(): void {
    const v = this.selectedVehicle();
    if (v) {
      this.step1.patchValue({ odometerSaatPengajuan: v.odometerCurrent });
    }
  }

  protected charCount(): number {
    return (this.step2.get('deskripsiKerusakan')!.value ?? '').length;
  }

  protected goStep(target: Step): void {
    if (target === 1) {
      this.step1.markAllAsTouched();
      if (this.step1.invalid) return;
    }
    if (target === 2) {
      this.step1.markAllAsTouched();
      this.step2.markAllAsTouched();
      if (this.step1.invalid || this.step2.invalid) return;
    }
    this.step.set(target);
  }

  protected onSubmit(): void {
    if (this.step1.invalid || this.step2.invalid) return;
    this.submitting.set(true);

    const v = this.selectedVehicle()!;
    const s1 = this.step1.getRawValue();
    const s2 = this.step2.getRawValue();

    this.store
      .dispatch(
        new CreatePengajuan({
          jenis: s1.jenisPengajuan === 'servis_rutin' ? 'preventive' : 'corrective',
          vehicleId: s1.vehicleId!,
          vehiclePlate: v.nomorPolisi,
          regulationVersionId: '',
          judul: `Pengajuan ${s1.jenisPengajuan === 'servis_rutin' ? 'Servis Rutin' : 'Perbaikan'} — ${v.nomorPolisi}`,
          deskripsi: s2.deskripsiKerusakan!,
          kategoriKerusakan: null,
          totalEstimasi: 0,
          createdBy: '',
          createdByName: '',
          sourceExecutionId: null,
          sourceItemId: null,
          spareparts: [],
          photos: [],
        }),
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.msg.add({ severity: 'success', summary: 'Pengajuan berhasil dikirim', detail: 'Menunggu verifikasi Pengurus Barang.' });
          setTimeout(() => this.router.navigate(['/pengajuan']), 1500);
        },
        error: () => {
          this.submitting.set(false);
          this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Terjadi kesalahan saat mengirim pengajuan.' });
        },
      });
  }
}
