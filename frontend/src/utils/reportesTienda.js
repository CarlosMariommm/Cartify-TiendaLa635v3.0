// LOS REPORTES DEL TABLERO — reportesTienda.js
// "Resumen de la tienda" e "Inventario completo" en PDF, con el formato del reporte predictivo:
// encabezado de la tienda, resumen en palabras y tablas.

import {
  COLOR, COLOR_GRAFICA, MESES_CORTOS, dinero, fechaLarga, graficaDeBarras, hoyLocal,
  nuevoReporte, parrafo, pie, seccion, tabla, vinetas,
} from './reportesPdf';

// Qué rango trae la gráfica de ventas y compras (ver construirSerie en dashboardController.js).
export const ETIQUETA_PERIODO = {
  semana: 'los últimos 7 días',
  mes: 'los últimos 6 meses',
  anio: 'los últimos 12 meses',
};

// "06/10" (por día) → "6 oct"; "2026-10" (por mes) → "oct 2026".
export const etiquetaDeSerie = (etiqueta) => {
  const dia = /^(\d{2})\/(\d{2})$/.exec(etiqueta);
  if (dia) return `${Number(dia[1])} ${MESES_CORTOS[Number(dia[2]) - 1]}`;
  const mes = /^(\d{4})-(\d{2})$/.exec(etiqueta);
  if (mes) return `${MESES_CORTOS[Number(mes[2]) - 1]} ${mes[1]}`;
  return String(etiqueta || '');
};

