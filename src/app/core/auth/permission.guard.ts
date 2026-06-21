import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { APP_ENV } from '@core/data-access/app-env.token';
import { AuthState } from '@features/login/state';

function hasAnyPermission(required: string[], granted: string[]): boolean {
  if (granted.includes('*')) return true;
  return required.some((permission) => granted.includes(permission));
}

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const env = inject(APP_ENV);
  const router = inject(Router);
  const store = inject(Store);

  const required = (route.data['requiredPermissions'] as string[] | undefined) ?? [];
  if (required.length === 0) return true;

  const user = store.selectSnapshot(AuthState.user);
  const granted = store.selectSnapshot(AuthState.permissions);

  // Preview mode may render routes before login; keep current permissive behavior.
  if (env.previewMode && !user && granted.length === 0) return true;

  if (hasAnyPermission(required, granted)) return true;

  router.navigateByUrl('/403');
  return false;
};
