import { ChangeDetectionStrategy, Component } from '@angular/core';
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
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-5">
      <header>
        <h2 class="text-xl font-bold text-primary-900">Roles & Permissions</h2>
        <p class="text-sm text-slate-500">Daftar role dan hak akses yang tersedia di SiKeP KenDI.</p>
      </header>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        @for (role of roles; track role.name) {
          <div class="rounded-xl border border-primary-100 bg-surface p-4 shadow-sm">
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
      </div>
    </div>
  `,
})
export class RolesListComponent {
  protected readonly roles = ROLES;
}
