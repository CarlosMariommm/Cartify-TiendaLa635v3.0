/*
 * ============================================================
 * LOS REPORTES DEL PANEL, CON CARA DE DOCUMENTO — reportesPdf.js
 * ============================================================
 * Las piezas de un reporte formal, iguales para todos los que las usen:
 *
 *   nuevoReporte   la hoja carta con el encabezado de la tienda: su nombre,
 *                  sus datos (dirección, teléfono, NIT, NRC; los que estén en
 *                  Personalización › Datos del negocio), el título del
 *                  documento y los renglones que dicen de qué es y de cuándo;
 *   seccion        el título de una sección con su línea;
 *   vinetas        un resumen en puntos;
 *   parrafo        una nota en letra chica;
 *   tabla          una tabla sobria: solo líneas horizontales, números a la
 *                  derecha y el encabezado que se repite si salta de página;
 *   pie            al final: la línea, el nombre del documento y la página.
 *
 * Sobrio a propósito: tinta negra, un solo color de la casa para los
 * títulos, Helvetica, márgenes parejos. Un documento que se va a imprimir y
 * a enseñar tiene que parecer de una empresa, no de una presentación.
 *
 * Todo en milímetros. Cada función recibe la altura `y` donde va y devuelve
 * dónde termina, para que el reporte se arme de arriba a abajo sin cuentas.
 * ============================================================
 */

// Con nombre, como lo documenta jsPDF: así carga igual en el navegador y en las pruebas (Node).
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const MARGEN = 18;
const ARRIBA_EN_PAGINA_NUEVA = 20;
const ESPACIO_DEL_PIE = 20;

export const COLOR = {
  tinta: [33, 37, 41],
  suave: [108, 117, 125],
  linea: [206, 212, 218],
  marca: [0, 48, 73], // el azul de la casa (#003049)
  fondo: [238, 242, 245],
  rayado: [250, 251, 252],
};

const ancho = (doc) => doc.internal.pageSize.getWidth();
const alto = (doc) => doc.internal.pageSize.getHeight();

// Si lo que sigue no cabe, a la página siguiente.
export const asegurarEspacio = (doc, y, necesita) => {
  if (y + necesita <= alto(doc) - ESPACIO_DEL_PIE) return y;
  doc.addPage();
  return ARRIBA_EN_PAGINA_NUEVA;
};

/*
 * El logo de Personalización, como imagen que jsPDF entiende. Se pasa por un
 * canvas porque puede venir en WEBP, que jsPDF no lee. Si no carga en 5
 * segundos (o no hay logo), el reporte sale igual, sin él.
 */
export const cargarLogo = (url) => new Promise((resolver) => {
  if (!url || typeof Image === 'undefined') { resolver(null); return; }
  const imagen = new Image();
  imagen.crossOrigin = 'anonymous';
  const reloj = setTimeout(() => resolver(null), 5000);
  imagen.onload = () => {
    clearTimeout(reloj);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imagen.naturalWidth;
      canvas.height = imagen.naturalHeight;
      canvas.getContext('2d').drawImage(imagen, 0, 0);
      resolver({ datos: canvas.toDataURL('image/png'), proporcion: imagen.naturalWidth / imagen.naturalHeight });
    } catch {
      resolver(null);
    }
  };
  imagen.onerror = () => { clearTimeout(reloj); resolver(null); };
  imagen.src = url;
});

/*
 * La hoja con su encabezado. `tienda`: { nombre, direccion, telefono, nit,
 * nrc, logo } (logo = lo que devuelve cargarLogo, o nada). Devuelve el
 * documento y la altura donde empieza el contenido.
 */
