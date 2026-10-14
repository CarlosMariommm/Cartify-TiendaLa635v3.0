/*
 * ============================================================
 * EL REPORTE PREDICTIVO EN PDF — reportePredictivo.js
 * ============================================================
 * Lo que calcula el servicio de analítica (analitica/app/pronostico.py, vía
 * GET /dashboard/pronostico), puesto en un documento para el administrador:
 *
 *   1. Resumen        en palabras, lo que hay que saber;
 *   2. Ventas         las 4 semanas que vienen con su rango, al lado de las
 *                     4 que pasaron (gráfica y tabla);
 *   3. Se agotan      los productos que no llegan a fin de mes, el primero
 *                     arriba;
 *   4. Compras        lo que conviene pedir, por proveedor, con su costo;
 *   5. Por producto   el pronóstico de cada uno;
 *   6. Confiabilidad  qué tan bien acierta y cómo se calculó.
 *
 * El documento no exagera: con poco historial lo dice, con un solo día de
 * venta no sugiere cantidades y los rangos van siempre al lado del número.
 * El formato (encabezado, tablas, pie) es el de utils/reportesPdf.js.
 * ============================================================
 */

import {
  COLOR, COLOR_GRAFICA, MARGEN, asegurarEspacio, dinero, fechaCorta, fechaLarga, graficaDeBarras, hoyLocal,
  nuevoReporte, parrafo, pie, porciento, rangoDeFechas, seccion, tabla, vinetas,
} from './reportesPdf';
import { nombreDelCanal } from './pedidoProveedor';

const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const CONFIANZA = { alta: 'Alta', media: 'Media', baja: 'Baja' };

/*
 * Cuántas unidades, escrito siempre igual en todo el reporte:
 *   - lo que se espera (un promedio) lleva un decimal: 3.8;
 *   - lo que se cuenta (existencia, vendido, pedir) y los rangos, enteros;
 *   - por libra, siempre un decimal y "lb".
 */
export const cantidad = (n, unidad = 'unidad', { promedio = false } = {}) => {
  const valor = Number(n) || 0;
  if (unidad === 'libra') return `${valor.toFixed(1)} lb`;
  return promedio ? valor.toFixed(1) : String(Math.round(valor));
};

// "0 a 9" o "1.8 a 8.9 lb": la unidad una sola vez.
export const rango = (bajo, alto, unidad = 'unidad') =>
  unidad === 'libra'
    ? `${Number(bajo).toFixed(1)} a ${Number(alto).toFixed(1)} lb`
    : `${Math.round(bajo)} a ${Math.round(alto)}`;

// "Un producto" / "3 productos"
const contar = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

const semanasDe = (datos) => Math.round((datos.tienda?.dias?.length || 28) / 7);

// Los productos que no llegan al final del periodo: lo agotado primero.
const queSeAgotan = (datos) => datos.productos.filter((p) => p.se_acaba?.agotado || p.se_acaba?.probable);

/*
 * El resumen, en frases. Aparte del PDF para poder probarlo (y para que
 * Tiqui del panel lo pueda contar igual, más adelante).
 */
