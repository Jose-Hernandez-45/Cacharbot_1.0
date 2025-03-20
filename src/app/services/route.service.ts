import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface SavedRoute {
  id: number;
  name: string;
  waypoints: L.LatLng[];
}

@Injectable({ providedIn: 'root' })
export class RouteService {

  // Obtiene las rutas almacenadas en el localStorage
  getRoutes(): SavedRoute[] {
    const storedRoutes = localStorage.getItem('savedRoutes');
    return storedRoutes ? JSON.parse(storedRoutes) : [];
  }

  // Guarda una nueva ruta en el localStorage
  saveRoute(name: string, waypoints: L.LatLng[]) {
    const newRoute: SavedRoute = {
      id: Date.now(),
      name,
      waypoints
    };
    
    const storedRoutes = this.getRoutes();
    storedRoutes.push(newRoute); // Añade la nueva ruta
    localStorage.setItem('savedRoutes', JSON.stringify(storedRoutes)); // Guarda el arreglo actualizado en localStorage
  }

  // Elimina una ruta por su ID
  deleteRoute(routeId: number) {
    const storedRoutes = this.getRoutes();
    const updatedRoutes = storedRoutes.filter(route => route.id !== routeId);
    localStorage.setItem('savedRoutes', JSON.stringify(updatedRoutes)); // Guarda las rutas actualizadas
  }
}
