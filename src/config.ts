// src/config.ts

export const config = {
    server: {
      // URL base para la API de enrutamiento (OSRM)
      routeAPI: 'https://router.project-osrm.org/route/v1',
      // URL base para OpenStreetMap si fuera necesario
      tileAPI: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      cleartext: false,
    },
  };
  