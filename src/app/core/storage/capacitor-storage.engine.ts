import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CapacitorStorageEngine {
  getItem(key: string): Observable<string | null> {
    return from(Preferences.get({ key })).pipe(map((res) => res.value));
  }

  setItem(key: string, val: string): Observable<void> {
    return from(Preferences.set({ key, value: val }));
  }

  removeItem(key: string): Observable<void> {
    return from(Preferences.remove({ key }));
  }
}
