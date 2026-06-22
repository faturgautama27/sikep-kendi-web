import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { LoadVehicles } from '@features/vehicles/state/vehicles.actions';
import { CreatePengajuan, UpdatePengajuan } from './state/pengajuan.actions';
import { PENGAJUAN_DATA } from '@core/data-access/ports/pengajuan-data.port';
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
  private readonly route = inject(ActivatedRoute);
  private readonly msg = inject(MessageService);
  private readonly dataPort = inject(PENGAJUAN_DATA);

  protected readonly step = signal<Step>(0);
  protected readonly submitting = signal(false);
  protected readonly clientUuid = crypto.randomUUID();
  protected readonly pengajuanId = signal<string | null>(null);
  protected readonly isEditMode = computed(() => !!this.pengajuanId());

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

  protected readonly vehicleIdValue = toSignal(this.step1.controls.vehicleId.valueChanges, {
    initialValue: this.step1.controls.vehicleId.value,
  });

  protected readonly selectedVehicle = computed<Vehicle | null>(() => {
    const id = this.vehicleIdValue();
    return this.allVehicles().find((v) => String(v.id) === String(id)) ?? null;
  });

  ngOnInit(): void {
    // Pastikan data kendaraan terload jika mengakses url secara direct
    if (this.allVehicles().length === 0) {
      this.store.dispatch(new LoadVehicles());
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.pengajuanId.set(id);
      this.dataPort.getById(id).subscribe({
        next: (res) => {
          this.step1.patchValue({
            vehicleId: res.vehicleId,
            jenisPengajuan: res.jenis.toLowerCase(),
            odometerSaatPengajuan: res.odometerSaatPengajuan ?? 0,
          });
          this.step2.patchValue({
            deskripsiKerusakan: res.deskripsi,
          });
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data pengajuan' }),
      });
    }
  }

  protected onVehicleChange(): void {
    const v = this.selectedVehicle();
    if (v && !this.isEditMode()) {
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

    const input = {
      jenis: s1.jenisPengajuan === 'servis_rutin' ? 'SERVIS_RUTIN' as const : 'PERBAIKAN_KERUSAKAN' as const,
      vehicleId: s1.vehicleId!,
      vehiclePlate: v.nomorPolisi,
      regulationVersionId: '',
      judul: `Pengajuan ${s1.jenisPengajuan === 'servis_rutin' ? 'Servis Rutin' : 'Perbaikan'} — ${v.nomorPolisi}`,
      deskripsi: s2.deskripsiKerusakan!,
      kategoriKerusakan: null,
      totalEstimasi: s1.odometerSaatPengajuan ?? 0, // Temporarily map to totalEstimasi to send to backend, handled by ApiData layer
      createdBy: '',
      createdByName: '',
      sourceExecutionId: null,
      sourceItemId: null,
      spareparts: [],
      photos: [],
    };

    const action = this.isEditMode() 
      ? new UpdatePengajuan(this.pengajuanId()!, {
          vehicleId: input.vehicleId,
          jenis: input.jenis,
          deskripsi: input.deskripsi,
          odometerSaatPengajuan: s1.odometerSaatPengajuan ?? 0,
        }) 
      : new CreatePengajuan(input);

    this.store.dispatch(action).subscribe({
      next: () => {
        this.submitting.set(false);
        this.msg.add({ 
          severity: 'success', 
          summary: this.isEditMode() ? 'Pengajuan diupdate' : 'Pengajuan berhasil dikirim', 
          detail: 'Menunggu verifikasi Pengurus Barang.' 
        });
        setTimeout(() => this.router.navigate(['/pengajuan']), 1500);
      },
      error: () => {
        this.submitting.set(false);
        this.msg.add({ severity: 'error', summary: 'Gagal', detail: 'Terjadi kesalahan saat menyimpan pengajuan.' });
      },
    });
  }
}
