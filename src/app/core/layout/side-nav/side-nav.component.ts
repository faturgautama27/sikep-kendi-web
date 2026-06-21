import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem { readonly label: string; readonly icon: string; readonly route: string; }
interface NavGroup { readonly label: string; readonly items: readonly NavItem[]; }

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNavComponent {
  protected readonly navGroups: readonly NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: 'pi pi-th-large', route: '/dashboard' },
        { label: 'Analytics', icon: 'pi pi-chart-bar', route: '/analytics' },
      ],
    },
    {
      label: 'Master Data',
      items: [
        { label: 'Kendaraan', icon: 'pi pi-truck', route: '/vehicles' },
        { label: 'Regulasi', icon: 'pi pi-book', route: '/regulations' },
        { label: 'Sparepart & Vendor', icon: 'pi pi-box', route: '/spareparts' },
        { label: 'Supir', icon: 'pi pi-id-card', route: '/drivers' },
      ],
    },
    {
      label: 'Operasional',
      items: [
        { label: 'Checklist Rutin', icon: 'pi pi-list-check', route: '/checklist-templates' },
        { label: 'Eksekusi Checklist', icon: 'pi pi-check-square', route: '/checklist-executions' },
        { label: 'Pengajuan', icon: 'pi pi-file-edit', route: '/pengajuan' },
        { label: 'Order Kerja', icon: 'pi pi-wrench', route: '/work-orders' },
        { label: 'BBM', icon: 'pi pi-bolt', route: '/fuel' },
      ],
    },
    {
      label: 'Laporan',
      items: [
        { label: 'SPJ Rekonsiliasi', icon: 'pi pi-receipt', route: '/spj' },
        { label: 'Audit Trail', icon: 'pi pi-shield', route: '/audit' },
      ],
    },
    {
      label: 'Sistem',
      items: [
        { label: 'Apps Supir', icon: 'pi pi-mobile', route: '/driver' },
        { label: 'Admin', icon: 'pi pi-cog', route: '/admin' },
        { label: 'Profil', icon: 'pi pi-user', route: '/profile' },
      ],
    },
  ];
}