export const nuevoReporte = ({ tienda, titulo, renglones = [], orientacion = 'portrait' }) => {
  const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'letter' });
  doc.setProperties({ title: `${titulo} · ${tienda.nombre}`, author: tienda.nombre, creator: tienda.nombre });
  const centro = ancho(doc) / 2;
  let y = 16;

  if (tienda.logo?.datos) {
    const altoLogo = 12;
    const anchoLogo = Math.min(altoLogo * tienda.logo.proporcion, 40);
    doc.addImage(tienda.logo.datos, 'PNG', centro - anchoLogo / 2, y - 4, anchoLogo, anchoLogo / tienda.logo.proporcion);
    y += altoLogo + 2;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COLOR.tinta);
  doc.text(String(tienda.nombre || '').toUpperCase(), centro, y, { align: 'center' });

  y += 3;
  doc.setDrawColor(...COLOR.tinta);
  doc.setLineWidth(0.5);
  doc.line(MARGEN, y, ancho(doc) - MARGEN, y);

  const datos = [
    tienda.direccion,
    tienda.telefono && `Tel. ${tienda.telefono}`,
    tienda.nit && `NIT ${tienda.nit}`,
    tienda.nrc && `NRC ${tienda.nrc}`,
  ].filter(Boolean).join('  ·  ');
  if (datos) {
    y += 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.suave);
    doc.text(datos, centro, y, { align: 'center' });
  }

  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...COLOR.marca);
  doc.text(titulo.toUpperCase(), centro, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR.suave);
  renglones.forEach((renglon) => {
    y += 4.4;
    doc.text(renglon, centro, y, { align: 'center' });
  });

  return { doc, y: y + 9 };
};

// El título no se queda solo al pie de la página: necesita lugar para lo que sigue.
export const seccion = (doc, titulo, y) => {
  y = asegurarEspacio(doc, y, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR.marca);
  doc.text(titulo, MARGEN, y);
  doc.setDrawColor(...COLOR.linea);
  doc.setLineWidth(0.3);
  doc.line(MARGEN, y + 1.8, ancho(doc) - MARGEN, y + 1.8);
  return y + 7;
};

export const vinetas = (doc, puntos, y) => {
  const anchoTexto = ancho(doc) - MARGEN * 2 - 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  puntos.forEach((punto) => {
    const lineas = doc.splitTextToSize(punto, anchoTexto);
    y = asegurarEspacio(doc, y, lineas.length * 4.3);
    doc.setTextColor(...COLOR.marca);
    doc.text('•', MARGEN + 1, y);
    doc.setTextColor(...COLOR.tinta);
    doc.text(lineas, MARGEN + 5, y);
    y += lineas.length * 4.3 + 1.6;
  });
  return y + 3;
};

export const parrafo = (doc, texto, y, { tamano = 8, color = COLOR.suave } = {}) => {
  // La letra antes de cortar: el corte de líneas se mide con el tamaño puesto.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(tamano);
  const lineas = doc.splitTextToSize(texto, ancho(doc) - MARGEN * 2);
  const interlineado = tamano * 0.45;
  y = asegurarEspacio(doc, y, lineas.length * interlineado);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(tamano);
  doc.setTextColor(...color);
  doc.text(lineas, MARGEN, y);
  return y + lineas.length * interlineado + 3;
};

/*
 * `derecha`: los índices de las columnas con números (van alineados a la
 * derecha, como en cualquier estado de cuenta). `pie`: una fila de totales.
 */
