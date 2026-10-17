import '../../lib/maplibreWorker';
import { useEffect, useMemo, useRef } from 'react';
import { useModo } from '../../hooks/useModo';
import { Map, MapMarker, MarkerContent, MapControls, MapRoute, useMap } from '../mapcn/map';

// EL MAPA DE LA TIENDA — MapaTienda.jsx
// Un solo mapa para toda la web: marcar la dirección, seguir al repartidor, el mapa del reparto y
// la ubicación de la tienda en el panel.

const esCoord = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const valido = (p) => !!p && esCoord(p.lat) && esCoord(p.lng);

/* ── Los pines ─────────────────────────────────────────────── */

// La gota: el pin de "aquí". Un cuadrado con tres esquinas redondas girado 45°, del color de la
// marca (sigue a la temporada).
const Gota = ({ tamano = 22, color = 'var(--marca-600)' }) => (
  <div
    style={{
      width: tamano,
      height: tamano,
      borderRadius: '50% 50% 50% 0',
      background: color,
      transform: 'rotate(-45deg)',
      border: `${Math.max(2.5, tamano * 0.1)}px solid #fff`,
      boxShadow: '0 4px 10px rgba(0,0,0,.3)',
    }}
  />
);

// El repartidor: un punto azul con halo que late, como el "usted está aquí" de cualquier app de
// mapas. Se distingue de la gota de un vistazo.
const PuntoEnVivo = ({ tamano = 16 }) => (
  <div style={{ position: 'relative', width: tamano, height: tamano }}>
    <span
      className="motion-safe:animate-ping"
      style={{
        position: 'absolute',
        inset: -tamano * 0.35,
        borderRadius: '50%',
        background: 'rgba(37,99,235,.28)',
      }}
    />
    <span
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: '#2563eb',
        border: '3px solid #fff',
        boxShadow: '0 0 0 5px rgba(37,99,235,.22), 0 2px 6px rgba(0,0,0,.3)',
      }}
    />
  </div>
);

/* ── Lo que se mueve con el mapa ───────────────────────────── */

// Tocar el mapa devuelve el punto tocado.
const AlTocar = ({ onTocar }) => {
  const { map } = useMap();
  // La función más reciente, sin volver a suscribir el clic en cada render.
  const ref = useRef(onTocar);
  useEffect(() => {
    ref.current = onTocar;
  });

  useEffect(() => {
    if (!map) return undefined;
    const manejar = (e) => ref.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    map.on('click', manejar);
    return () => map.off('click', manejar);
  }, [map]);

  return null;
};

// Mueve la cámara cuando cambian los puntos que importan. - encuadrar: que se vean todos a la vez
// (el repartidor Y la casa). Conforme se acercan el encuadre se cierra solo, y eso cuenta el
// avance sin barra. - seguir: centrar en un punto (el GPS encontró a la persona, o movió el pin).
const Camara = ({ encuadrar, seguir }) => {
  const { map } = useMap();

  const puntos = (encuadrar || []).filter(valido);
  const claveEncuadre = puntos.map((p) => `${p.lat},${p.lng}`).join('|');

  useEffect(() => {
    if (!map || !puntos.length) return;
    if (puntos.length === 1) {
      map.easeTo({ center: [puntos[0].lng, puntos[0].lat], zoom: 15, duration: 500 });
      return;
    }
    const lngs = puntos.map((p) => Number(p.lng));
    const lats = puntos.map((p) => Number(p.lat));
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 34, maxZoom: 16, duration: 600 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, claveEncuadre]);

  const punto = valido(seguir?.punto) ? seguir.punto : null;
  // `forzar` recentra aunque el punto sea el mismo (buscar dos veces la misma
  // dirección después de haber movido el mapa a mano).
  const claveSeguir = punto ? `${punto.lat},${punto.lng},${seguir.forzar ?? ''}` : '';

  useEffect(() => {
    if (!map || !punto) return;
    const zoom = Math.max(map.getZoom(), seguir.zoomMinimo ?? 16);
    const center = [Number(punto.lng), Number(punto.lat)];
    if (seguir.volar) map.flyTo({ center, zoom, duration: 800 });
    else map.easeTo({ center, zoom, duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, claveSeguir]);

  return null;
};

// El crédito de los mapas ("© CARTO, © OpenStreetMap") es obligatorio, pero MapLibre lo muestra
// desplegado al cargar y en una miniatura de 132px tapaba medio mapa. Se deja plegado en su botón
// "i": sigue ahí para quien lo toque.
const CreditoPlegado = () => {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  }, [map, isLoaded]);
  return null;
};

/* ── El mapa ────────────────────────────────────────────────── */

// Recibe: centro, zoom, pines, onTocar, seguir, encuadrar, interactivo, controles, ruta.
const MapaTienda = ({
  centro,
  zoom = 15,
  pines = [],
  onTocar,
  seguir,
  encuadrar,
  interactivo = true,
  controles = false,
  ruta,
  className,
}) => {
  const inicio = valido(centro) ? centro : { lat: 13.6929, lng: -89.2182 };
  // En modo oscuro, las calles oscuras de CARTO (no un mapa blanco en medio de la pantalla).
  const { oscuro } = useModo();
  const lineaDeRuta = useMemo(
    () => (Array.isArray(ruta) ? ruta.filter(valido).map((p) => [Number(p.lng), Number(p.lat)]) : []),
    [ruta]
  );

  return (
    <Map
      theme={oscuro ? 'dark' : 'light'}
      className={className}
      center={[Number(inicio.lng), Number(inicio.lat)]}
      zoom={zoom}
      interactive={interactivo}
    >
      {onTocar && <AlTocar onTocar={onTocar} />}
      <Camara encuadrar={encuadrar} seguir={seguir} />
      <CreditoPlegado />

      {/* La ruta, en el azul del punto del repartidor (es SU camino), con un borde del color de las
         calles debajo para que se despegue del mapa. */}
      {lineaDeRuta.length > 1 && (
        <>
          <MapRoute id="ruta-borde" coordinates={lineaDeRuta} color={oscuro ? '#0F172A' : '#FFFFFF'} width={8} opacity={0.95} interactive={false} />
          <MapRoute id="ruta" coordinates={lineaDeRuta} color="#2563eb" width={4.5} opacity={0.95} interactive={false} />
        </>
      )}

      {pines.filter(valido).map((pin) => (
        <MapMarker
          key={pin.id}
          longitude={Number(pin.lng)}
          latitude={Number(pin.lat)}
          anchor={pin.tipo === 'repartidor' ? 'center' : 'bottom'}
          draggable={!!pin.arrastrable}
          onDragEnd={pin.onSoltar ? (lngLat) => pin.onSoltar({ lat: lngLat.lat, lng: lngLat.lng }) : undefined}
        >
          <MarkerContent className={pin.arrastrable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}>
            {pin.tipo === 'repartidor'
              ? <PuntoEnVivo tamano={pin.tamano} />
              : <Gota tamano={pin.tamano} color={pin.color} />}
          </MarkerContent>
        </MapMarker>
      ))}

      {controles && interactivo && <MapControls position="bottom-right" showZoom />}
    </Map>
  );
};

export default MapaTienda;
