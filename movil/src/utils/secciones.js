// SECCIONES DE LA PORTADA — secciones.js
// Las filas se arman solas con el inventario: el empleado sube productos en el panel y las
// secciones aparecen. Nadie configura nada.

import { agruparPorFamilia } from './familias';

const RATIO_POR_ACABARSE = 0.3; // 30% o menos de su tope
const MINIMO_PARA_FILA = 4;     // menos de esto no llena la fila y se ve pobre
const CUANTOS_EN_LA_FILA = 12;

// `pedidos`: los del cliente con sesión, para "Volver a comprar". Las mismas filas que la web
// (hooks/useSeccionesTienda.js), y el panel decide cuáles se ven (ver utils/portada.js).
export const armarSecciones = (productos, pedidos = []) => {
  const disponibles = (productos || []).filter((p) => p.stock > 0);
  if (disponibles.length === 0) return [];

  const secciones = [];
  const porId = new Map(disponibles.map((p) => [String(p.id), p]));

  /* ── Volver a comprar ── */
  // Del pedido más reciente al más viejo, cada producto una vez: lo último que llevó va primero.
  const yaComprados = [];
  const vistos = new Set();
  [...(pedidos || [])]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .forEach((pedido) => {
      (pedido.items || []).forEach((item) => {
        const id = String(item.productId?._id || item.productId || '');
        if (!id || vistos.has(id)) return;
        vistos.add(id);
        const producto = porId.get(id);
        if (producto) yaComprados.push(producto);
      });
    });
  if (yaComprados.length >= 2) {
    secciones.push({
      clave: 'volver-a-comprar',
      titulo: 'Volver a comprar',
      subtitulo: 'Lo que ya ha llevado antes',
      productos: yaComprados.slice(0, CUANTOS_EN_LA_FILA),
      todos: yaComprados,
    });
  }

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

  /* ── Estantes automáticos (quesos, energizantes, limpieza…) ── */
  agruparPorFamilia(disponibles, MINIMO_PARA_FILA)
    .slice(0, 4)
    .forEach((familia) => {
      secciones.push({
        clave: `familia-${familia.clave}`,
        titulo: familia.titulo,
        subtitulo: '{n} productos',
        subtituloVars: { n: familia.productos.length },
        productos: familia.productos.slice(0, CUANTOS_EN_LA_FILA),
        todos: familia.productos,
      });
    });

  return secciones;
};

export default armarSecciones;
