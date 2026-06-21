import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

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
        path: 'checklist',
        loadComponent: () => import('@features/driver-app/driver-checklist.component').then(m => m.DriverChecklistComponent),
      },
      {
        path: 'checklist-history',
        loadComponent: () => import('@features/driver-app/driver-checklist-history.component').then(m => m.DriverChecklistHistoryComponent),
      },
      {
        path: 'fuel',
        loadComponent: () => import('@features/driver-app/driver-fuel.component').then(m => m.DriverFuelComponent),
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
        data: { title: 'Kendaraan' },
      },
      {
        path: 'regulations',
        loadComponent: () => import('@features/regulations/regulations-list.component').then((m) => m.RegulationsListComponent),
        data: { title: 'Regulasi' },
      },
      {
        path: 'spareparts',
        loadComponent: () => import('@features/spareparts/spareparts-list.component').then((m) => m.SparepartsListComponent),
        data: { title: 'Sparepart & Vendor' },
      },
      {
        path: 'drivers',
        loadComponent: () => import('@features/drivers/drivers-list.component').then((m) => m.DriversListComponent),
        data: { title: 'Supir' },
      },
      {
        path: 'checklist-templates',
        loadComponent: () => import('@features/checklist/checklist-templates.component').then((m) => m.ChecklistTemplatesComponent),
        data: { title: 'Template Checklist' },
      },
      {
        path: 'checklist-executions',
        loadComponent: () => import('@features/checklist/checklist-executions.component').then((m) => m.ChecklistExecutionsComponent),
        data: { title: 'Eksekusi Checklist' },
      },
      {
        path: 'pengajuan',
        loadComponent: () => import('@features/pengajuan/pengajuan-list.component').then((m) => m.PengajuanListComponent),
        data: { title: 'Pengajuan Pemeliharaan' },
      },
      {
        path: 'work-orders',
        loadComponent: () => import('@features/work-orders/work-orders-list.component').then((m) => m.WorkOrdersListComponent),
        data: { title: 'Order Kerja' },
      },
      {
        path: 'fuel',
        loadComponent: () => import('@features/fuel/fuel-list.component').then((m) => m.FuelListComponent),
        data: { title: 'BBM' },
      },
      {
        path: 'spj',
        loadComponent: () => import('@features/spj/spj-list.component').then((m) => m.SpjListComponent),
        data: { title: 'SPJ Rekonsiliasi' },
      },
      {
        path: 'audit',
        loadComponent: () => import('@features/audit/audit-list.component').then((m) => m.AuditListComponent),
        data: { title: 'Audit Trail' },
      },
      {
        path: 'analytics',
        loadComponent: () => import('@features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
        data: { title: 'Analytics' },
      },
      {
        path: 'admin',
        loadComponent: () => import('@features/admin/admin.component').then((m) => m.AdminComponent),
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
            path: 'approval-policies',
            loadComponent: () => import('@features/admin/approval-policies/approval-policies.component').then((m) => m.ApprovalPoliciesComponent),
          },
          {
            path: 'notification-thresholds',
            loadComponent: () => import('@features/admin/notification-thresholds/notification-thresholds.component').then((m) => m.NotificationThresholdsComponent),
          },
        ],
        data: { title: 'Admin' },
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
