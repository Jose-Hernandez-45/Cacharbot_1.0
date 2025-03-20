import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { SpeechService } from './speech.service';
import { LogsService } from './logs.service';
import { config } from 'src/config';  // Importamos la configuración del servidor

@Injectable({ providedIn: 'root' })
export class MapService {
  private map!: L.Map;
  private routeLayer: L.Polyline | null = null;
  private waypointsLayer: L.LayerGroup | null = null; // Para almacenar los waypoints

  constructor(private speechService: SpeechService, private logsService: LogsService) {}

  initializeMap(mapId: string): L.Map {
    if (this.map) {
      return this.map; // No inicializar nuevamente si ya está inicializado
    }
    this.map = L.map(mapId).setView([21.8853, -102.2916], 13);
    L.tileLayer(config.server.tileAPI).addTo(this.map);
    this.waypointsLayer = L.layerGroup().addTo(this.map);
    return this.map;
  }
  ngAfterViewInit() {
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize(); // Fuerza la recalculación del tamaño del mapa
      }
    }, 500);
  }
  
  addWaypoint(latlng: L.LatLng) {
    if (!this.map) {
      this.logsService.warn("Mapa no inicializado");
      return;
    }
    this.logsService.log("Dibujando marcador en: " + latlng);
    L.marker(latlng).addTo(this.waypointsLayer!).bindPopup(`Lat: ${latlng.lat}, Lng: ${latlng.lng}`).openPopup();
  }

  async updateRoute(waypoints: L.LatLng[]) {
    if (!this.map || waypoints.length < 2) return;

    const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
    const url = `${config.server.routeAPI}/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;  // Usamos la URL del proxy

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`);
      }

      const data = await response.json();
      this.logsService.log("Respuesta completa de OSRM: " + JSON.stringify(data));

      if (data.routes && data.routes.length > 0) {
        const routeCoords = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => L.latLng(lat, lng));

        if (this.routeLayer) {
          this.map.removeLayer(this.routeLayer);
        }

        this.routeLayer = L.polyline(routeCoords, { color: 'purple', weight: 4 }).addTo(this.map);
        this.map.fitBounds(this.routeLayer.getBounds());

        this.logsService.log("Ruta obtenida: " + JSON.stringify(data.routes[0]));

        const routeSteps = data.routes[0].legs[0]?.steps || [];
        this.logsService.log("Pasos de la ruta: " + JSON.stringify(routeSteps));

        let lastInstruction = "";

        routeSteps.forEach((step: any) => {
          let instruction = step.instruction || `Gire ${step.maneuver?.modifier || 'en'} en ${step.name || 'calle desconocida'}.`;
          const distance = step.distance ? step.distance : "desconocida";

          if (instruction !== lastInstruction) {
            lastInstruction = instruction;
            this.speechService.speak(distance !== "desconocida" ? `En ${distance} metros, ${instruction}` : instruction);
            this.logsService.log("Instrucción del paso: " + instruction);
          }
        });
      } else {
        this.logsService.warn("No se encontró una ruta en la respuesta de OSRM.");
      }
    } catch (error) {
      this.logsService.error("Error al obtener la ruta desde OSRM: " + error);
    }
  }

  fitRouteToBounds(waypoints: L.LatLng[]) {
    const bounds = L.latLngBounds(waypoints);
    this.map.fitBounds(bounds);
  }

  clearWaypoints() {
    if (this.waypointsLayer) {
      this.waypointsLayer.clearLayers();
    }
  }

  cancelRouteCreation() {
    this.clearWaypoints();
  }
}
