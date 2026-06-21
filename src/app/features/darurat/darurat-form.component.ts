import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { PageHeaderComponent } from '@core/layout';

import { CreateDarurat } from './state';

@Component({
  selector: 'app-darurat-form',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule, PageHeaderComponent],
  templateUrl: './darurat-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaruratFormComponent {
  protected kendaraanId = '';
  protected kendaraanLabel = '';
  protected pengemudiNama = '';
  protected deskripsiDarurat = '';
  protected lokasiKejadian = '';
  protected totalPengeluaran = 0;

  protected readonly router = inject(Router);
  private readonly store = inject(Store);

  protected submit(): void {
    this.store.dispatch(
      new CreateDarurat({
        kendaraanId: this.kendaraanId,
        kendaraanLabel: this.kendaraanLabel,
        pengemudiNama: this.pengemudiNama,
        deskripsiDarurat: this.deskripsiDarurat,
        lokasiKejadian: this.lokasiKejadian,
        totalPengeluaran: Number(this.totalPengeluaran || 0),
      }),
    );
    this.router.navigateByUrl('/darurat');
  }
}
