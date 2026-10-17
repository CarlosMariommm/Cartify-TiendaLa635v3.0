import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { ModoContexto } from '../hooks/useModo';
import { areaDeRuta } from '../utils/sesion';
import {
  LLAVE_MODO, CONSULTA_OSCURO, leerModoGuardado, guardarModo, sistemaEnOscuro, esOscuro, aplicarModo, MODOS,
} from '../utils/modo';

// ModoContext — claro u oscuro, para toda la tienda y Mi Cuenta. Lo elige la persona en Mi Cuenta
// → Preferencias; lo leen (con useModo) el mapa, que cambia de calles claras a oscuras, y la
// pintura de la temporada, que recalcula sus colores para el fondo oscuro.
const suscribirSistema = (avisar) => {
  const consulta = window.matchMedia?.(CONSULTA_OSCURO);
  consulta?.addEventListener?.('change', avisar);
  return () => consulta?.removeEventListener?.('change', avisar);
};

export const ModoProvider = ({ children }) => {
  const [modo, setModoEstado] = useState(leerModoGuardado);
  const sistemaOscuro = useSyncExternalStore(suscribirSistema, sistemaEnOscuro, () => false);
  const { pathname } = useLocation();
  const enPanel = areaDeRuta(pathname) === 'personal';

  const oscuro = !enPanel && esOscuro(modo, sistemaOscuro);

  const setModo = useCallback((nuevo) => {
    if (!MODOS.includes(nuevo)) return;
    guardarModo(nuevo);
    setModoEstado(nuevo);
  }, []);

  // Antes de pintar, para que al ir y venir del panel no se vea un cuadro
  // con el modo equivocado.
  useLayoutEffect(() => {
    aplicarModo(oscuro);
  }, [oscuro]);

  // Si se cambia en otra pestaña, esta lo sigue.
  useEffect(() => {
    const alCambiar = (e) => {
      if (e.key === LLAVE_MODO || e.key === null) setModoEstado(leerModoGuardado());
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, []);

  const valor = useMemo(() => ({ modo, setModo, oscuro }), [modo, setModo, oscuro]);

  return <ModoContexto.Provider value={valor}>{children}</ModoContexto.Provider>;
};
