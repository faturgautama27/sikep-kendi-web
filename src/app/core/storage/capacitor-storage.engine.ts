import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { APP_ENV } from '../data-access/app-env.token';
import { from, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CapacitorStorageEngine {
  private readonly env = inject(APP_ENV);

  getItem(key: string): Observable<string | null> | string | null {
    if (this.env.isMobile) {
      return from(Preferences.get({ key }).then((res) => res.value));
    }
    return localStorage.getItem(key);
  }

  setItem(key: string, val: string): Observable<void> | void {
    if (this.env.isMobile) {
      return from(Preferences.set({ key, value: val }));
    }
    localStorage.setItem(key, val);
  }

  removeItem(key: string): Observable<void> | void {
    if (this.env.isMobile) {
      return from(Preferences.remove({ key }));
    }
    localStorage.removeItem(key);
  }
}
