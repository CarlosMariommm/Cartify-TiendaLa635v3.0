import { setWorkerUrl } from 'maplibre-gl';
// MapLibre dibuja el mapa con ayuda de un "worker" (un hilo aparte). mapcn lo baja por defecto de
// unpkg.com; aquí se empaqueta con la app (?worker&url) para que el mapa no dependa de que un CDN
// ajeno esté arriba.
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(urlDelWorker);
