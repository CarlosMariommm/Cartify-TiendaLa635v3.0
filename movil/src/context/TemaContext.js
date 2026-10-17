// TEMA — el color con el que se pinta la tienda hoy
// Lo que en la web hace `useTemporada` + `aplicarTema`: decidir qué temporada rige y repartir sus
// colores. ── Por qué hace falta un contexto y allá bastaba una línea ──

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getAjustes } from '../api/ajustesApi';
import { COLORES } from '../theme/colores';
import { paletaOscura, temaActivo } from '../utils/temporadas';
import { useModo } from './ModoContext';

const TemaContext = createContext(null);

// Los colores de siempre. Salen de la paleta de la app y de los tokens de la web (`--marca-400`,
// `--marca-50` y `--acento` de frontend/src/index.css).
export const PALETA_BASE = {
  marcaOscuro: COLORES.marcaOscuro,
  marca: COLORES.marca,
  marcaClaro: '#066494',
  marcaSuave: COLORES.marcaSuave,
  marcaTenue: '#F1F6F9',
  acento: '#009AEB',
};

// `marcaFija`: los colores de marca que mandan sí o sí, pase lo que pase con la temporada.
export const TemaProvider = ({ children, marcaFija, sinTemporada = false }) => {
  // En modo oscuro la temporada (o la marca, si no hay) se pinta con su
  // versión para fondo oscuro. Por eso TemaProvider va DENTRO de ModoProvider.
  const { oscuro } = useModo();
  const [temporada, setTemporada] = useState(null);
  const [decoracionEncendida, setDecoracionEncendida] = useState(true);

  // Trae los ajustes de la tienda (la temporada y su decoración). Devuelve si salió bien.
  const recargarAjustes = useCallback(async () => {
    try {
      const ajustes = await getAjustes();
      setTemporada(ajustes?.temporada || null);
      // La decoración se puede apagar dejando solo los colores. Va encendida por defecto: quien elige
      // poner Navidad espera que se note, no tener que ir a buscar un segundo interruptor.
      setDecoracionEncendida(ajustes?.temporada?.decoracion !== false);
      return true;
    } catch {
      // Sin ajustes la tienda se ve con los colores de siempre, que es exactamente lo correcto. Que la
      // portada no cargue porque falló el documento de configuración sería cambiar la tienda por un
      // adorno.
      return false;
    }
  }, []);

  useEffect(() => {
    recargarAjustes();
    // Y cada vez que se vuelve a la app (por ejemplo, después de cambiar la
    // temporada en el panel desde el navegador).
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') recargarAjustes();
    });
    return () => sub.remove();
  }, [recargarAjustes]);

  // La fecha se toma UNA vez por cálculo. A nadie le cambia la temporada mientras mira la pantalla;
  // si alguien deja la app abierta del 30 de noviembre al 1 de diciembre, se pinta de Navidad la
  // próxima vez que abra.
  const tema = useMemo(() => {
    if (sinTemporada) return null;
    const base = temaActivo(temporada);
    if (!base || base.propio) return base;
    // El saludo de fábrica se puede reescribir desde el panel web (Personalización → Apariencia). En
    // blanco se queda el de siempre.
    const propio = (temporada?.saludos?.[base.clave] || '').trim();
    return propio ? { ...base, decoracion: { ...base.decoracion, saludo: propio } } : base;
  }, [temporada, sinTemporada]);

  const valor = useMemo(() => {
    // La paleta ya resuelta: siempre completa, haya temporada o no.
    const clara = tema ? { ...PALETA_BASE, ...tema.colores } : PALETA_BASE;
    const fija = marcaFija ? { ...PALETA_BASE, ...marcaFija } : null;
    return {
      // El tema crudo, para quien necesite su clave o su saludo.
      tema,
      activo: !!tema,
      // marcaTexto: la marca cuando es letra. Ver theme/colores.js.
      colores: fija || (oscuro ? paletaOscura(clara) : { ...clara, marcaTexto: clara.marca }),
      // La de siempre aunque rija el modo oscuro. Solo para lo que es arte a sangre con texto blanco
      // encima (la introducción): ahí el azul hondo ya es el fondo oscuro, y aclararlo le quitaba
      // contraste al texto.
      coloresClaros: fija || { ...clara, marcaTexto: clara.marca },
      decoracion: tema && decoracionEncendida ? tema.decoracion : null,
      // El saludo de los días sin temporada. En blanco no sale cinta.
      saludoNormal: (temporada?.saludoNormal || '').trim(),
      // Los disfraces que el dueño le armó a Tiqui en el panel, por temporada.
      disfraces: sinTemporada ? null : temporada?.disfraces || null,
      // Para jalar para recargar: vuelve a traer la temporada.
      recargarAjustes,
    };
  }, [tema, decoracionEncendida, temporada, oscuro, recargarAjustes, marcaFija, sinTemporada]);

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
};

// El atajo de las pantallas de tienda. Devuelve la paleta y no el tema pelado porque lo que casi
// siempre se quiere es un color: `const { colores } = useTema()` y después `colores.marca`.
export const useTema = () => {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema debe usarse dentro de <TemaProvider>');
  return ctx;
};
