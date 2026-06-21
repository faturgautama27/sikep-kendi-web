import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { permissionGuard } from '@core/auth/permission.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/login' },

  // ── Public ────────────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('@features/login').then((m) => m.LoginComponent),
  },
  {
    path: '403',
    loadComponent: () => import('@features/errors/forbidden.component').then((m) => m.ForbiddenComponent),
  },

  // ── Driver app shell (standalone, no sidebar) ────────────────────────────
  {
    path: 'driver',
    loadComponent: () => import('@features/driver-app/driver-shell.component').then(m => m.DriverShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('@features/driver-app/driver-home.component').then(m => m.DriverHomeComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('@features/driver-app/driver-notifications.component').then(m => m.DriverNotificationsComponent),
      },
    ],
  },

  // ── Authenticated shell wrapper ───────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('@core/layout').then((m) => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { title: 'Dashboard' },
      },
      {
        path: 'vehicles',
        loadComponent: () => import('@features/vehicles/vehicles-list.component').then((m) => m.VehiclesListComponent),
        canActivate: [permissionGuard],
        data: { title: 'Kendaraan', requiredPermissions: ['kendaraan.read'] },
      },
      {
        path: 'vehicles/new',
        loadComponent: () => import('@features/vehicles/vehicle-form.component').then((m) => m.VehicleFormComponent),
        canActivate: [permissionGuard],
        data: { title: 'Tambah Kendaraan', requiredPermissions: ['kendaraan.create'] },
      },
      {
        path: 'vehicles/:id/edit',
        loadComponent: () => import('@features/vehicles/vehicle-form.component').then((m) => m.VehicleFormComponent),
        canActivate: [permissionGuard],
        data: { title: 'Edit Kendaraan', requiredPermissions: ['kendaraan.create'] },
      },
      {
        path: 'vehicles/:id',
        loadComponent: () => import('@features/vehicles/vehicle-detail.component').then((m) => m.VehicleDetailComponent),
        canActivate: [permissionGuard],
        data: { title: 'Detail Kendaraan', requiredPermissions: ['kendaraan.read'] },
      },
      {
        path: 'pengajuan/new',
        loadComponent: () => import('@features/pengajuan/pengajuan-form.component').then((m) => m.PengajuanFormComponent),
        canActivate: [permissionGuard],
        data: { title: 'Buat Pengajuan', requiredPermissions: ['pengajuan.create'] },
      },
      {
        path: 'pengajuan/:id',
        loadComponent: () => import('@features/pengajuan/pengajuan-detail.component').then((m) => m.PengajuanDetailComponent),
        canActivate: [permissionGuard],
        data: { title: 'Detail Pengajuan', requiredPermissions: ['pengajuan.read'] },
      },
      {
        path: 'pengajuan',
        loadComponent: () => import('@features/pengajuan/pengajuan-list.component').then((m) => m.PengajuanListComponent),
        canActivate: [permissionGuard],
        data: { title: 'Pengajuan Pemeliharaan', requiredPermissions: ['pengajuan.read'] },
      },
      {
        path: 'work-orders',
        loadComponent: () => import('@features/work-orders/work-orders-list.component').then((m) => m.WorkOrdersListComponent),
        canActivate: [permissionGuard],
        data: { title: 'Work Order', requiredPermissions: ['work_order.read'] },
      },
      {
        path: 'work-orders/:id/draft-review',
        loadComponent: () => import('@features/work-orders/draft-review.component').then((m) => m.DraftReviewComponent),
        canActivate: [permissionGuard],
        data: { title: 'Review Draft Checklist', requiredPermissions: ['draft_checklist.review'] },
      },
      {
        path: 'work-orders/:id/verifikasi',
        loadComponent: () => import('@features/work-orders/verifikasi-work-order.component').then((m) => m.VerifikasiWorkOrderComponent),
        canActivate: [permissionGuard],
        data: { title: 'Verifikasi Harga', requiredPermissions: ['verifikasi.shs'] },
      },
      {
        path: 'work-orders/:id/pembayaran',
        loadComponent: () => import('@features/work-orders/pembayaran-work-order.component').then((m) => m.PembayaranWorkOrderComponent),
        canActivate: [permissionGuard],
        data: { title: 'Proses Pembayaran', requiredPermissions: ['pembayaran.proses'] },
      },
      {
        path: 'darurat',
        loadComponent: () => import('@features/darurat/darurat-list.component').then((m) => m.DaruratListComponent),
        canActivate: [permissionGuard],
        data: { title: 'Laporan Darurat', requiredPermissions: ['darurat.read'] },
      },
      {
        path: 'darurat/new',
        loadComponent: () => import('@features/darurat/darurat-form.component').then((m) => m.DaruratFormComponent),
        canActivate: [permissionGuard],
        data: { title: 'Buat Laporan Darurat', requiredPermissions: ['darurat.create'] },
      },
      {
        path: 'audit',
        loadComponent: () => import('@features/audit/audit-list.component').then((m) => m.AuditListComponent),
        canActivate: [permissionGuard],
        data: { title: 'Audit Trail', requiredPermissions: ['audit_log.read'] },
      },
      {
        path: 'vendor/dashboard',
        loadComponent: () => import('@features/vendor/vendor-dashboard.component').then((m) => m.VendorDashboardComponent),
        canActivate: [permissionGuard],
        data: { title: 'Portal Vendor Dashboard', requiredPermissions: ['work_order.read'] },
      },
      {
        path: 'vendor/work-orders',
        loadComponent: () => import('@features/vendor/vendor-work-orders.component').then((m) => m.VendorWorkOrdersComponent),
        canActivate: [permissionGuard],
        data: {
          title: 'Portal Vendor Notifikasi WO',
          requiredPermissions: ['work_order.read'],
          vendorView: 'notifikasi',
        },
      },
      {
        path: 'vendor/draft-checklists',
        loadComponent: () => import('@features/vendor/vendor-work-orders.component').then((m) => m.VendorWorkOrdersComponent),
        canActivate: [permissionGuard],
        data: {
          title: 'Portal Vendor Draft Checklist',
          requiredPermissions: ['draft_checklist.create'],
          vendorView: 'draft',
        },
      },
      {
        path: 'vendor/penawaran-invoice',
        loadComponent: () => import('@features/vendor/vendor-work-orders.component').then((m) => m.VendorWorkOrdersComponent),
        canActivate: [permissionGuard],
        data: {
          title: 'Portal Vendor Penawaran & Invoice',
          requiredPermissions: ['penawaran.create'],
          vendorView: 'penawaran',
        },
      },
      {
        path: 'vendor/riwayat',
        loadComponent: () => import('@features/vendor/vendor-work-orders.component').then((m) => m.VendorWorkOrdersComponent),
        canActivate: [permissionGuard],
        data: {
          title: 'Portal Vendor Riwayat',
          requiredPermissions: ['penawaran.read'],
          vendorView: 'riwayat',
        },
      },
      {
        path: 'vendor/work-orders/:id/draft',
        loadComponent: () => import('@features/vendor/vendor-draft-checklist.component').then((m) => m.VendorDraftChecklistComponent),
        canActivate: [permissionGuard],
        data: { title: 'Portal Vendor Draft Checklist', requiredPermissions: ['draft_checklist.create'] },
      },
      {
        path: 'vendor/work-orders/:id/penawaran',
        loadComponent: () => import('@features/vendor/vendor-penawaran.component').then((m) => m.VendorPenawaranComponent),
        canActivate: [permissionGuard],
        data: { title: 'Portal Vendor Penawaran', requiredPermissions: ['penawaran.create'] },
      },
      {
        path: 'vendor/history',
        loadComponent: () => import('@features/vendor/vendor-history.component').then((m) => m.VendorHistoryComponent),
        canActivate: [permissionGuard],
        data: { title: 'Riwayat WO Vendor', requiredPermissions: ['work_order.read'] },
      },
      {
        path: 'vendor/notifications',
        loadComponent: () => import('@features/vendor/vendor-notifications.component').then((m) => m.VendorNotificationsComponent),
        canActivate: [permissionGuard],
        data: { title: 'Notifikasi Vendor', requiredPermissions: ['work_order.read'] },
      },
      {
        path: 'admin',
        loadComponent: () => import('@features/admin/admin.component').then((m) => m.AdminComponent),
        canActivate: [permissionGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users' },
          {
            path: 'users',
            loadComponent: () => import('@features/admin/users-list/users-list.component').then((m) => m.UsersListComponent),
          },
          {
            path: 'roles',
            loadComponent: () => import('@features/admin/roles-list/roles-list.component').then((m) => m.RolesListComponent),
          },
          {
            path: 'vendors',
            loadComponent: () => import('@features/admin/vendor-management/vendor-management.component').then((m) => m.VendorManagementComponent),
          },
          {
            path: 'early-warning',
            loadComponent: () => import('@features/admin/early-warning-config/early-warning-config.component').then((m) => m.EarlyWarningConfigComponent),
          },
        ],
        data: { title: 'Admin', requiredPermissions: ['user.manage'] },
      },
      {
        path: 'profile',
        loadComponent: () => import('@features/profile/profile.component').then((m) => m.ProfileComponent),
        data: { title: 'Profil' },
      },
      {
        path: 'profile/notification-preferences',
        loadComponent: () => import('@features/profile/notification-preferences/notification-preferences.component').then((m) => m.NotificationPreferencesComponent),
        data: { title: 'Pengaturan Notifikasi' },
      },
    ],
  },

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () => import('@features/errors/not-found.component').then((m) => m.NotFoundComponent),
  },
];
