import { useState, useEffect } from 'react';
import { MapPin, Search, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAjustesCtx } from '../../context/AjustesContext';
import Mapa from '../Mapa/Mapa';

// CONFIGURACIÓN DE ENVÍO (Admin) — ConfiguracionEnvio.jsx
// El precio del domicilio se calcula por la DISTANCIA real hasta el cliente: envío = tarifa base +
// (precio por km × km desde la tienda).

// San Salvador, por si la tienda todavía no tiene ubicación fijada.
const CENTRO_POR_DEFECTO = [13.6989, -89.1914];

// var(--theme-primary) y no var(--marca-*) para el pin: el resto de esta pantalla ya sigue la
// paleta del panel (ver el MapPin de abajo), y este pin es lo mismo, un marcador de ubicación.
// --theme-primary está pintada siempre, sin importar la ruta.
const COLOR_PIN = 'var(--theme-primary, #003049)';

// Number(null) === 0, así que hay que descartar vacíos antes de tratarlos como
// coordenada; si no, la tienda sin fijar aparecería en (0,0), en el mar.
const esCoord = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const hayCoord = (lat, lng) => esCoord(lat) && esCoord(lng);

const ConfiguracionEnvio = () => {
  const { ajustes, guardar, guardando } = useAjustesCtx();

  const [tienda, setTienda] = useState({ lat: null, lng: null });
  const [base, setBase] = useState('');
  const [porKm, setPorKm] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [vista, setVista] = useState(null); // a dónde mover el mapa tras buscar

  useEffect(() => {
    setTienda({
      lat: ajustes.ubicacionTienda?.lat ?? null,
      lng: ajustes.ubicacionTienda?.lng ?? null,
    });
    // La dirección guardada vuelve al buscador: así el panel la recuerda.
    setBusqueda(ajustes.ubicacionTiendaTexto || '');
    setBase(ajustes.envioBase != null ? String(ajustes.envioBase) : '');
    setPorKm(ajustes.envioPorKm != null ? String(ajustes.envioPorKm) : '');
  }, [ajustes.ubicacionTienda, ajustes.ubicacionTiendaTexto, ajustes.envioBase, ajustes.envioPorKm]);

  const centro = hayCoord(tienda.lat, tienda.lng)
    ? [Number(tienda.lat), Number(tienda.lng)]
    : CENTRO_POR_DEFECTO;

  const alClicEnMapa = ({ lat, lng }) => setTienda({ lat, lng });

  // Busca la dirección en Nominatim (OpenStreetMap). Se sesga a El Salvador (countrycodes=sv) para
  // que "Calle Sevilla 635" no caiga en otro país.
  const buscarDireccion = async (e) => {
    e?.preventDefault();
    const q = busqueda.trim();
    if (!q) return;
    try {
      setBuscando(true);
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=sv&q=' +
        encodeURIComponent(q);
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const datos = await res.json();
      if (Array.isArray(datos) && datos[0]) {
        const lat = Number(datos[0].lat);
        const lng = Number(datos[0].lon);
        setTienda({ lat, lng });
        setVista({ lat, lng, _t: Date.now() }); // _t fuerza el re-centrado aunque repita coords
      } else {
        toast.error('No encontramos esa dirección. Pruebe con menos detalle o toque el mapa.');
      }
    } catch {
      toast.error('No se pudo buscar la dirección. Toque el mapa para fijarla a mano.');
    } finally {
      setBuscando(false);
    }
  };

  const quitarUbicacion = () => {
    setTienda({ lat: null, lng: null });
    setBusqueda('');
    setVista(null);
  };

  const onGuardar = async () => {
    const nBase = Number(base);
    const nPorKm = Number(porKm);
    await guardar({
      ubicacionTienda: hayCoord(tienda.lat, tienda.lng)
        ? { lat: Number(tienda.lat), lng: Number(tienda.lng) }
        : { lat: null, lng: null },
      envioBase: Number.isFinite(nBase) && nBase >= 0 ? nBase : 0,
      envioPorKm: Number.isFinite(nPorKm) && nPorKm >= 0 ? nPorKm : 0,
      // La dirección buscada se guarda junto con el punto, para que el panel la
      // recuerde. Si no hay punto fijado, no se guarda texto colgando.
      ubicacionTiendaTexto: hayCoord(tienda.lat, tienda.lng) ? busqueda.trim() : '',
      // Se quitaron las zonas: se manda vacío para limpiar cualquiera guardada.
      zonasEnvio: [],
    });
  };

  const inputStyle = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-text-primary)',
  };
  const tarjeta = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
  };

  const tieneUbicacion = hayCoord(tienda.lat, tienda.lng);

  return (
    <div className="p-6 rounded-2xl shadow-sm border" style={tarjeta}>
      <div className="mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
          <MapPin className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
          Envío por distancia
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
          El precio del domicilio se calcula por la distancia real hasta el cliente: una tarifa
          base más un precio por km. Fije abajo de dónde salen los repartos. Mientras no haya
          ubicación, se cobra solo la tarifa base.
        </p>
      </div>

      {/* Buscador de la dirección de la tienda */}
      <form onSubmit={buscarDireccion} className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border" style={inputStyle}>
          <Search className="w-4 h-4 flex-none" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Escriba la dirección de la tienda…"
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: 'var(--theme-text-primary)' }}
          />
        </div>
        <button
          type="submit"
          disabled={buscando || !busqueda.trim()}
          className="px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60"
          style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
        >
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: 'var(--theme-text-muted)' }}>
        <Info className="w-3.5 h-3.5 flex-none" />
        Escriba la dirección y toque Buscar, o toque el mapa directamente para ajustar el punto.
      </p>

      {/* El mapa */}
      <div className="rounded-2xl overflow-hidden border mb-2" style={{ borderColor: 'var(--theme-card-border)' }}>
        <div style={{ height: 320 }}>
          {/* Tocar el mapa fija la tienda. Cuando el buscador encuentra una dirección el mapa se mueve hasta
             ella (`seguir`): sin eso el pin nuevo aparecía pero el mapa se quedaba mirando a otro lado. */}
          <Mapa
            centro={{ lat: centro[0], lng: centro[1] }}
            zoom={tieneUbicacion ? 16 : 13}
            onTocar={alClicEnMapa}
            seguir={{ punto: vista, zoomMinimo: 16, forzar: vista?._t }}
            controles
            pines={tieneUbicacion ? [{
              id: 'tienda', lat: Number(tienda.lat), lng: Number(tienda.lng),
              tipo: 'gota', tamano: 22, color: COLOR_PIN,
            }] : []}
          />
        </div>
      </div>

      {tieneUbicacion ? (
        <button
          type="button"
          onClick={quitarUbicacion}
          className="text-xs font-semibold underline mb-5"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          Quitar la ubicación
        </button>
      ) : (
        <p className="text-xs mb-5 font-semibold" style={{ color: '#d97706' }}>
          Sin ubicación de la tienda se cobra solo la tarifa base. Busque la dirección o toque el mapa.
        </p>
      )}

      {/* Base + por km */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Tarifa base
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: 'var(--theme-text-secondary)' }}>$</span>
            <input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="1.00"
              className="w-32 px-4 py-2.5 rounded-xl border outline-none"
              style={inputStyle}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Lo fijo que se cobra siempre (y lo único, si no se puede medir la distancia).</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Precio por km
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: 'var(--theme-text-secondary)' }}>$</span>
            <input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={porKm}
              onChange={(e) => setPorKm(e.target.value)}
              placeholder="0.50"
              className="w-32 px-4 py-2.5 rounded-xl border outline-none"
              style={inputStyle}
            />
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>/ km</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Se multiplica por la distancia.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando}
        className="px-8 py-2.5 rounded-full font-bold shadow-sm transition-colors disabled:opacity-60"
        style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
      >
        {guardando ? 'Guardando…' : 'Guardar envío'}
      </button>
    </div>
  );
};

export default ConfiguracionEnvio;
