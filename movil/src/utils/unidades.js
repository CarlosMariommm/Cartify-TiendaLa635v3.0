/*
 * ============================================================
 * CÓMO SE VENDE CADA PRODUCTO — unidades.js
 * ============================================================
 * Copia de `frontend/src/utils/unidades.js`, recortada a lo que la app usa.
 *
 * Hay dos formas de vender en la tienda:
 *
 *   Por UNIDAD  → una Coca-Cola, un paquete de Takis. El stock son piezas y
 *                 el precio es el de la pieza.
 *   Por LIBRA   → tomates, queso fresco, frijol a granel. El stock son libras
 *                 —y puede ser 3.5— y el precio es el de UNA libra.
 *
 * Esto no es un detalle de forma. "$1.25" a secas en un tomate se lee como el
 * precio del tomate, no el de la libra: es cobrar una cosa y aparentar otra.
 * Por eso las reglas viven en un solo archivo, igual que en la web — la regla
 * que se repite en seis lugares es la que en el séptimo sale distinta.
 *
 * Lo que NO se trajo: `etiquetaPiezas`, que es para el formulario del panel.
 * ============================================================
 */

import { tAhora } from './idioma';

export const UNIDADES = [
  {
    clave: 'unidad',
    // Cómo se vende, dicho para el cliente ("Se vende: Por unidad"), igual que la web.
    nombre: 'Por unidad',
    existencia: 'Unidades',
    corto: 'u',
    // Media botella no se vende; media libra de queso, todos los días.
    fraccionable: false,
    paso: 1,
  },
  {
    clave: 'libra',
    nombre: 'Por libra',
    existencia: 'Libras',
    corto: 'lb',
    fraccionable: true,
    // Media libra es la fracción con la que se pide de verdad en el mostrador.
    paso: 0.5,
  },
];

const POR_DEFECTO = UNIDADES[0];

/*
 * Todo lo que no diga expresamente "libra" es por unidad: hay miles de
 * productos ya cargados sin este campo, y asumir lo contrario los pondría
 * todos a venderse por peso de un día para otro.
 */
export const unidadDe = (producto) =>
  UNIDADES.find((u) => u.clave === producto?.unidadVenta) || POR_DEFECTO;

export const esPorLibra = (producto) => unidadDe(producto).clave === 'libra';

/* Venta restringida a mayores de edad: licores, cigarros. */
export const esSoloAdultos = (producto) => !!producto?.soloAdultos;

/*
 * Una cantidad con su unidad: "3 u" o "3.5 lb". Los enteros salen sin el ".0"
 * de adorno — "3.0 lb" hace dudar de si el sistema entendió bien.
 */
export const cantidadConUnidad = (producto, cantidad) => {
  const n = Number(cantidad) || 0;
  const u = unidadDe(producto);
  const texto = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
  return `${texto} ${u.corto}`;
};

/*
 * Cuánto sube o baja el "+" / "−". Por libra va de media en media, que es como
 * se pide en el mostrador; por unidad, de uno en uno.
 */
export const pasoDe = (producto) => unidadDe(producto).paso;

/*
 * Redondea al paso de su unidad. Sin esto, un carrito con 0.5 lb más 0.5 lb
 * más 0.1 termina en 1.1000000000000001 por la aritmética de coma flotante, y
 * eso llega hasta el recibo.
 */
export const ajustarCantidad = (producto, cantidad) => {
  const paso = pasoDe(producto);
  const n = Math.max(0, Number(cantidad) || 0);
  return Math.round(n / paso) * paso;
};

/*
 * El campo `piezas` dice DOS cosas parecidas pero distintas, según cómo se
 * venda el producto:
 *
 *   Por libra  → en cuántos bultos está la existencia.
 *   Por unidad → cuántas trae CADA producto. Un six-pack trae 6. Al cliente le
 *                sirve para comparar: $3.00 no dice lo mismo si son 6 latas
 *                que si es una.
 *
 * Devuelve null cuando no se declaró — es opcional a propósito, y "0 piezas"
 * diría algo falso.
 */
export const piezasEnTexto = (producto, t = tAhora) => {
  const n = Number(producto?.piezas);
  if (!Number.isFinite(n) || n <= 0) return null;

  return esPorLibra(producto)
    ? t(n === 1 ? '{n} pieza' : '{n} piezas', { n })
    : t(n === 1 ? 'Trae {n} unidad' : 'Trae {n} unidades', { n });
};

/*
 * Una cantidad como se DICE, para la voz de Tiqui: "74 Manzanas", "1 Pan",
 * "2 libras de Queso Fresco". En el carrito basta "74 u"; hablando, "74
 * Manzana" suena a error y "74 u" no se entiende.
 *
 * El plural es sencillo a propósito: se pluraliza el nombre si es de una sola
 * palabra ("Manzana" → "Manzanas", "Limón" → "Limones") o si la primera va
 * seguida de "de", "con", "sin" o "en" ("Jugo de Naranja" → "Jugos de
 * Naranja"). Un nombre como "Coca Cola 600ml" o una marca ("7UP") se deja
 * como está: mal pluralizado se oye peor que en singular.
 */
const pluralDePalabra = (w) => {
  if (/\d/.test(w) || (w.length > 1 && w === w.toUpperCase())) return w;
  if (/[sx]$/i.test(w)) return w;
  if (/[aeiouáéíóú]$/i.test(w)) return `${w}s`;
  if (/z$/i.test(w)) return `${w.slice(0, -1)}ces`;
  // "Limón" → "Limones": la tilde se va al sumarle una sílaba.
  return `${w.replace(/[áéíóú](?=[nsr]$)/i, (v) => v.normalize('NFD')[0])}es`;
};

const pluralDeNombre = (nombre) => {
  const palabras = String(nombre || '').trim().split(/\s+/);
  if (palabras.length === 1) return pluralDePalabra(palabras[0]);
  if (/^(de|del|con|sin|en)$/i.test(palabras[1])) {
    return [pluralDePalabra(palabras[0]), ...palabras.slice(1)].join(' ');
  }
  return nombre;
};

export const cantidadParaDecir = (producto, cantidad) => {
  const n = Number(cantidad) || 0;
  const numero = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  if (esPorLibra(producto)) return `${numero} ${n === 1 ? 'libra' : 'libras'} de ${producto?.nombre}`;
  return `${numero} ${n === 1 ? producto?.nombre : pluralDeNombre(producto?.nombre)}`;
};
