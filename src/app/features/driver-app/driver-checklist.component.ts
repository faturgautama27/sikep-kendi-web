import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

import { AuthState } from '@features/login/state/auth.state';
import { DriversState } from '@features/drivers/state';
import { ChecklistTemplatesState } from '@features/checklist/state';
import { ChecklistExecutionsState } from '@features/checklist/state';
import { SubmitChecklistExecution } from '@features/checklist/state';
import type {
  ChecklistTemplate,
  ChecklistItem,
  AnswerStatus,
} from '@shared/models';

interface ItemAnswer {
  itemId: string;
  itemName: string;
  itemCategory: string;
  wajibFoto: boolean;
  status: AnswerStatus | null;
  notes: string;
  photoDataUrl: string | null;   // base64 preview
  photoFile: File | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  rem: 'pi pi-stop-circle',
  lampu: 'pi pi-sun',
  ban: 'pi pi-circle',
  oli: 'pi pi-droplet',
  dokumen: 'pi pi-file',
  body: 'pi pi-car',
  mesin: 'pi pi-cog',
  kustom: 'pi pi-wrench',
};

@Component({
  selector: 'app-driver-checklist',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './driver-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverChecklistComponent {
  private readonly store = inject(Store);

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly templates = this.store.selectSignal(ChecklistTemplatesState.list);
  protected readonly templateVersions = this.store.selectSignal(ChecklistTemplatesState.versions);
  protected readonly activeAssignments = this.store.selectSignal(DriversState.activeAssignments);
  protected readonly executions = this.store.selectSignal(ChecklistExecutionsState.list);

  protected readonly currentDriver = computed(() => {
    const u = this.user();
    if (!u) return null;
    return this.store.selectSignal(DriversState.list)().find(d => d.userId === u.id) ?? null;
  });

  protected readonly myAssignment = computed(() => {
    const driver = this.currentDriver();
    if (!driver) return null;
    return this.activeAssignments().find(a => a.driverId === driver.id && a.mode === 'utama') ?? null;
  });

  protected readonly todayExecutedTemplateVersionIds = computed(() => {
    const today = new Date().toDateString();
    return new Set(
      this.executions()
        .filter(e => new Date(e.startedAt).toDateString() === today)
        .map(e => e.templateVersionId)
    );
  });

  protected readonly activeTemplates = computed(() =>
    this.templates().filter(t => t.active)
  );

  // Drawer state
  protected readonly activeTemplate = signal<ChecklistTemplate | null>(null);
  protected readonly itemAnswers = signal<ItemAnswer[]>([]);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly toastMessage = signal<string | null>(null);

  protected getVersionItems(template: ChecklistTemplate): ChecklistItem[] {
    const version = this.templateVersions().find(v => v.id === template.currentVersionId);
    return [...(version?.items ?? [])].sort((a, b) => a.ordering - b.ordering);
  }

  protected isTemplateDone(template: ChecklistTemplate): boolean {
    return this.todayExecutedTemplateVersionIds().has(template.currentVersionId);
  }

  protected getCategoryIcon(category: string): string {
    return CATEGORY_ICONS[category] ?? 'pi pi-check';
  }

  protected getFrequencyLabel(template: ChecklistTemplate): string {
    const freq = template.frequency;
    switch (freq.kind) {
      case 'daily': return 'Harian';
      case 'weekly': return 'Mingguan';
      case 'monthly': return 'Bulanan';
      case 'every_km': return `Setiap ${freq.everyKm?.toLocaleString('id-ID') ?? '?'} km`;
    }
  }

  protected openChecklist(template: ChecklistTemplate): void {
    if (this.isTemplateDone(template)) return;
    const items = this.getVersionItems(template);
    this.itemAnswers.set(
      items.map(item => ({
        itemId: item.id,
        itemName: item.nama,
        itemCategory: item.kategori,
        wajibFoto: item.wajibFoto,
        status: null,
        notes: '',
        photoDataUrl: null,
        photoFile: null,
      }))
    );
    this.activeTemplate.set(template);
    this.submitted.set(false);
  }

  protected closeDrawer(): void {
    this.activeTemplate.set(null);
  }

  protected setItemStatus(index: number, status: AnswerStatus): void {
    this.itemAnswers.update(answers => {
      const updated = [...answers];
      updated[index] = { ...updated[index], status };
      return updated;
    });
  }

  protected setItemNotes(index: number, notes: string): void {
    this.itemAnswers.update(answers => {
      const updated = [...answers];
      updated[index] = { ...updated[index], notes };
      return updated;
    });
  }

  protected get allAnswered(): boolean {
    return this.itemAnswers().every(a => {
      if (a.status === null) return false;
      // wajib_foto: harus ada foto sebelum bisa OK
      if (a.wajibFoto && a.status === 'ok' && !a.photoDataUrl) return false;
      return true;
    });
  }

  /** Handle file input change — baca sebagai base64 untuk preview */
  protected handlePhotoCapture(index: number, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.itemAnswers.update(answers => {
        const updated = [...answers];
        updated[index] = {
          ...updated[index],
          photoDataUrl: reader.result as string,
          photoFile: file,
        };
        return updated;
      });
    };
    reader.readAsDataURL(file);
  }

  /** Hapus foto dari item */
  protected removePhoto(index: number): void {
    this.itemAnswers.update(answers => {
      const updated = [...answers];
      updated[index] = { ...updated[index], photoDataUrl: null, photoFile: null };
      return updated;
    });
  }

  protected submitChecklist(): void {
    if (!this.allAnswered) {
      this.showToast('Lengkapi semua item checklist terlebih dahulu.');
      return;
    }
    const template = this.activeTemplate();
    const driver = this.currentDriver();
    const assignment = this.myAssignment();
    if (!template || !driver || !assignment) return;

    this.submitting.set(true);
    const answers = this.itemAnswers();
    const okCount = answers.filter(a => a.status === 'ok').length;
    const notOkCount = answers.filter(a => a.status === 'tidak_ok').length;
    const now = new Date().toISOString();

    this.store.dispatch(new SubmitChecklistExecution({
      clientUuid: crypto.randomUUID(),
      templateVersionId: template.currentVersionId,
      templateName: template.nama,
      vehicleId: assignment.vehicleId,
      vehiclePlate: assignment.vehiclePlate,
      driverId: driver.id,
      driverName: driver.nama,
      startedAt: now,
      completedAt: now,
      status: 'completed',
      gpsLat: null,
      gpsLng: null,
      answers: answers.map(a => ({
        id: crypto.randomUUID(),
        executionId: '',
        itemId: a.itemId,
        itemName: a.itemName,
        itemCategory: a.itemCategory as never,
        status: a.status as AnswerStatus,
        measurementValue: null,
        notes: a.notes,
        imageIds: [],
        images: [],
      })),
      totalItems: answers.length,
      okCount,
      notOkCount,
    }));

    setTimeout(() => {
      this.submitting.set(false);
      this.submitted.set(true);
      this.showToast(`Checklist "${template.nama}" berhasil disimpan! ${okCount} OK, ${notOkCount} Tidak OK.`);
      setTimeout(() => this.closeDrawer(), 1500);
    }, 600);
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
