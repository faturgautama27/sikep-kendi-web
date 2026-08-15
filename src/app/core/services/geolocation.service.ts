import { Injectable } from '@angular/core';
import { Geolocation, type Position } from '@capacitor/geolocation';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  /**
   * Request location permissions from the user.
   * Returns 'granted' or 'denied'.
   */
  async requestPermissions(): Promise<'granted' | 'denied'> {
    try {
      const result = await Geolocation.requestPermissions();
      return result.location === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  /**
   * Get current GPS position.
   * Returns null if permission denied or position unavailable.
   */
  async getCurrentPosition(): Promise<Coordinates | null> {
    try {
      const position: Position = await Geolocation.getCurrentPosition({
        timeout: 10000,
        enableHighAccuracy: true,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch {
      return null;
    }
  }
}
