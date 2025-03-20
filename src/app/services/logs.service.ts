import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';  // Importar el archivo de entorno

@Injectable({
  providedIn: 'root',
})
export class LogsService {
  constructor() {}

  // Método para registrar logs generales
  log(message: string): void {
    if (this.isDevMode()) {
      console.log('[LOG] ' + message);
    }
  }

  // Método para registrar advertencias
  warn(message: string): void {
    if (this.isDevMode()) {
      console.warn('[WARN] ' + message);
    }
  }

  // Método para registrar errores
  error(message: string): void {
    if (this.isDevMode()) {
      console.error('[ERROR] ' + message);
    }
  }

  // Método para verificar si estamos en modo de desarrollo
  private isDevMode(): boolean {
    return !environment.production;  // Verifica el valor de producción
  }
}
