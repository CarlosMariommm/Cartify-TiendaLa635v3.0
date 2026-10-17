import { useMemo } from 'react';
import { agruparPorFamilia } from '../utils/similitud';
import { useClasificacionIA } from './useClasificacionIA';

// useSeccionesTienda — arma solas las filas de la portada de la tienda. La idea: que el empleado
// no tenga que configurar nada. Sube productos en el admin y las secciones aparecen a partir de
// esos datos.

const RATIO_POR_ACABARSE = 0.3; // 30% o menos de su tope
const MINIMO_PARA_FILA = 4;     // menos de esto no llena la fila y se ve pobre

// El armado de las filas, sin React de por medio: entra el catálogo y sale la lista de secciones.
// El hook de abajo solo se encarga de cuándo recalcularlo.
const armarSecciones = (productos, pedidos, familiasIA) => {
  const disponibles = (productos || []).filter((p) => p.stock > 0);
  if (disponibles.length === 0) return [];

  const secciones = [];
  const porId = new Map(disponibles.map((p) => [p.id, p]));

  /* ── Volver a comprar ── */
  // Recorremos los pedidos del más reciente al más viejo y nos quedamos con el
  // primer encuentro de cada producto, para que lo último comprado vaya primero.
  const yaComprados = [];
  const vistos = new Set();
  // Ordenamos nosotros en vez de confiar en el orden que traiga la API: si
  // algún día cambia, la fila seguiría funcionando pero mostraría primero lo
  // más viejo, que es justo lo que menos sirve.
  const recientesPrimero = [...(pedidos || [])].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  recientesPrimero.forEach((pedido) => {
    (pedido.items || []).forEach((item) => {
      const idProducto = item.productId?._id || item.productId;
      if (!idProducto || vistos.has(idProducto)) return;
      vistos.add(idProducto);
      const producto = porId.get(idProducto);
      if (producto) yaComprados.push(producto);
    });
  });
  if (yaComprados.length >= 2) {
    secciones.push({
      clave: 'volver-a-comprar',
      titulo: 'Volver a comprar',
      subtitulo: 'Lo que ya ha llevado antes',
      productos: yaComprados.slice(0, 12),
      todos: yaComprados,
    });
  }

  /* ── Se están acabando ── */
  const porAcabarse = disponibles
    .filter((p) => p.stockMaximo > 0 && p.stock <= p.stockMaximo * RATIO_POR_ACABARSE)
    .sort((a, b) => a.stock / a.stockMaximo - b.stock / b.stockMaximo);
  if (porAcabarse.length >= MINIMO_PARA_FILA) {
    secciones.push({
      clave: 'por-acabarse',
      titulo: 'Se están acabando',
      subtitulo: 'Quedan pocas unidades',
      productos: porAcabarse.slice(0, 12),
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
      productos: nuevos.slice(0, 12),
      todos: nuevos,
    });
  }

  /* ── Familias reconocidas (energizantes, quesos, limpieza...) ── */
  // El mapa de la IA entra aquí: son las familias que se acaban de resolver y que todavía no están
  // guardadas en el producto. Sin él, esos productos caerían en el respaldo viejo (la primera
  // palabra del nombre) hasta la siguiente visita.
  agruparPorFamilia(disponibles, MINIMO_PARA_FILA, familiasIA)
    .slice(0, 4) // no queremos una portada infinita
    .forEach((familia) => {
      secciones.push({
        // La clave sale de la familia, no del título: dos títulos podrían
        // repetirse al traducirlos, la clave de la taxonomía nunca.
        clave: `familia-${familia.clave}`,
        titulo: familia.titulo,
        subtitulo: '{n} productos',
        subtituloVars: { n: familia.productos.length },
        productos: familia.productos.slice(0, 12),
        // La fila muestra 12; la lista completa va aparte para la pantalla de "ver todos". Se guardan las
        // dos y no una sola con el corte hecho después, porque el corte de 12 es una decisión de la FILA
        // (lo que cabe deslizándose de lado), no de la sección.
        todos: familia.productos,
      });
    });

  return secciones;
};

export const useSeccionesTienda = ({ productos, pedidos = [] }) => {
  // La clasificación se pide desde aquí y no desde la pantalla: la tienda solo pinta filas, no tiene
  // por qué enterarse de que existe una IA de por medio.
  const { familias: familiasIA } = useClasificacionIA(productos);

  return useMemo(
    () => armarSecciones(productos, pedidos, familiasIA),
    [productos, pedidos, familiasIA]
  );
};
