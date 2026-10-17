import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { areaDeRuta } from '../utils/sesion';

// DE QUÉ COLOR SALEN LOS AVISOS — useEstiloAvisos.js
// Todos los avisos son la misma píldora, pero cada mitad con su paleta: la tienda con la tinta de
// la marca y el panel con la suya.

export const useEstiloAvisos = () => {
  const { pathname } = useLocation();
  const enPanel = areaDeRuta(pathname) === 'personal';

  return useMemo(() => ({
    colores: enPanel
      ? { '--aviso-fondo': 'var(--theme-text-primary, #1C1614)', '--aviso-texto': 'var(--theme-card-bg, #fff)' }
      : { '--aviso-fondo': 'var(--tinta, #1C1614)', '--aviso-texto': 'var(--sobre-tinta, #fff)' },
    opciones: {
      duration: 3500,
      // Un error se queda más: hay que leerlo y decidir qué hacer.
      error: { duration: 5000 },
    },
  }), [enPanel]);
};
