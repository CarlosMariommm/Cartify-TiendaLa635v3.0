import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IdiomaContexto } from '../hooks/useIdioma';
import {
  LLAVE_IDIOMA, guardarIdioma, leerIdiomaGuardado, localeDe, traducir, esIdiomaValido,
} from '../utils/idioma';
import { areaDeRuta } from '../utils/sesion';

// IdiomaProvider — el idioma elegido, para toda la tienda. Ver utils/idioma.js. Además de dar `t`,
// pone el idioma en <html lang>: el lector de pantalla lee con la voz de ese idioma, y el
// navegador no ofrece "traducir esta página" sobre una página que ya está en inglés.
export const IdiomaProvider = ({ children }) => {
  const [idioma, setIdiomaEstado] = useState(leerIdiomaGuardado);
  const { pathname } = useLocation();
  const enPanel = areaDeRuta(pathname) === 'personal';
  // El que se ve: el elegido en la tienda, español en el panel.
  const visible = enPanel ? 'es' : idioma;

  const setIdioma = useCallback((nuevo) => {
    if (!esIdiomaValido(nuevo)) return;
    guardarIdioma(nuevo);
    setIdiomaEstado(nuevo);
  }, []);

  useEffect(() => {
    document.documentElement.lang = visible;
  }, [visible]);

  // Otra pestaña cambió el idioma: esta lo sigue.
  useEffect(() => {
    const alCambiar = (e) => {
      if (e.key === LLAVE_IDIOMA || e.key === null) setIdiomaEstado(leerIdiomaGuardado());
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, []);

  const t = useCallback((texto, vars) => traducir(visible, texto, vars), [visible]);
  const valor = useMemo(() => ({ idioma, setIdioma, t, locale: localeDe(visible) }), [idioma, setIdioma, t, visible]);

  return <IdiomaContexto.Provider value={valor}>{children}</IdiomaContexto.Provider>;
};
