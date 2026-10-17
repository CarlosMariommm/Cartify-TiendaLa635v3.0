import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fijarIdiomaActual, guardarIdioma, leerIdiomaGuardado, localeDe, traducir, esIdiomaValido,
} from '../utils/idioma';

// IDIOMA — IdiomaContext.js
// `t(texto, vars)` para cualquier pantalla de la tienda, y `setIdioma` para Preferencias.

const IdiomaContexto = createContext(null);

export const IdiomaProvider = ({ children }) => {
  const [idioma, setIdiomaEstado] = useState(null);

  useEffect(() => {
    let vivo = true;
    leerIdiomaGuardado().then((guardado) => {
      if (!vivo) return;
      // Antes de pintar: lo que traduce fuera de un componente (tAhora) ya
      // tiene que salir en este idioma desde el primer dibujo.
      fijarIdiomaActual(guardado);
      setIdiomaEstado(guardado);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (idioma) fijarIdiomaActual(idioma);
  }, [idioma]);
  useEffect(() => () => fijarIdiomaActual('es'), []);

  const setIdioma = useCallback((nuevo) => {
    if (!esIdiomaValido(nuevo)) return;
    guardarIdioma(nuevo);
    fijarIdiomaActual(nuevo);
    setIdiomaEstado(nuevo);
  }, []);

  const t = useCallback((texto, vars) => traducir(idioma || 'es', texto, vars), [idioma]);
  const valor = useMemo(
    () => ({ idioma: idioma || 'es', setIdioma, t, locale: localeDe(idioma) }),
    [idioma, setIdioma, t]
  );

  if (!idioma) return null;

  return <IdiomaContexto.Provider value={valor}>{children}</IdiomaContexto.Provider>;
};

// Sin proveedor (el modo del personal), todo en español.
const SIN_PROVEEDOR = {
  idioma: 'es',
  setIdioma: () => {},
  t: (texto, vars) => traducir('es', texto, vars),
  locale: localeDe('es'),
};

export const useIdioma = () => useContext(IdiomaContexto) || SIN_PROVEEDOR;
