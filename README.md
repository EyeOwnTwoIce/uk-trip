# UK & vuelta · Diario de ruta 2026

Web local interactiva del viaje en moto por España, Francia, Inglaterra, Gales, Escocia, Irlanda del Norte e Irlanda.

- **32 paradas** emblemáticas, con un párrafo de historia, información extra y localizaciones de cine y series.
- **Mapa Leaflet** con la ruta completa (6.510 km), etapas navegables y marcadores por parada.
- **Buscador**, filtros por país y filtro «solo sitios con rodajes».
- **Recorrido guiado** que abre las paradas en orden cronológico.
- Diseño responsive para escritorio y móvil.

## Cómo abrirla

Doble clic en start.command (macOS). También puedes ejecutar:

    cd uk_trip_site
    python3 -m http.server 8765

y abrir http://localhost:8765/.

## Estructura

- index.html — estructura de la aplicación.
- styles.css — diseño editorial, responsive.
- app.js — mapa, filtros, fichas, recorrido guiado.
- site-data.js — las 32 paradas y las 24 etapas del track.
- img/ — fotografías optimizadas (Wikimedia Commons) y un SVG de reserva.
- vendor/ — Leaflet 1.9.4 incluido en local.

## Notas sobre el track

El trazado procede del KML original (Komobi/BMW). Los tramos sin GPS —ferry Calais–Dover, enlace Dover–Gales, ferry a Belfast y ferry Rosslare–Santander— se han reconstruido y aparecen discontinuos en el mapa. Las distancias son las registradas por la aplicación, no una medición propia.

## Créditos

Fotografías: Wikimedia Commons, con licencias libres; cada ficha enlaza al artículo correspondiente. Textos: elaboración propia a partir de fuentes históricas y de localizaciones documentadas. Leaflet: BSD-2-Clause. Mapa base: © OpenStreetMap contributors.
