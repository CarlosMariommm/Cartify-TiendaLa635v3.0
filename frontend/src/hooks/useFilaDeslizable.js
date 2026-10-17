import { useRef, useState, useCallback, useEffect } from 'react';

// useFilaDeslizable — sabe si una fila de productos todavía se puede correr a la izquierda o a la
// derecha, para apagar la flecha que ya no sirve. TOLERANCIA: cuánto scroll cuenta como nada.
const TOLERANCIA = 18;

// `rueda`: que la rueda del mouse también corra la fila de lado. Lo usa el menú de Mi Cuenta, que
// con el mouse no se podía recorrer: la barra de desplazamiento va escondida y la rueda solo movía
// la página.
export const useFilaDeslizable = ({ rueda = false } = {}) => {
  const nodo = useRef(null);
  const limpiar = useRef(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const revisar = useCallback(() => {
    const el = nodo.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > TOLERANCIA);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - TOLERANCIA);
  }, []);

  // El enganche. Se mide EN CUANTO el nodo existe, sin esperar a ningún efecto, y se suelta todo
  // cuando se va.
  const fila = useCallback((el) => {
    // Al reemplazarse o desmontarse, primero se suelta lo anterior.
    if (limpiar.current) {
      limpiar.current();
      limpiar.current = null;
    }

    nodo.current = el;
    if (!el) {
      // Sin fila no hay a dónde correrse: las flechas se apagan.
      setPuedeIzq(false);
      setPuedeDer(false);
      return;
    }

    revisar();
    el.addEventListener('scroll', revisar, { passive: true });
    // Si cambia el ancho (o llegan más productos) hay que recalcular.
    const observador = new ResizeObserver(revisar);
    observador.observe(el);
    // Y si crece lo de ADENTRO sin que la fila cambie de tamaño: la barra de categorías mide siempre
    // lo mismo, pero sus pastillas llegan del servidor después de montarse. Mirando solo la fila, la
    // flecha derecha nacía apagada con media lista escondida.
    for (const hijo of el.children) observador.observe(hijo);

    // La rueda vertical se vuelve horizontal mientras haya para dónde correr. En la orilla se suelta y
    // la página vuelve a bajar: quedarse atrapado en una barra delgada con la rueda sin hacer nada es
    // peor que no tenerla. Si el gesto ya es de lado (touchpad), se deja tal cual.
    const alRodar = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const maximo = el.scrollWidth - el.clientWidth;
      if (maximo <= 0) return;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= maximo - 1)) return;
      e.preventDefault();
      el.scrollLeft = Math.max(0, Math.min(maximo, el.scrollLeft + e.deltaY));
    };
    // passive: false porque hay que poder frenar el desplazamiento de la página.
    if (rueda) el.addEventListener('wheel', alRodar, { passive: false });

    limpiar.current = () => {
      el.removeEventListener('scroll', revisar);
      if (rueda) el.removeEventListener('wheel', alRodar);
      observador.disconnect();
    };
  }, [revisar, rueda]);

  // Red de seguridad: si el componente se va sin que React llame al ref con
  // null (no debería pasar, pero el observer sobreviviría a la fila).
  useEffect(() => () => { if (limpiar.current) limpiar.current(); }, []);

  // Corre casi una pantalla, dejando un pedacito visible para no perder el hilo.
  const mover = (direccion) => {
    const el = nodo.current;
    if (!el) return;
    el.scrollBy({ left: direccion * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return { fila, puedeIzq, puedeDer, izquierda: () => mover(-1), derecha: () => mover(1) };
};
