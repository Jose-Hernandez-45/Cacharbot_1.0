import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { MapService } from '../services/map.service';
import { RouteService, SavedRoute } from '../services/route.service';
import { GeolocationService } from '../services/geolocation.service';
import { SpeechService } from '../services/speech.service';
import * as L from 'leaflet';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';  // Importar DomSanitizer
import { config } from 'src/config';  // Importar el archivo de configuración


@Component({
  selector: 'app-mapa',
  standalone: false,
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss']
})
export class MapaPage implements OnInit {
  savedRoutes: SavedRoute[] = [];
  selectedRoute: SavedRoute | null = null;
  isTracking: boolean = false;
  instructions: SafeHtml[] = [];  // Cambiar a SafeHtml[]
  currentInstructionIndex: number = 0;
  showCreateRouteMenu: boolean = false;
  showLoadedRoutesMenu: boolean = false;
  isCreatingRoute: boolean = false; // Controla si estamos creando una ruta

  // Limitador de frecuencia
  private lastActionTime: number = 0;  // Marca de tiempo de la última acción
  private actionCooldown: number = 2000;  // Tiempo de espera en milisegundos (2 segundos)

  constructor(
    private mapService: MapService,
    private routeService: RouteService,
    private geolocationService: GeolocationService,
    private speechService: SpeechService,
    private sanitizer: DomSanitizer  // Inyectar DomSanitizer
  ) {}

  ngOnInit() {
    this.loadRoutes(); // Cargamos las rutas al inicio
    setTimeout(() => {
      const map = this.mapService.initializeMap('map');
      
      // Evento para agregar waypoints al hacer clic en el mapa
      map.on('click', (event: L.LeafletMouseEvent) => {
        this.addWaypoint(event.latlng);
      });
    }, 500);
  }

  loadRoutes() {
    this.savedRoutes = this.routeService.getRoutes(); // Cargar rutas actualizadas desde localStorage
  }

  startRouteCreation() {
    this.isCreatingRoute = true;  // Permitimos agregar waypoints
    this.selectedRoute = { id: Date.now(), name: 'Nueva Ruta', waypoints: [] }; // Iniciar una nueva ruta
  }
  
  toggleCreateRouteMenu() {
    this.showCreateRouteMenu = !this.showCreateRouteMenu;
    if (this.showCreateRouteMenu) this.showLoadedRoutesMenu = false;
  }

  addWaypoint(latlng: L.LatLng) {
    // Verificar si ha pasado suficiente tiempo desde la última acción
    if (new Date().getTime() - this.lastActionTime < this.actionCooldown) {
      console.warn('Demasiadas acciones en un corto periodo, por favor espera...');
      return;  // Detener la ejecución si no ha pasado el tiempo necesario
    }

    if (!this.selectedRoute || !this.isCreatingRoute) {
      // Si no estamos creando una ruta, no permitimos agregar waypoints
      return;
    }
    console.log("Dibujando marcador en:", latlng);
    this.selectedRoute.waypoints.push(latlng);
    this.mapService.addWaypoint(latlng);
    this.mapService.updateRoute(this.selectedRoute.waypoints); // Obtiene ruta real con OSRM

    // Actualizar el tiempo de la última acción
    this.lastActionTime = new Date().getTime();
  }

  toggleLoadedRoutesMenu() {
    this.showLoadedRoutesMenu = !this.showLoadedRoutesMenu;
    if (this.showLoadedRoutesMenu) this.showCreateRouteMenu = false;
  }

  async saveRoute() {
    // Verificar si ha pasado suficiente tiempo desde la última acción
    if (new Date().getTime() - this.lastActionTime < this.actionCooldown) {
      console.warn('Demasiadas acciones en un corto periodo, por favor espera...');
      return;  // Detener la ejecución si no ha pasado el tiempo necesario
    }

    if (!this.selectedRoute) return;

    // Pedir al usuario el nombre de la ruta
    const routeName = prompt("Introduce el nombre de la ruta:");
    if (!routeName) {
      alert("El nombre de la ruta es obligatorio.");
      return;
    }

    // Guardar la ruta
    this.routeService.saveRoute(routeName, this.selectedRoute.waypoints);

    // Limpiar el mapa y cerrar el menú
    this.selectedRoute = null;
    this.mapService.clearWaypoints(); // Limpiar los waypoints del mapa
    this.showCreateRouteMenu = false; // Cerrar el menú de creación
    this.showLoadedRoutesMenu = false; // Cerrar el menú de rutas cargadas

    // Actualizar la lista de rutas
    this.loadRoutes();

    // Mostrar mensaje de confirmación
    alert("Ruta almacenada correctamente.");

    // Actualizar el tiempo de la última acción
    this.lastActionTime = new Date().getTime();
  }

