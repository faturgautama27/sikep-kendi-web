import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { AuthState } from '@features/login/state/auth.state';
import { DriversState } from '@features/drivers/state';
import { FuelState } from '@features/fuel/state';
import { RecordFuelTransaction } from '@features/fuel/state';
import type { FuelType } from '@shared/models';

interface FuelPriceMap {
  [key: string]: number;
}

const FUEL_PRICES: FuelPriceMap = {
  pertalite: 10000,
  pertamax: 13900,
  pertamax_turbo: 14600,
  dexlite: 14950,
  pertamina_dex: 15700,
  biosolar: 6800,
};

const FUEL_LABELS: Record<string, string> = {
  pertalite: 'Pertalite',
  pertamax: 'Pertamax',
  pertamax_turbo: 'Pertamax Turbo',
  dexlite: 'Dexlite',
  pertamina_dex: 'Pertamina Dex',
  biosolar: 'Biosolar',
};

@Component({
  selector: 'app-driver-fuel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './driver-fuel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverFuelComponent {
  private readonly store = inject(Store);

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly allTransactions = this.store.selectSignal(FuelState.transactions);

  protected readonly currentDriver = computed(() => {
    const u = this.user();
    if (!u) return null;
    return this.store.selectSignal(DriversState.list)().find(d => d.userId === u.id) ?? null;
  });

  protected readonly myAssignment = computed(() => {
    const driver = this.currentDriver();
    if (!driver) return null;
    return this.store.selectSignal(DriversState.activeAssignments)()
      .find(a => a.driverId === driver.id && a.mode === 'utama') ?? null;
  });

  protected readonly monthlyTransactions = computed(() => {
    const driver = this.currentDriver();
    if (!driver) return [];
    const now = new Date();
    return [...this.allTransactions()]
      .filter(t => {
        const d = new Date(t.tanggal);
        return t.driverId === driver.id &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
      })
      .sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));
  });

  // Form state
  protected readonly jenisBbm = signal<FuelType>('pertalite');
  protected readonly volumeLiter = signal<number | null>(null);
  protected readonly hargaPerLiter = computed(() => FUEL_PRICES[this.jenisBbm()] ?? 0);
  protected readonly totalNominal = computed(() => {
    const vol = this.volumeLiter();
    return vol != null ? vol * this.hargaPerLiter() : 0;
  });
  protected readonly odometer = signal<number | null>(null);
  protected readonly submitting = signal(false);
  protected readonly toastMessage = signal<string | null>(null);

  protected readonly fuelOptions: { value: FuelType; label: string }[] = [
    { value: 'pertalite', label: 'Pertalite' },
    { value: 'pertamax', label: 'Pertamax' },
    { value: 'pertamax_turbo', label: 'Pertamax Turbo' },
    { value: 'dexlite', label: 'Dexlite' },
    { value: 'biosolar', label: 'Biosolar' },
  ];

  protected getFuelLabel(type: string): string {
    return FUEL_LABELS[type] ?? type;
  }

  protected formatRupiah(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  protected takeFoto(): void {
    this.showToast('Fitur kamera akan tersedia di versi berikutnya.');
  }

  protected submitFuel(): void {
    const vol = this.volumeLiter();
    const odo = this.odometer();
    const driver = this.currentDriver();
    const assignment = this.myAssignment();

    if (!vol || vol <= 0) {
      this.showToast('Masukkan volume BBM yang valid.');
      return;
    }
    if (!odo || odo <= 0) {
      this.showToast('Masukkan nilai odometer yang valid.');
      return;
    }
    if (!driver || !assignment) {
      this.showToast('Belum ada kendaraan yang ditugaskan.');
      return;
    }

    this.submitting.set(true);

    this.store.dispatch(new RecordFuelTransaction({
      clientUuid: crypto.randomUUID(),
      vehicleId: assignment.vehicleId,
      vehiclePlate: assignment.vehiclePlate,
      driverId: driver.id,
      driverName: driver.nama,
      regulationVersionId: 'preview-reg-v1',
      tanggal: new Date().toISOString(),
      jenisBbm: this.jenisBbm(),
      volumeLiter: vol,
      hargaPerLiter: this.hargaPerLiter(),
      totalNominal: this.totalNominal(),
      odometerValue: odo,
      evidenceImageId: null,
      evidenceImage: null,
      overQuota: false,
      notes: '',
    }));

    setTimeout(() => {
      this.submitting.set(false);
      this.showToast(`Pengisian BBM ${vol} L berhasil dicatat!`);
      this.volumeLiter.set(null);
      this.odometer.set(null);
      this.jenisBbm.set('pertalite');
    }, 600);
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
