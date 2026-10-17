// SECCIONES DE LA PORTADA — secciones.js
// Las filas se arman solas con el inventario: el empleado sube productos en el panel y las
// secciones aparecen. Nadie configura nada.

const RATIO_POR_ACABARSE = 0.3; // 30% o menos de su tope
const MINIMO_PARA_FILA = 4;     // menos de esto no llena la fila y se ve pobre
const CUANTOS_EN_LA_FILA = 12;

export const armarSecciones = (productos) => {
  const disponibles = (productos || []).filter((p) => p.stock > 0);
  if (disponibles.length === 0) return [];

  const secciones = [];

  /* ── Se están acabando ── */
  // Contra el tope de CADA producto, no contra un número fijo. Cinco unidades son muchas para un
  // producto del que normalmente hay seis, y son nada para uno del que hay doscientas: un umbral
  // fijo llamaría urgente a lo que no lo es y se callaría lo que sí.
  const porAcabarse = disponibles
    .filter((p) => p.stockMaximo > 0 && p.stock <= p.stockMaximo * RATIO_POR_ACABARSE)
    .sort((a, b) => a.stock / a.stockMaximo - b.stock / b.stockMaximo);

  if (porAcabarse.length >= MINIMO_PARA_FILA) {
    secciones.push({
      clave: 'por-acabarse',
      titulo: 'Se están acabando',
      subtitulo: 'Quedan pocas unidades',
      productos: porAcabarse.slice(0, CUANTOS_EN_LA_FILA),
      todos: porAcabarse,
    });
  }

  /* ── Nuevos en la tienda ── */
  const nuevos = disponibles
    .filter((p) => p.creadoEn)
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));

  if (nuevos.length >= MINIMO_PARA_FILA) {
    secciones.push({
      clave: 'nuevos',
      titulo: 'Nuevos en la tienda',
      subtitulo: 'Lo último que llegó',
      productos: nuevos.slice(0, CUANTOS_EN_LA_FILA),
      // La fila muestra 12; la lista completa va aparte para "Ver todos". Se guardan las dos y no una
      // sola con el corte hecho después, porque el corte de 12 es una decisión de la FILA (lo que vale
      // la pena deslizar de lado), no de la sección.
      todos: nuevos,
    });
  }

  return secciones;
};

export default armarSecciones;
