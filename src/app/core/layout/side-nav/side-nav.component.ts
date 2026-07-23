import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Route, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngxs/store';

import { APP_ENV } from '@core/data-access/app-env.token';
import { AuthState } from '@features/login/state';

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly permission?: string | readonly string[];
}
interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
  isVendorOnly?: boolean;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNavComponent {
  private readonly store = inject(Store);
  private readonly env = inject(APP_ENV);
  private readonly router = inject(Router);
  private readonly permissions = this.store.selectSignal(AuthState.permissions);
  private readonly routePermissions = new Map<string, readonly string[]>();

  protected readonly navGroups: readonly NavGroup[] = [
    {
      label: 'Menu Utama',
      items: [
        { label: 'Dashboard', icon: 'pi pi-th-large', route: '/dashboard' },
        {
          label: 'Data Kendaraan Dinas',
          icon: 'pi pi-truck',
          route: '/vehicles',
          permission: 'kendaraan.read',
        },
        {
          label: 'Pengajuan',
          icon: 'pi pi-file-edit',
          route: '/pengajuan',
          permission: 'pengajuan.read',
        },
        {
          label: 'Work Order',
          icon: 'pi pi-wrench',
          route: '/work-orders',
          permission: 'work_order.read',
        },
        {
          label: 'Lapor Darurat',
          icon: 'pi pi-exclamation-triangle',
          route: '/darurat',
          permission: 'darurat.read',
        },
        {
          label: 'Laporan',
          icon: 'pi pi-chart-pie',
          route: '/laporan/report-builder',
          permission: 'laporan.read',
        },
        { label: 'Audit Log', icon: 'pi pi-shield', route: '/audit', permission: 'audit_log.read' },
        {
          label: 'SHS Master',
          icon: 'pi pi-tags',
          route: '/admin/shs-master',
          permission: 'user.manage',
        },
        { label: 'Pengaturan', icon: 'pi pi-cog', route: '/admin', permission: 'user.manage' },
      ],
    },
    {
      label: 'Portal Vendor',
      isVendorOnly: true,
      items: [
        {
          label: 'Dashboard',
          icon: 'pi pi-chart-line',
          route: '/vendor/dashboard',
        },
        {
          label: 'Draft Checklist',
          icon: 'pi pi-list-check',
          route: '/vendor/draft-checklists',
          permission: 'draft_checklist.create',
        },
        {
          label: 'Penawaran & Invoice',
          icon: 'pi pi-receipt',
          route: '/vendor/penawaran-invoice',
          permission: 'penawaran.create',
        },
        {
          label: 'Riwayat WO',
          icon: 'pi pi-history',
          route: '/vendor/history',
          permission: 'penawaran.read',
        },
      ],
    },
    {
      label: 'Sistem',
      items: [{ label: 'Profil', icon: 'pi pi-user', route: '/profile' }],
    },
  ];

  protected readonly visibleNavGroups = computed<NavGroup[]>(() => {
    const perms = this.permissions();
    const userRole = this.store.selectSignal(AuthState.roles)();

    return this.navGroups
      .filter((group) => {
        // Jika group adalah vendor only, cek role
        if (group.isVendorOnly) {
          const allowedRoles: any = ['vendor', 'admin_sistem'];
          return allowedRoles.some((role: any) => userRole?.includes(role));
        }
        // Group lain tampil untuk semua (termasuk admin/user biasa)
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // if (item.route === '/dashboard' && userRole?.includes('vendor')) return false;
          return this.canShow(this.requiredPermissionsFor(item), perms);
        }),
      }))
      .filter((group) => group.items.length > 0);
  });

  ngOnInit(): void {
    this.indexRoutePermissions(this.router.config, '');
    this.validateNavConfig();
  }

  private requiredPermissionsFor(item: NavItem): readonly string[] {
    if (Array.isArray(item.permission)) return item.permission;
    if (typeof item.permission === 'string') return [item.permission];
    return this.routePermissions.get(item.route) ?? [];
  }

  private canShow(required: readonly string[], permissions: string[]): boolean {
    if (required.length === 0) return true;
    if (this.env.previewMode && permissions.length === 0) return true;
    return (
      permissions.includes('*') || required.some((permission) => permissions.includes(permission))
    );
  }

  private indexRoutePermissions(routes: readonly Route[], parentPath: string): void {
    for (const route of routes) {
      const currentPath = this.joinRoutePath(parentPath, route.path);
      const required = this.readRoutePermissions(route);
      if (currentPath) {
        this.routePermissions.set(currentPath, required);
      }
      if (route.children && route.children.length > 0) {
        this.indexRoutePermissions(route.children, currentPath);
      }
    }
  }

  private readRoutePermissions(route: Route): readonly string[] {
    const raw = route.data?.['requiredPermissions'];
    if (!Array.isArray(raw)) return [];
    return raw.filter((permission): permission is string => typeof permission === 'string');
  }

  private joinRoutePath(parentPath: string, currentPath: string | undefined): string {
    const parent = parentPath === '/' ? '' : parentPath;
    const current = currentPath ?? '';

    if (current.startsWith('/')) return current;
    if (current.length === 0) return parent.length === 0 ? '/' : parent;

    const merged = `${parent}/${current}`.replace(/\/{2,}/g, '/');
    return merged.startsWith('/') ? merged : `/${merged}`;
  }

  private validateNavConfig(): void {
    for (const group of this.navGroups) {
      for (const item of group.items) {
        const routePerms = this.routePermissions.get(item.route);
        if (!routePerms) {
          console.warn(`[SideNav] Route not found for menu item "${item.label}": ${item.route}`);
          continue;
        }

        const itemPerms = this.requiredPermissionsFor(item);
        if (itemPerms.length === 0 && routePerms.length > 0) {
          console.warn(
            `[SideNav] Menu item "${item.label}" has no permission but route requires: ${routePerms.join(', ')}`,
          );
          continue;
        }

        if (itemPerms.length > 0 && routePerms.length > 0) {
          const hasIntersection = itemPerms.some((permission) => routePerms.includes(permission));
          if (!hasIntersection) {
            console.warn(
              `[SideNav] Permission mismatch for "${item.label}". Item: ${itemPerms.join(', ')}. Route: ${routePerms.join(', ')}`,
            );
          }
        }
      }
    }
  }
}