export const tabla = (doc, { y, encabezado, filas, pie, derecha = [], anchos = {} }) => {
  const columnStyles = {};
  derecha.forEach((i) => { columnStyles[i] = { ...(columnStyles[i] || {}), halign: 'right' }; });
  Object.entries(anchos).forEach(([i, cellWidth]) => { columnStyles[i] = { ...(columnStyles[i] || {}), cellWidth }; });

  autoTable(doc, {
    startY: asegurarEspacio(doc, y, 18),
    head: [encabezado],
    body: filas,
    foot: pie ? [pie] : undefined,
    showFoot: 'lastPage',
    theme: 'plain',
    margin: { left: MARGEN, right: MARGEN, top: ARRIBA_EN_PAGINA_NUEVA, bottom: ESPACIO_DEL_PIE },
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: COLOR.tinta,
      cellPadding: { top: 1.9, bottom: 1.9, left: 2, right: 2 },
      lineColor: COLOR.linea,
      lineWidth: { bottom: 0.15 },
    },
    headStyles: {
      fillColor: COLOR.fondo,
      textColor: COLOR.marca,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: COLOR.marca,
      lineWidth: { bottom: 0.35 },
    },
    footStyles: {
      fontStyle: 'bold',
      textColor: COLOR.tinta,
      lineColor: COLOR.tinta,
      lineWidth: { top: 0.35 },
    },
    alternateRowStyles: { fillColor: COLOR.rayado },
    columnStyles,
    // El encabezado de los números, también a la derecha.
    didParseCell: (celda) => {
      if ((celda.section === 'head' || celda.section === 'foot') && derecha.includes(celda.column.index)) {
        celda.cell.styles.halign = 'right';
      }
    },
  });
  return doc.lastAutoTable.finalY + 8;
};

// En cada página: la línea, de qué documento es y qué página es.
export const pie = (doc, texto) => {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const base = alto(doc) - 11;
    doc.setDrawColor(...COLOR.linea);
    doc.setLineWidth(0.2);
    doc.line(MARGEN, base - 3.5, ancho(doc) - MARGEN, base - 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.suave);
    doc.text(texto, MARGEN, base);
    doc.text(`Página ${i} de ${total}`, ancho(doc) - MARGEN, base, { align: 'right' });
  }
};

/*
 * Los datos de la tienda para el encabezado, sacados de Personalización:
 * nombre, dirección, y teléfono, NIT y NRC de "Datos del negocio", más el
 * logo si hay. Lo usan todos los reportes del panel.
 */
export const datosDeLaTienda = async (ajustes) => {
  const negocio = ajustes?.negocio || {};
  return {
    nombre: `${ajustes?.nombreLinea1 || ''} ${ajustes?.nombreLinea2 || ''}`.trim() || 'Tienda la 635',
    direccion: ajustes?.direccion,
    telefono: negocio.telefono,
    nit: negocio.nit,
    nrc: negocio.nrc,
    logo: await cargarLogo(ajustes?.logoUrl),
  };
};

// Un paso "redondo" para las líneas guía de una gráfica: 1, 2, 2.5 o 5 por potencia de 10.
export const pasoRedondo = (bruto) => {
  if (!(bruto > 0)) return 1;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  return [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= bruto);
};

const GRIS_BARRA = [173, 181, 189];
export const COLOR_GRAFICA = { real: GRIS_BARRA, marca: COLOR.marca };

/*
 * Una gráfica de barras sobria, dibujada a mano con jsPDF (una librería de
 * gráficas para unas cuantas barras sería más peso que gráfica).
 *
 *   grupos   [{ etiqueta, barras: [{ valor, color, bajo?, alto? }] }]: cada
 *            grupo es un lugar del eje (una semana, un mes) con una o más
 *            barras lado a lado. Con `bajo` y `alto`, la barra lleva la
 *            línea de su rango (un pronóstico).
 *   leyenda  [{ texto, color }]
 *
 * Las líneas guía caen en montos redondos ($150, $300, $450).
 */
