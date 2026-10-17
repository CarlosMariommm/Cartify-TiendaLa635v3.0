import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAjustesCtx } from '../context/AjustesContext';
import { useModo } from './useModo';
import { temaActivo, aplicarTema } from '../utils/temporadas';
import { areaDeRuta } from '../utils/sesion';

// TEMPORADA — useTemporada.js
// Pinta la tienda del color de la fecha. Toda la lógica de QUÉ tema toca vive en
// utils/temporadas.js; este hook se encarga de CUÁNDO y DÓNDE aplicarlo.

// Las rutas del panel, que NO se repintan ni se decoran. Es la MISMA lista que separa los dos
// cajones de sesión (RUTAS_DEL_PANEL en utils/sesion.js, que una prueba compara con App.jsx).
export const esPanel = (pathname = '') => areaDeRuta(pathname) === 'personal';

// useTemaCalculado — SOLO datos: qué tema toca ahora mismo, sin tocar el DOM. Cualquier pantalla
// que necesite SABER la temporada (CintaTemporada) usa esto, no useTemporada — esa es de solo
// lectura, esta no pinta nada.
export const useTemaCalculado = () => {
  const { ajustes } = useAjustesCtx();
  const { pathname } = useLocation();

  // La fecha se toma UNA vez por render del cálculo, no en cada comparación. A nadie le cambia la
  // temporada mientras mira la pantalla; si alguien deja la tienda abierta del 30 de noviembre al 1
  // de diciembre, se pinta de Navidad en la siguiente navegación y con eso basta.
  const tema = useMemo(() => {
    const base = temaActivo(ajustes.temporada);
    if (!base) return base;
    // Las temporadas propias ya traen el saludo que escribió el dueño.
    if (base.propio) return base;
    // El saludo de fábrica se puede reescribir por tema desde Personalización → Apariencia. En blanco
    // (o sin entrada) se queda con el de siempre.
    const propio = (ajustes.temporada?.saludos?.[base.clave] || '').trim();
    if (!propio) return base;
    return { ...base, decoracion: { ...base.decoracion, saludo: propio } };
  }, [ajustes.temporada]);

  // Ya no hay "color base" que aplicar: la marca vive fija en index.css y nadie la puede repintar
  // desde el panel. Queda en null para que el único que llegue a pisar las variables sea una
  // temporada activa, y al apagarse la tienda vuelva sola al azul de la casa.
  const temaBase = null;

  const enPanel = esPanel(pathname);

  // La decoración (la cinta y las figuras cayendo) se puede apagar dejando solo los colores. Va
  // encendida por defecto: quien elige poner Navidad espera que se note, no tener que ir a buscar un
  // segundo interruptor.
  const conDecoracion = ajustes.temporada?.decoracion !== false;

  // El saludo de los días sin temporada. No depende del interruptor de decoración: ese apaga lo de
  // la fecha (la cinta de Navidad, los copos); si el dueño escribió un saludo para el resto del año,
  // quiere verlo.
  const saludoNormal = (ajustes.temporada?.saludoNormal || '').trim();

  return {
    tema,
    temaBase,
    enPanel,
    activo: !enPanel && !!tema,
    conDecoracion,
    saludoNormal,
  };
};

// useTemporada — dueño ÚNICO del efecto que pinta document.documentElement. Se llama UNA sola vez,
// desde PinturaDeTemporada (montada fuera de las rutas, para toda la vida de la app). Cualquier
// otro lugar que solo necesite SABER la temporada usa useTemaCalculado — nunca este.
export const useTemporada = () => {
  const calculado = useTemaCalculado();
  const { tema, temaBase, enPanel } = calculado;
  // En modo oscuro la temporada se pinta con su versión para fondo oscuro.
  const { oscuro } = useModo();

  useEffect(() => {
    // Prioridad: temporada (temporal) > color base del dueño > café de fábrica.
    aplicarTema(enPanel ? null : (tema || temaBase), { oscuro });
    // Al desmontar se despinta: si no, el tema quedaría puesto sobre cualquier
    // pantalla que se monte después sin pasar por aquí.
    return () => aplicarTema(null);
  }, [tema, temaBase, enPanel, oscuro]);

  return calculado;
};
