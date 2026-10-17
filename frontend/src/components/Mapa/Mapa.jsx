import { lazy, Suspense } from 'react';

// La puerta de entrada al mapa (ver MapaTienda.jsx para las props). MapLibre pesa varias veces lo
// que pesaba Leaflet. Cargado de entrada, lo bajaría todo el que abre la portada aunque nunca vea
// un mapa.
const MapaTienda = lazy(() => import('./MapaTienda'));

const Mapa = ({ className = 'h-full w-full', ...props }) => (
  <Suspense fallback={<div className={className} style={{ background: 'var(--papel-gris)' }} aria-hidden="true" />}>
    <MapaTienda className={className} {...props} />
  </Suspense>
);

export default Mapa;
