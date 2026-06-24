import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Platform-aware NGXS Storage Engine.
 *
 * - Native Android/iOS (Capacitor.isNativePlatform() = true):
 *     Menggunakan @capacitor/preferences (native SharedPreferences).
 *     Asinkron, persisten — tidak akan hilang saat app di-kill dari Recent Apps.
 *
 * - Web browser (Capacitor.isNativePlatform() = false):
 *     Menggunakan localStorage secara sinkron.
 *     Mencegah race condition antara inisialisasi NGXS dan async hydration
 *     yang menyebabkan state auth ter-reset ke {} setiap page refresh.
 */
@Injectable({ providedIn: 'root' })
export class CapacitorStorageEngine {
  private readonly isNative = Capacitor.isNativePlatform();

  getItem(key: string): Observable<string | null> | string | null {
    if (this.isNative) {
      return from(Preferences.get({ key })).pipe(map((res) => res.value));
    }
    return localStorage.getItem(key);
  }

  setItem(key: string, val: string): Observable<void> | void {
    if (this.isNative) {
      return from(Preferences.set({ key, value: val }));
    }
    localStorage.setItem(key, val);
  }

  removeItem(key: string): Observable<void> | void {
    if (this.isNative) {
      return from(Preferences.remove({ key }));
    }
    localStorage.removeItem(key);
  }
}