export const resumenDelPronostico = (datos) => {
  const puntos = [];
  const { tienda, historial, precision } = datos;
  const semanas = semanasDe(datos);
  const periodo = tienda.periodo;

  let ventas = `Se proyectan ventas por ${dinero(periodo.esperado)} en las próximas ${semanas} semanas (entre ${dinero(periodo.bajo)} y ${dinero(periodo.alto)}, con 80% de probabilidad)`;
  if (tienda.periodo_anterior) {
    const cambio = (periodo.esperado - tienda.periodo_anterior) / tienda.periodo_anterior;
    ventas += Math.abs(cambio) < 0.02
      ? `, casi lo mismo que las ${semanas} semanas anteriores (${dinero(tienda.periodo_anterior)})`
      : `, un ${porciento(cambio)} ${cambio > 0 ? 'más' : 'menos'} que las ${semanas} semanas anteriores (${dinero(tienda.periodo_anterior)})`;
  }
  puntos.push(`${ventas}.`);

  const agotados = datos.productos.filter((p) => p.se_acaba?.agotado);
  const seAgotaran = datos.productos.filter((p) => !p.se_acaba?.agotado && p.se_acaba?.probable);
  if (agotados.length) {
    const nombres = agotados.slice(0, 3).map((p) => p.nombre).join(', ');
    puntos.push(`${agotados.length === 1 ? 'Ya está agotado' : `Ya están agotados ${agotados.length} productos que se venden`}: ${nombres}${agotados.length > 3 ? ' y otros' : ''}.`);
  }
  if (seAgotaran.length) {
    const primero = seAgotaran[0];
    puntos.push(seAgotaran.length === 1
      ? `${primero.nombre} se agotaría alrededor del ${fechaLarga(primero.se_acaba.probable)} con la venta esperada.`
      : `${seAgotaran.length} productos se agotarían en las próximas ${semanas} semanas con la venta esperada; el primero, ${primero.nombre}, alrededor del ${fechaLarga(primero.se_acaba.probable)}.`);
  } else if (!agotados.length) {
    puntos.push(`Ningún producto se agotaría en las próximas ${semanas} semanas con la venta esperada.`);
  }

  const proveedores = datos.proveedores || [];
  if (proveedores.length) {
    const total = proveedores.reduce((s, g) => s + g.costo_total, 0);
    const productos = proveedores.reduce((s, g) => s + g.productos.length, 0);
    puntos.push(`La compra sugerida para llegar a la próxima reposición suma ${dinero(total)}: ${productos} ${productos === 1 ? 'producto' : 'productos'} con ${proveedores.length} ${proveedores.length === 1 ? 'proveedor' : 'proveedores'}.`);
  } else {
    puntos.push('Con la existencia actual no hace falta pedir nada antes de la próxima compra.');
  }

  const sinBase = datos.productos.filter((p) => p.pedir === null).length;
  if (sinBase) {
    puntos.push(`${sinBase} ${sinBase === 1 ? 'producto tiene' : 'productos tienen'} menos de 3 días con venta: se incluyen en el pronóstico, pero todavía no hay base para sugerir cuánto pedir.`);
  }

  const perfil = datos.perfil_semana || [];
  if (perfil.length === 7) {
    const fuerte = perfil.indexOf(Math.max(...perfil));
    const flojo = perfil.indexOf(Math.min(...perfil));
    if (perfil[fuerte] - 1 >= 0.1 && 1 - perfil[flojo] >= 0.1) {
      puntos.push(`El día más fuerte de la semana es el ${DIAS_SEMANA[fuerte]} (${porciento(perfil[fuerte] - 1)} más que un día promedio) y el más flojo, el ${DIAS_SEMANA[flojo]} (${porciento(1 - perfil[flojo])} menos).`);
    }
  }

  // Una sola semana de prueba no alcanza para hablar de precisión: se dice preliminar.
  if (precision?.probado && precision.semanas >= 2) {
    const t = precision.tienda;
    // Las dos cifras: en la venta de la tienda puede empatar con lo ingenuo;
    // por producto (lo que dice qué se agota) es donde suele ganar.
    const p = precision.productos;
    const porProducto = p?.error != null && p?.error_ingenuo != null
      ? `, y la de cada producto con ${porciento(p.error)} (repetir la semana anterior: ${porciento(p.error_ingenuo)})`
      : '';
    puntos.push(`Probado contra las últimas ${precision.semanas} semanas como si no se conocieran: la venta semanal de la tienda se estimó con un error de ${porciento(t.error)} (repetir la semana anterior: ${porciento(t.error_ingenuo)})${porProducto}.`);
  } else {
    puntos.push(`Pronóstico preliminar: se basa en ${historial.dias} días de ventas (${historial.pedidos} pedidos). Su precisión se mide bien desde 5 semanas de historial, y mejora con cada semana que pasa.`);
  }

  return puntos;
};

/*
 * La gráfica: las semanas que pasaron (gris) y las que vienen (azul), con el
 * rango del pronóstico como una línea vertical (ver reportesPdf.graficaDeBarras).
 */
const grafica = (doc, y, datos) => graficaDeBarras(doc, y, {
  grupos: [
    ...(datos.historial?.semanas || []).map((s) => ({ etiqueta: fechaCorta(s.desde), barras: [{ valor: s.total, color: COLOR_GRAFICA.real }] })),
    ...datos.tienda.semanas.map((s) => ({ etiqueta: fechaCorta(s.desde), barras: [{ valor: s.esperado, bajo: s.bajo, alto: s.alto, color: COLOR_GRAFICA.marca }] })),
  ],
  leyenda: [
    { texto: 'Venta real por semana', color: COLOR_GRAFICA.real },
    { texto: 'Pronóstico, con su rango probable (80%)', color: COLOR_GRAFICA.marca },
  ],
});