  cancelRouteCreation() {
    // Limpiar los waypoints y cerrar el menú sin guardar
    this.selectedRoute = null;
    this.mapService.clearWaypoints(); // Limpiar los waypoints del mapa
    this.showCreateRouteMenu = false; // Cerrar el menú de creación
    this.showLoadedRoutesMenu = false; // Cerrar el menú de rutas cargadas
    this.isCreatingRoute = false; // Detener la creación de la ruta
  }

  loadRoute(route: SavedRoute) {
    this.selectedRoute = {
      ...route,
      waypoints: route.waypoints.map(wp => L.latLng(wp.lat, wp.lng))
    };

    // Actualizamos el mapa con los waypoints de la ruta cargada
    this.mapService.updateRoute(this.selectedRoute.waypoints); // Obtiene ruta de calles al cargar

    // Cerrar los menús al seleccionar una ruta
    this.showCreateRouteMenu = false;
    this.showLoadedRoutesMenu = false;
  }

  startJourney() {
    if (!this.selectedRoute) return;
  
    this.isTracking = true;
  
    // Llamar a la API de OSRM para obtener las instrucciones de la ruta
    this.geolocationService.startTracking((userLocation) => {
      const waypoints = this.selectedRoute?.waypoints || [];
  
      if (waypoints.length >= 2) {
        const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
        const url = `${config.server.routeAPI}/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;  // Usando la URL desde config.ts
  
        fetch(url)
          .then(response => response.json())
          .then(data => {
            // Verificar si la respuesta contiene las instrucciones
            if (data.routes && data.routes.length > 0) {
              const routeInstructions = data.routes[0].legs[0].steps.map((step: { instruction: string }) => step.instruction);
  
              // Asignar las instrucciones a la variable local
              this.instructions = routeInstructions;
  
              // Verificar en consola si las instrucciones están siendo asignadas correctamente
              console.log("Instrucciones a mostrar:", this.instructions);
  
              // Llamar a la función que irá leyendo las instrucciones
              this.showNextInstruction();
            } else {
              console.warn("No se encontraron instrucciones.");
            }
          })
          .catch(error => {
            console.error("Error al obtener las instrucciones de tránsito:", error);
          });
      }
    });
  }
  
  showNextInstruction() {
    if (this.currentInstructionIndex < this.instructions.length) {
      // Extraemos la cadena como texto de SafeHtml
      let instruction = this.instructions[this.currentInstructionIndex] as string;
  
      // Verificar qué está recibiendo speechService
      console.log("Instrucción antes de pasar al speechService:", instruction);
  
      // Limpiar posibles caracteres HTML no deseados, pero primero nos aseguramos de que sea una cadena de texto
      if (typeof instruction === 'string') {
        instruction = instruction.replace(/<[^>]*>/g, '').trim(); // Elimina cualquier etiqueta HTML y espacios innecesarios
      }
  
      // Verificar la instrucción limpia
      console.log("Instrucción después de limpieza:", instruction);
  
      // Llamamos al speechService para que lea la instrucción
      this.speechService.speak(instruction); 
      this.currentInstructionIndex++;
      setTimeout(() => this.showNextInstruction(), 3000); // Repetir cada 3 segundos
    }
  }

  stopTrackingAndReturn() {
    this.isTracking = false;
    this.geolocationService.stopTracking();
    this.selectedRoute = null;
    this.mapService.clearWaypoints(); // Limpiar los waypoints del mapa
  }

  sendSOS() {
    alert("SOS enviado");
  }

  // Función para eliminar una ruta
  deleteRoute(route: SavedRoute) {
    if (confirm(`¿Estás seguro de que deseas eliminar la ruta "${route.name}"?`)) {
      this.routeService.deleteRoute(route.id);
      this.loadRoutes(); // Actualizamos la lista de rutas
    }
  }
}
