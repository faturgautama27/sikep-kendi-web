import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';

import { PageHeaderComponent } from '@core/layout';
import { ShsMasterState, LoadShsMaster, CreateShsMaster, UpdateShsMaster } from './state';
import { ShsMaster } from '@shared/models/shs-master';

@Component({
  selector: 'app-shs-master-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    TextareaModule,
    PageHeaderComponent,
  ],
  templateUrl: './shs-master-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShsMasterListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  protected readonly list: any = this.store.selectSignal(ShsMasterState.list);
  protected readonly loading = signal(false);

  protected displayDialog = false;
  protected isEditMode = false;
  protected currentId: number | null = null;
  protected submitting = false;

  protected readonly form: FormGroup = this.fb.group({
    kodeItem: [''],
    namaItem: ['', Validators.required],
    satuan: ['PCS', Validators.required],
    hargaMaksimum: [0, [Validators.required, Validators.min(0)]],
    sumberReferensi: [''],
    keterangan: [''],
    isAktif: [true],
  });

  ngOnInit(): void {
    this.store.dispatch(new LoadShsMaster());
  }

  protected openCreateDialog(): void {
    this.isEditMode = false;
    this.currentId = null;
    this.form.reset({
      kodeItem: '',
      namaItem: '',
      satuan: 'PCS',
      hargaMaksimum: 0,
      isAktif: true,
    });
    this.displayDialog = true;
  }

  protected openEditDialog(item: ShsMaster): void {
    this.isEditMode = true;
    this.currentId = item.id;
    this.form.patchValue({
      kodeItem: item.kodeItem,
      namaItem: item.namaItem,
      satuan: item.satuan,
      hargaMaksimum: item.hargaMaksimum,
      sumberReferensi: item.sumberReferensi,
      keterangan: item.keterangan,
      isAktif: item.isAktif,
    });
    this.displayDialog = true;
  }

  protected closeDialog(): void {
    this.displayDialog = false;
  }

  protected save(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    const val = this.form.getRawValue();

    let action;
    if (this.isEditMode && this.currentId) {
      action = new UpdateShsMaster(this.currentId, val);
    } else {
      action = new CreateShsMaster(val);
    }

    this.store.dispatch(action).subscribe({
      next: () => {
        this.submitting = false;
        this.closeDialog();
        this.store.dispatch(new LoadShsMaster());
      },
      error: () => {
        this.submitting = false;
      },
    });
  }

  protected toggleStatus(item: ShsMaster): void {
    this.store.dispatch(new UpdateShsMaster(item.id, { isAktif: !item.isAktif })).subscribe({
      next: () => this.store.dispatch(new LoadShsMaster()),
    });
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  }
}
