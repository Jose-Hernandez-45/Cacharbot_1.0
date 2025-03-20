import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private watchId: number | null = null;

  startTracking(callback: (position: GeolocationPosition) => void) {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(callback);
    }
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