const contar = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
// "a, b y c"
const unir = (partes) => (partes.length < 2 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`);
const lista = (nombres, maximo = 3) =>
  nombres.slice(0, maximo).join(', ') + (nombres.length > maximo ? ` y ${nombres.length - maximo} más` : '');
// "12% más que ayer"; la variación viene del servidor ya en por ciento.
const comparado = (pct, contra) =>
  !pct ? `igual que ${contra}` : `${Math.abs(pct)}% ${pct > 0 ? 'más' : 'menos'} que ${contra}`;
const deltaDinero = (delta, contra) =>
  Math.abs(delta || 0) < 0.005 ? `igual que ${contra}` : `${dinero(Math.abs(delta))} ${delta > 0 ? 'más' : 'menos'} que ${contra}`;
const numero = (n) => Number(n) || 0;
const existencia = (stock, unidad) => (unidad === 'libra' ? `${numero(stock).toFixed(1)} lb` : String(Math.round(numero(stock))));

// La hora de El Salvador, "10:15 a. m.", para decir cuándo se generó.
const hora = (ahora) =>
  ahora.toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit', timeZone: 'America/El_Salvador' });

/* ══════════ Resumen de la tienda ══════════ */

export const resumenDeLaTienda = (data, periodo) => {
  const puntos = [];

  // Con todo en cero no se dice "0 pedidos, igual que ayer": se dice que no hay.
  if (!data.pedidosHoy.valor && !data.ingresos.valor) {
    puntos.push('Hoy todavía no hay pedidos ni ventas cobradas.');
  } else {
    puntos.push(`Hoy van ${contar(data.pedidosHoy.valor, 'pedido', 'pedidos')} (${comparado(data.pedidosHoy.variacion, 'ayer')}) e ingresos por ${dinero(data.ingresos.valor)} (${deltaDinero(data.ingresos.delta, 'ayer')}).`);
    const margen = numero(data.ganancia?.margen);
    puntos.push(data.ingresos.valor > 0
      ? `La ganancia real de hoy es ${dinero(data.ganancia.valor)}, con un margen de ${margen}%${margen < 0 ? ': se está vendiendo por debajo del costo' : ''}.`
      : 'Los pedidos de hoy todavía no tienen ventas cobradas.');
  }

  const serie = data.grafica || [];
  if (serie.length) {
    const ventas = serie.reduce((s, d) => s + d.ventas, 0);
    const compras = serie.reduce((s, d) => s + d.compras, 0);
    puntos.push(`En ${ETIQUETA_PERIODO[periodo] || 'el periodo'}, las ventas suman ${dinero(ventas)} y las compras a proveedores ${dinero(compras)}: una diferencia de ${dinero(ventas - compras)}.`);
  }

  if (data.masVendidos?.length) {
    puntos.push(`Lo más vendido: ${data.masVendidos.slice(0, 3).map((p) => `${p.nombre} (${p.vendidos})`).join(', ')}.`);
  }

  const atender = [
    data.pedidosPorPreparar > 0 && contar(data.pedidosPorPreparar, 'pedido por preparar', 'pedidos por preparar'),
    data.impresionesPendientes > 0 && contar(data.impresionesPendientes, 'impresión pendiente', 'impresiones pendientes'),
    data.porReponer?.total > 0 && contar(data.porReponer.total, 'producto por reponer', 'productos por reponer'),
    data.porCaducar?.total > 0 && contar(data.porCaducar.total, 'lote por caducar', 'lotes por caducar'),
  ].filter(Boolean);
  puntos.push(atender.length
    ? `Requiere atención: ${unir(atender)}.`
    : 'No hay pedidos esperando ni productos por reponer o por caducar.');

  puntos.push(data.clientesNuevos
    ? `${contar(data.clientesNuevos, 'cliente nuevo', 'clientes nuevos')} en los últimos 7 días, de ${data.totalClientes} activos.`
    : `Ningún cliente nuevo en los últimos 7 días; hay ${data.totalClientes} activos.`);

  if (data.sinMovimiento?.length) {
    puntos.push(`Sin ventas desde que están en la tienda: ${lista(data.sinMovimiento.map((p) => p.name))}. Son buenos candidatos para una promoción.`);
  }
  return puntos;
};

export const construirResumenTienda = (data, periodo, tienda, ahora = new Date()) => {
  const hoy = hoyLocal(ahora);
  const { doc, y: inicio } = nuevoReporte({
    tienda,
    titulo: 'Resumen de la tienda',
    renglones: [
      `Cifras del ${fechaLarga(hoy)}  ·  Ventas y compras de ${ETIQUETA_PERIODO[periodo] || 'el periodo'}`,
      `Generado el ${fechaLarga(hoy)} a las ${hora(ahora)}`,
    ],
  });
  let y = inicio;

  y = seccion(doc, 'Resumen', y);
  y = vinetas(doc, resumenDeLaTienda(data, periodo), y);

  y = seccion(doc, 'Indicadores', y);
  y = tabla(doc, {
    y,
    encabezado: ['Indicador', 'Valor', 'Comparación'],
    filas: [
      ['Pedidos de hoy', String(data.pedidosHoy.valor), comparado(data.pedidosHoy.variacion, 'ayer')],
      ['Ingresos de hoy', dinero(data.ingresos.valor), deltaDinero(data.ingresos.delta, 'ayer')],
      ['Costo de lo vendido hoy', dinero(data.inversion.valor), deltaDinero(data.inversion.delta, 'ayer')],
      ['Ganancia real de hoy', dinero(data.ganancia.valor), data.ingresos.valor > 0 ? `margen de ${numero(data.ganancia.margen)}%` : ''],
      ['Ticket promedio de hoy', dinero(data.ticketPromedio), ''],
      ['Entregados en 7 días', String(data.entregados.valor), comparado(data.entregados.variacion, 'la semana anterior')],
      ['Pedidos por preparar', String(data.pedidosPorPreparar), ''],
      ['Impresiones pendientes', String(data.impresionesPendientes), ''],
      ['Productos por reponer', String(data.porReponer.total), ''],
      ['Lotes por caducar', String(data.porCaducar.total), data.umbrales?.diasCaduca ? `en los próximos ${data.umbrales.diasCaduca} días` : ''],
      ['Clientes nuevos en 7 días', String(data.clientesNuevos), `de ${data.totalClientes} activos`],
      ['Puntos canjeados en 30 días', String(data.puntosCanjeados), `descuento de ${dinero(data.descuentoPorPuntos)}`],
      ['Productos activos', String(data.totalProductos), ''],
    ],
    derecha: [1],
    anchos: { 1: 30 },
  });

  const serie = data.grafica || [];
  y = seccion(doc, `Ventas y compras · ${ETIQUETA_PERIODO[periodo] || 'el periodo'}`, y);
  if (serie.length) {
    y = graficaDeBarras(doc, y, {
      grupos: serie.map((d) => ({
        etiqueta: etiquetaDeSerie(d.etiqueta),
        barras: [{ valor: d.ventas, color: COLOR_GRAFICA.marca }, { valor: d.compras, color: COLOR_GRAFICA.real }],
      })),
      leyenda: [
        { texto: 'Ventas', color: COLOR_GRAFICA.marca },
        { texto: 'Compras a proveedores', color: COLOR_GRAFICA.real },
      ],
    });
    const ventas = serie.reduce((s, d) => s + d.ventas, 0);
    const compras = serie.reduce((s, d) => s + d.compras, 0);
    y = tabla(doc, {
      y,
      encabezado: [periodo === 'semana' ? 'Día' : 'Mes', 'Ventas', 'Compras', 'Diferencia'],
      filas: serie.map((d) => [etiquetaDeSerie(d.etiqueta), dinero(d.ventas), dinero(d.compras), dinero(d.ventas - d.compras)]),
      pie: ['Total', dinero(ventas), dinero(compras), dinero(ventas - compras)],
      derecha: [1, 2, 3],
    });
  } else {
    y = parrafo(doc, 'Todavía no hay ventas ni compras en este periodo.', y, { tamano: 9, color: COLOR.tinta });
  }

  if (data.masVendidos?.length) {
    y = seccion(doc, 'Productos más vendidos', y);
    y = tabla(doc, {
      y,
      encabezado: ['#', 'Producto', 'Vendidos', 'En bodega', 'Precio'],
      filas: data.masVendidos.map((p, i) => [String(i + 1), p.nombre, String(p.vendidos), p.stock == null ? '—' : String(p.stock), dinero(p.precio)]),
      derecha: [2, 3, 4],
      anchos: { 0: 10 },
    });
  }

  if (data.ventasPorModulo?.length) {
    const total = data.ventasPorModulo.reduce((s, m) => s + m.total, 0) + numero(data.ventasSinModulo);
    y = seccion(doc, 'Ventas por módulo', y);
    y = tabla(doc, {
      y,
      encabezado: ['Módulo', 'Venta', 'Parte del total'],
      filas: [
        ...data.ventasPorModulo.map((m) => [m.modulo, dinero(m.total), `${Math.round((m.total / (total || 1)) * 100)}%`]),
        ...(numero(data.ventasSinModulo) > 0
          ? [['Sin módulo asignado', dinero(data.ventasSinModulo), `${Math.round((data.ventasSinModulo / (total || 1)) * 100)}%`]]
          : []),
      ],
      pie: ['Total', dinero(total), '100%'],
      derecha: [1, 2],
    });
  }

  if (data.porReponer?.lista?.length) {
    y = seccion(doc, 'Productos por reponer', y);
    y = tabla(doc, {
      y,
      encabezado: ['Producto', 'Existencia', 'Existencia máxima', 'Precio'],
      filas: data.porReponer.lista.map((p) => [p.name, String(p.stock ?? 0), p.maxQuantity ? String(p.maxQuantity) : '—', dinero(p.salePrice)]),
      derecha: [1, 2, 3],
    });
  }

  if (data.porCaducar?.lista?.length) {
    y = seccion(doc, 'Lotes por caducar', y);
    y = tabla(doc, {
      y,
      encabezado: ['Producto', 'Caduca el', 'Existencia'],
      filas: data.porCaducar.lista.map((p) => [p.name, p.expirationDate ? fechaLarga(p.expirationDate) : 'Sin fecha', String(p.stock ?? 0)]),
      derecha: [2],
    });
  }

  if (data.sinMovimiento?.length) {
    y = seccion(doc, 'Productos sin movimiento', y);
    y = parrafo(doc, 'Activos en la tienda y sin una sola venta todavía.', y);
    tabla(doc, {
      y,
      encabezado: ['Producto', 'Existencia', 'Precio'],
      filas: data.sinMovimiento.map((p) => [p.name, String(p.stock ?? 0), dinero(p.salePrice)]),
      derecha: [1, 2],
    });
  }

  pie(doc, `${tienda.nombre}  ·  Resumen de la tienda  ·  ${fechaLarga(hoy)}`);
  return doc;
};

/* ══════════ Inventario completo ══════════ */

const margenDe = (p) => {
  const precio = numero(p.salePrice);
  const costo = numero(p.priceCost);
  return precio > 0 && costo > 0 ? (precio - costo) / precio : null;
};

export const resumenDelInventario = (productos) => {
  const puntos = [];
  const porLibra = productos.filter((p) => p.unidadVenta === 'libra').length;
  puntos.push(`${contar(productos.length, 'producto activo', 'productos activos')}${porLibra ? `; ${porLibra} se ${porLibra === 1 ? 'vende' : 'venden'} por libra` : ''}.`);

  const aCosto = productos.reduce((s, p) => s + Math.max(numero(p.stock), 0) * numero(p.priceCost), 0);
  const aVenta = productos.reduce((s, p) => s + Math.max(numero(p.stock), 0) * numero(p.salePrice), 0);
  puntos.push(`El inventario vale ${dinero(aCosto)} a costo y ${dinero(aVenta)} a precio de venta: ${dinero(aVenta - aCosto)} de ganancia si se vendiera todo.`);

  const agotados = productos.filter((p) => numero(p.stock) <= 0);
  if (agotados.length) {
    puntos.push(`${contar(agotados.length, 'producto está', 'productos están')} sin existencia: ${lista(agotados.map((p) => p.name))}.`);
  }
  const sinGanancia = productos.filter((p) => numero(p.salePrice) > 0 && numero(p.priceCost) >= numero(p.salePrice));
  if (sinGanancia.length) {
    puntos.push(`${contar(sinGanancia.length, 'producto se vende', 'productos se venden')} a su costo o por debajo: ${lista(sinGanancia.map((p) => p.name))}. Conviene revisar su precio.`);
  }
  const sinCosto = productos.filter((p) => !(numero(p.priceCost) > 0)).length;
  if (sinCosto) {
    puntos.push(`${contar(sinCosto, 'producto no tiene', 'productos no tienen')} costo registrado: no entran en el valor a costo ni en el margen.`);
  }
  return puntos;
};

export const construirInventario = (productos, tienda, ahora = new Date()) => {
  const hoy = hoyLocal(ahora);
  const categoria = (p) => p.typeId?.type || '';
  // Por categoría y, dentro, por nombre: se busca como en la bodega.
  const ordenados = [...productos].sort((a, b) =>
    (categoria(a) || '~').localeCompare(categoria(b) || '~', 'es') || String(a.name || '').localeCompare(String(b.name || ''), 'es'));

  const { doc, y: inicio } = nuevoReporte({
    tienda,
    titulo: 'Inventario completo',
    orientacion: 'landscape',
    renglones: [
      `${contar(productos.length, 'producto activo', 'productos activos')}, por categoría  ·  Precio, costo, margen y existencia`,
      `Generado el ${fechaLarga(hoy)} a las ${hora(ahora)}`,
    ],
  });
  let y = inicio;

  y = seccion(doc, 'Resumen', y);
  y = vinetas(doc, resumenDelInventario(productos), y);

  y = seccion(doc, 'Productos', y);
  const valorTotal = ordenados.reduce((s, p) => s + Math.max(numero(p.stock), 0) * numero(p.priceCost), 0);
  tabla(doc, {
    y,
    encabezado: ['Producto', 'Categoría', 'Marca', 'Módulo', 'Precio', 'Costo', 'Margen', 'Existencia', 'Valor a costo'],
    filas: ordenados.map((p) => {
      const margen = margenDe(p);
      return [
        p.name || '—',
        categoria(p) || '—',
        p.brandId?.name || '—',
        p.moduleId?.name || '—',
        dinero(p.salePrice),
        numero(p.priceCost) > 0 ? dinero(p.priceCost) : '—',
        margen == null ? '—' : `${Math.round(margen * 100)}%`,
        existencia(p.stock, p.unidadVenta),
        numero(p.priceCost) > 0 ? dinero(Math.max(numero(p.stock), 0) * numero(p.priceCost)) : '—',
      ];
    }),
    pie: ['Total', '', '', '', '', '', '', '', dinero(valorTotal)],
    derecha: [4, 5, 6, 7, 8],
  });

  pie(doc, `${tienda.nombre}  ·  Inventario completo  ·  ${fechaLarga(hoy)}`);
  return doc;
};