/*
 * El documento. `tienda`: los datos del encabezado (ver reportesPdf.nuevoReporte).
 * Devuelve el jsPDF ya armado; quien lo llama lo descarga.
 */
export const construirReportePredictivo = (datos, tienda, ahora = new Date()) => {
  const { historial, tienda: ventas } = datos;
  const semanas = semanasDe(datos);
  const primero = ventas.dias[0]?.dia;
  const ultimo = ventas.dias[ventas.dias.length - 1]?.dia;

  const { doc, y: inicio } = nuevoReporte({
    tienda,
    // La demostración lo dice en el título: es un papel que se imprime y se enseña.
    titulo: datos.demo ? 'Reporte predictivo · demostración' : 'Reporte predictivo',
    renglones: [
      ...(datos.demo ? ['Con ventas inventadas para mostrar el pronóstico: no son de la tienda real'] : []),
      `Proyección ${rangoDeFechas(primero, ultimo)}`,
      `Generado el ${fechaLarga(hoyLocal(ahora))}  ·  Basado en ${historial.dias} días de ventas, ${rangoDeFechas(historial.desde, historial.hasta)} (${historial.pedidos} pedidos)`,
    ],
  });
  let y = inicio;

  // 1. Resumen
  y = seccion(doc, 'Resumen', y);
  y = vinetas(doc, resumenDelPronostico(datos), y);

  // 2. Ventas
  y = seccion(doc, `Ventas proyectadas de la tienda · próximas ${semanas} semanas`, y);
  y = grafica(doc, y, datos);
  y = tabla(doc, {
    y,
    encabezado: ['Semana', 'Del', 'Al', 'Venta esperada', 'Rango probable (80%)'],
    filas: ventas.semanas.map((s, i) => [
      `Semana ${i + 1}`, fechaLarga(s.desde), fechaLarga(s.hasta), dinero(s.esperado), `${dinero(s.bajo)} a ${dinero(s.alto)}`,
    ]),
    pie: ['Total', '', '', dinero(ventas.periodo.esperado), `${dinero(ventas.periodo.bajo)} a ${dinero(ventas.periodo.alto)}`],
    derecha: [3, 4],
  });

  // 3. Se agotan
  y = seccion(doc, 'Productos que se agotarían', y);
  const agotan = queSeAgotan(datos);
  if (agotan.length) {
    y = tabla(doc, {
      y,
      encabezado: ['Producto', 'Existencia', 'Venta por semana', 'Se agota (probable)', 'Lo antes posible', 'Confianza'],
      filas: agotan.map((p) => [
        p.nombre,
        cantidad(p.stock, p.unidad),
        cantidad(p.semana.esperado, p.unidad, { promedio: true }),
        p.se_acaba.agotado ? 'Ya agotado' : fechaLarga(p.se_acaba.probable),
        p.se_acaba.agotado ? '—' : fechaLarga(p.se_acaba.pronto || p.se_acaba.probable),
        CONFIANZA[p.confianza] || p.confianza,
      ]),
      derecha: [1, 2],
    });
  } else {
    y = parrafo(doc, `Con la venta esperada, ningún producto se agota en las próximas ${semanas} semanas.`, y, { tamano: 9, color: COLOR.tinta });
  }

  // 4. Compras
  y = seccion(doc, 'Compra sugerida por proveedor', y);
  y = parrafo(doc, 'Cantidad para llegar a la próxima compra (cada cuántos días se le compra a cada proveedor sale de su historial de compras; sin historial, una vez por semana), cubriendo el 90% de los escenarios simulados, menos lo que ya hay en existencia.', y);
  if (datos.proveedores?.length) {
    datos.proveedores.forEach((g) => {
      y = asegurarEspacio(doc, y, 22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR.tinta);
      const canal = nombreDelCanal(g.pedido);
      doc.text(`${g.nombre || 'Sin proveedor asignado'}  ·  se le compra cada ${g.ciclo_dias} días${canal ? `  ·  se le pide por ${canal}` : ''}`, MARGEN, y);
      y = tabla(doc, {
        y: y + 2,
        encabezado: ['Producto', 'Existencia', 'Pedir', 'Costo estimado'],
        filas: g.productos.map((p) => [p.nombre, cantidad(p.stock, p.unidad), cantidad(p.pedir, p.unidad), dinero(p.costo_pedido)]),
        pie: ['Total', '', '', dinero(g.costo_total)],
        derecha: [1, 2, 3],
      });
    });
  } else {
    y = parrafo(doc, 'Con la existencia actual no hace falta pedir nada antes de la próxima compra.', y, { tamano: 9, color: COLOR.tinta });
  }

  // 5. Por producto
  y = seccion(doc, 'Pronóstico por producto', y);
  const porVenta = [...datos.productos].sort((a, b) => b.periodo.esperado - a.periodo.esperado);
  y = tabla(doc, {
    y,
    encabezado: ['Producto', 'Vendido', 'Días con venta', 'Próxima semana', 'Rango (80%)', `Próximas ${semanas} sem.`, 'Confianza'],
    filas: porVenta.map((p) => [
      p.nombre + (p.al_por_mayor ? ' *' : ''),
      cantidad(p.vendido, p.unidad),
      String(p.dias_con_venta),
      cantidad(p.semana.esperado, p.unidad, { promedio: true }),
      rango(p.semana.bajo, p.semana.alto, p.unidad),
      cantidad(p.periodo.esperado, p.unidad, { promedio: true }),
      CONFIANZA[p.confianza] || p.confianza,
    ]),
    derecha: [1, 2, 3, 4, 5],
  });
  const notas = [];
  if (datos.productos.some((p) => p.al_por_mayor)) {
    notas.push('* Tuvo ventas al por mayor (más del triple de lo normal). Cuentan en lo vendido, pero no en el ritmo de todos los días.');
  }
  if (datos.productos_sin_ventas) {
    notas.push(`${contar(datos.productos_sin_ventas, 'producto activo no tuvo', 'productos activos no tuvieron')} ventas en el periodo y no se ${datos.productos_sin_ventas === 1 ? 'incluye' : 'incluyen'}.`);
  }
  notas.push('Confianza alta: 8 días o más con venta y 4 semanas de historial. Media: de 3 a 7 días con venta. Baja: menos de 3; se pronostica, pero no se sugiere cuánto pedir.');
  notas.forEach((nota) => { y = parrafo(doc, nota, y); });

  // 6. Confiabilidad y método
  y = seccion(doc, 'Confiabilidad y método', y + 2);
  const p = datos.precision;
  y = parrafo(doc, p?.probado
    ? `Validación: se pronosticaron ${p.semanas === 1 ? 'la última semana' : `las últimas ${p.semanas} semanas`} con los datos de antes, como si no se conocieran, y se comparó con lo que de verdad se vendió. Error en la venta semanal de la tienda: ${porciento(p.tienda.error)}; repitiendo la semana anterior habría sido ${porciento(p.tienda.error_ingenuo)}. Error en la venta semanal por producto: ${p.productos.error == null ? 'sin datos' : porciento(p.productos.error)}${p.productos.error_ingenuo == null ? '' : ` (repitiendo la semana anterior: ${porciento(p.productos.error_ingenuo)})`}.${p.semanas === 1 ? ' Con una sola semana de prueba, este resultado todavía no es representativo.' : ''}`
    : `Validación: ${p?.motivo || 'todavía no hay historial suficiente para medir la precisión.'}`,
  y, { tamano: 8.5, color: COLOR.tinta });
  y = parrafo(doc, [
    ventas.metodo === 'holt-winters'
      ? 'Venta de la tienda: suavizamiento exponencial Holt-Winters (modelo ETS con tendencia amortiguada y estacionalidad semanal), ajustado sobre la venta diaria.'
      : 'Venta de la tienda: con menos de tres semanas de historial, promedio de las últimas cuatro semanas ajustado por día de la semana; los escenarios se arman con días reales tomados al azar (bootstrap).',
    'Venta por producto: método de Teunter, Syntetos y Babai (TSB) para demanda intermitente, que separa la probabilidad de vender en un día de la cantidad vendida y baja la probabilidad cuando un producto deja de venderse.',
    'Rangos y fechas de agotamiento: 2,000 escenarios simulados por producto. El patrón semanal se ajusta según la cantidad de pedidos disponibles, para no tomar por patrón lo que es casualidad.',
  ].join(' '), y);

  pie(doc, `${tienda.nombre}  ·  Reporte predictivo${datos.demo ? ' (demostración)' : ''}  ·  ${fechaLarga(hoyLocal(ahora))}`);
  return doc;
};
