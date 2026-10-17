import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// EL MENÚ DEL PANEL EN PANTALLA CHICA — useMenuPanel.js
// El menú medía 256px fijos pegados a la izquierda, siempre.

// El mismo corte que usa `lg:` en Tailwind. Si se cambia uno hay que cambiar
// el otro: la clase decide cómo se ve y esto decide cómo se comporta.
const ESCRITORIO = '(min-width: 1024px)';

export const useMenuPanel = () => {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);

  // El ancho de la pantalla se mide en el primer render y no en un efecto, para que en escritorio
  // el menú no parpadee como oculto para el lector de pantalla.
  const [esEscritorio, setEsEscritorio] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(ESCRITORIO).matches
  );

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto((previo) => !previo), []);

  // Seguimos el ancho para saber si el menú es una barra o un cajón.
  useEffect(() => {
    const consulta = window.matchMedia(ESCRITORIO);
    const alCambiar = (evento) => setEsEscritorio(evento.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  // El cajón del menú se cierra solo al ensanchar la ventana y al navegar a otra pantalla. Se ajusta
  // en el mismo pintado, no en un efecto, para que no quede un cuadro con el cajón abierto.
  const [visto, setVisto] = useState({ esEscritorio, pathname });
  if (visto.esEscritorio !== esEscritorio || visto.pathname !== pathname) {
    setVisto({ esEscritorio, pathname });
    if (esEscritorio || visto.pathname !== pathname) setAbierto(false);
  }

  // Escape. Solo se escucha mientras está abierto: dejar el listener puesto todo el tiempo haría que
  // esta pantalla se quedara con la tecla aunque el menú no tenga nada que ver con lo que el usuario
  // está haciendo.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (evento) => { if (evento.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto]);

  // Sin esto, el dedo que quiere recorrer el menú termina arrastrando la página de atrás y el cajón
  // se queda flotando sobre contenido que se movió. Se guarda el valor previo en vez de asumir que
  // era vacío, para no pisar un bloqueo que ya hubiera puesto otra cosa (un modal, por ejemplo).
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, [abierto]);

  // Tocar un enlace del grupo donde uno YA está no cambia la ruta, así que el cierre por navegación
  // no se entera y el cajón se queda abierto.
  const alTocarNavegacion = useCallback((evento) => {
    if (evento.target.closest('a')) setAbierto(false);
  }, []);

  return {
    abierto,
    esEscritorio,
    // En pantalla chica y cerrado el menú está fuera de la pantalla: hay que
    // sacarlo también del alcance del teclado y de los lectores de pantalla,
    // o el tabulador se pierde recorriendo trece enlaces invisibles.
    oculto: !esEscritorio && !abierto,
    abrir,
    cerrar,
    alternar,
    alTocarNavegacion,
  };
};