export const graficaDeBarras = (doc, y, { grupos, leyenda = [], altoGrafica = 46 }) => {
  y = asegurarEspacio(doc, y, altoGrafica + 16);
  const izquierda = MARGEN + 14;
  const util = ancho(doc) - MARGEN * 2 - 14;
  const todas = grupos.flatMap((g) => g.barras);
  const mayor = Math.max(...todas.map((b) => b.alto ?? b.valor), 1);
  const pasoGuia = pasoRedondo(mayor / 3);
  const lineasGuia = Math.ceil(mayor / pasoGuia);
  const maximo = pasoGuia * lineasGuia;
  const escala = (v) => (Math.max(v, 0) / maximo) * altoGrafica;
  const base = y + altoGrafica;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (let i = 0; i <= lineasGuia; i++) {
    const v = pasoGuia * i;
    const linea = base - escala(v);
    doc.setDrawColor(...COLOR.linea);
    doc.setLineWidth(i === 0 ? 0.3 : 0.1);
    doc.line(izquierda, linea, izquierda + util, linea);
    doc.setTextColor(...COLOR.suave);
    doc.text(dinero(v).replace('.00', ''), izquierda - 2, linea + 1, { align: 'right' });
  }

  const paso = util / Math.max(grupos.length, 1);
  // Las etiquetas no se enciman: con muchos lugares, se escribe una sí y otra no.
  const saltoEtiquetas = Math.max(1, Math.ceil(grupos.length / 14));
  grupos.forEach((g, i) => {
    const cuantas = g.barras.length || 1;
    const anchoBarra = Math.min((paso * 0.62) / cuantas, 14);
    const inicio = izquierda + paso * i + (paso - anchoBarra * cuantas) / 2;
    g.barras.forEach((b, j) => {
      const x = inicio + anchoBarra * j;
      const h = escala(b.valor);
      doc.setFillColor(...(b.color || COLOR.marca));
      if (h > 0) doc.rect(x, base - h, anchoBarra, h, 'F');
      if (b.alto != null && b.bajo != null) {
        // El rango probable, de lo bajo a lo alto. Gris medio: se ve sobre la barra y sobre el blanco.
        const medio = x + anchoBarra / 2;
        doc.setDrawColor(134, 142, 150);
        doc.setLineWidth(0.45);
        doc.line(medio, base - escala(b.alto), medio, base - escala(b.bajo));
        doc.line(medio - 1.5, base - escala(b.alto), medio + 1.5, base - escala(b.alto));
        doc.line(medio - 1.5, base - escala(b.bajo), medio + 1.5, base - escala(b.bajo));
      }
    });
    if (i % saltoEtiquetas === 0) {
      doc.setTextColor(...COLOR.suave);
      doc.text(g.etiqueta, izquierda + paso * i + paso / 2, base + 4, { align: 'center' });
    }
  });

  let x = izquierda;
  const renglon = base + 9.5;
  leyenda.forEach(({ texto, color }) => {
    doc.setFillColor(...color);
    doc.rect(x, renglon - 2.4, 3, 3, 'F');
    doc.setTextColor(...COLOR.tinta);
    doc.text(texto, x + 4.5, renglon);
    x += 4.5 + doc.getTextWidth(texto) + 8;
  });
  return renglon + 8;
};

// ── Cómo se escriben los números y las fechas en los reportes ──

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "12%", sin signo: el texto dice si es más o menos.
export const porciento = (x) => `${Math.round(Math.abs(x) * 100)}%`;

const MONEDA = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// $1,021.30: el dólar como se escribe en El Salvador.
export const dinero = (n) => MONEDA.format(Number(n) || 0);

// "2026-10-14" → partes, sin pasar por la zona horaria del navegador.
const partes = (dia) => {
  const [a, m, d] = String(dia).slice(0, 10).split('-').map(Number);
  return { a, m: m - 1, d };
};

// "14 de octubre de 2026"
export const fechaLarga = (dia) => {
  const { a, m, d } = partes(dia);
  return `${d} de ${MESES[m]} de ${a}`;
};

// "14 oct"
export const fechaCorta = (dia) => {
  const { m, d } = partes(dia);
  return `${d} ${MESES_CORTOS[m]}`;
};

// "del 14 de octubre al 10 de noviembre de 2026" (el año una sola vez si es el mismo)
export const rangoDeFechas = (desde, hasta) => {
  const a = partes(desde);
  const b = partes(hasta);
  const inicio = a.a === b.a ? `${a.d} de ${MESES[a.m]}` : fechaLarga(desde);
  return `del ${inicio} al ${fechaLarga(hasta)}`;
};

// La fecha de hoy en El Salvador, como "2026-10-13".
export const hoyLocal = (ahora = new Date()) =>
  ahora.toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
