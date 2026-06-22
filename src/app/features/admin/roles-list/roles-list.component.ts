import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

const ROLES = [
  { name: 'admin_sistem', display: 'Admin Sistem', icon: 'pi pi-cog', permissions: ['Semua permission sistem'] },
  { name: 'pengurus_barang', display: 'Pengurus Barang', icon: 'pi pi-box', permissions: ['kendaraan.read', 'kendaraan.create', 'kendaraan.update', 'pengajuan.verifikasi', 'draft_checklist.review'] },
  { name: 'verifikator', display: 'Verifikator', icon: 'pi pi-shield', permissions: ['work_order.read', 'verifikasi.shs', 'verifikasi.approve', 'darurat.reimburse', 'audit_log.read'] },
  { name: 'bendahara', display: 'Bendahara', icon: 'pi pi-wallet', permissions: ['work_order.read', 'pembayaran.proses', 'pembayaran.bukti', 'penawaran.read'] },
  { name: 'vendor', display: 'Vendor', icon: 'pi pi-building', permissions: ['work_order.read', 'draft_checklist.create', 'penawaran.create', 'penawaran.read'] },
  { name: 'pengemudi', display: 'Pengemudi', icon: 'pi pi-id-card', permissions: ['kendaraan.read', 'pengajuan.create', 'darurat.create', 'odometer.create'] },
];

@Component({
  selector: 'app-admin-roles-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-5">
      <!-- Header -->
      <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-primary-900">Roles & Permissions</h1>
          <p class="text-sm text-slate-500">Daftar role dan hak akses yang tersedia di SiKeP KenDI.</p>
        </div>
      </header>

      <!-- Filter bar -->
      <div class="flex flex-col gap-3 sikep-table-wrap p-4 shadow-sm md:flex-row md:items-end md:gap-4">
        <div class="flex flex-1 flex-col gap-1">
          <label for="search" class="text-xs font-medium text-slate-600">Cari role / permission</label>
          <span class="p-input-icon-left">
            <input
              pInputText
              id="search"
              class="w-full"
              placeholder="cth. admin atau work_order"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
            />
          </span>
        </div>
        <p-button
          icon="pi pi-filter-slash"
          label="Reset"
          severity="secondary"
          [text]="true"
          (onClick)="onResetFilter()"
        ></p-button>
      </div>

      <!-- Roles Grid -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        @for (role of filteredRoles(); track role.name) {
          <div class="rounded-xl border border-primary-100 bg-surface p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div class="flex items-center gap-3 mb-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <i [class]="role.icon + ' text-lg'"></i>
              </span>
              <div>
                <p class="font-semibold text-slate-800">{{ role.display }}</p>
                <code class="text-xs text-slate-500">{{ role.name }}</code>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              @for (perm of role.permissions; track perm) {
                <span class="rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">{{ perm }}</span>
              }
            </div>
          </div>
        }
        @if (filteredRoles().length === 0) {
          <div class="col-span-full py-10 text-center text-sm text-slate-500 rounded-xl border border-dashed border-slate-300">
            Tidak ada role yang cocok dengan filter.
          </div>
        }
      </div>
    </div>
  `,
})
export class RolesListComponent {
  protected readonly searchQuery = signal('');

  protected readonly filteredRoles = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return ROLES;
    
    return ROLES.filter(r => {
      const matchName = r.name.toLowerCase().includes(q) || r.display.toLowerCase().includes(q);
      const matchPerms = r.permissions.some(p => p.toLowerCase().includes(q));
      return matchName || matchPerms;
    });
  });

  protected onResetFilter(): void {
    this.searchQuery.set('');
  }
}
