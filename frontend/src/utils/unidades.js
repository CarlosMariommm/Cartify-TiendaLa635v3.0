// CÓMO SE VENDE CADA PRODUCTO — unidades.js
// Hay dos formas de vender en la tienda y hasta ahora solo existía una. Por UNIDAD → una
// Coca-Cola, un paquete de Takis. El stock son piezas y el precio es el de la pieza.

export const UNIDADES = [
  {
    clave: 'unidad',
    nombre: 'Por unidad',
    descripcion: 'Piezas sueltas: una botella, un paquete, una bolsa.',
    // Cómo se llama lo que hay en bodega y lo que se lleva el cliente.
    existencia: 'Unidades',
    corto: 'u',
    // Media botella no se vende; media libra de queso, todos los días.
    fraccionable: false,
    paso: 1,
  },
  {
    clave: 'libra',
    nombre: 'Por libra',
    descripcion: 'A granel y por peso: verduras, quesos, granos básicos.',
    existencia: 'Libras',
    corto: 'lb',
    fraccionable: true,
    // Media libra es la fracción con la que se pide de verdad en el mostrador.
    paso: 0.5,
  },
];

const POR_DEFECTO = UNIDADES[0];

// La unidad de un producto. Todo lo que no diga expresamente "libra" es por unidad: son miles de
// productos ya cargados sin este campo, y asumir lo contrario los pondría todos a venderse por
// peso de un día para otro.
export const unidadDe = (producto) =>
  UNIDADES.find((u) => u.clave === producto?.unidadVenta) || POR_DEFECTO;

export const esPorLibra = (producto) => unidadDe(producto).clave === 'libra';

// El precio, escrito como se cobra. "$1.25" y "$1.25/lb" son dos precios distintos aunque el
// número sea el mismo.
export const precioConUnidad = (producto, precio) => {
  const monto = `$${Number(precio ?? producto?.salePrice ?? 0).toFixed(2)}`;
  return esPorLibra(producto) ? `${monto}/lb` : monto;
};

// Una cantidad con su unidad: "3 u" o "3.5 lb". Los enteros salen sin el ".0" de adorno — "3.0 lb"
// hace dudar de si el sistema entendió bien.
export const cantidadConUnidad = (producto, cantidad) => {
  const n = Number(cantidad) || 0;
  const u = unidadDe(producto);
  const texto = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
  return `${texto} ${u.corto}`;
};

// Cuánto sube o baja el "+" / "−". Por libra va de media en media, que es como se pide en el
// mostrador; por unidad, de uno en uno.
export const pasoDe = (producto) => unidadDe(producto).paso;

// Redondea al paso de su unidad, para que 0.5 + 0.5 + 0.1 lb no termine en 1.1000000000000001.
// piezasEnTexto: el campo `piezas` dicho según cómo se vende el producto.
export const piezasEnTexto = (producto, t) => {
  const n = Number(producto?.piezas);
  if (!Number.isFinite(n) || n <= 0) return null;

  const clave = esPorLibra(producto)
    ? (n === 1 ? '{n} pieza' : '{n} piezas')
    : (n === 1 ? 'Trae {n} unidad' : 'Trae {n} unidades');
  return t ? t(clave, { n }) : clave.replace('{n}', n);
};

/* La etiqueta del campo en el formulario, que también cambia de sentido. */
export const etiquetaPiezas = (unidadClave) =>
  unidadClave === 'libra'
    ? { titulo: 'Piezas', ayuda: 'En cuántos bloques o bolsas están esas libras.', pista: '¿En cuántas va?' }
    : { titulo: '¿Cuántas trae?', ayuda: 'Cuántas unidades vienen dentro: un six-pack trae 6.', pista: 'Unidades por paquete' };

/* Venta restringida a mayores de edad: licores, cigarros. */
export const esSoloAdultos = (producto) => !!producto?.soloAdultos;

export const ajustarCantidad = (producto, cantidad) => {
  const paso = pasoDe(producto);
  const n = Math.max(0, Number(cantidad) || 0);
  return Math.round(n / paso) * paso;
};

// Una cantidad como se DICE, para la voz de Tiqui: "74 Manzanas", "1 Pan", "2 libras de Queso
// Fresco". En el carrito basta "74 u"; hablando, "74 Manzana" suena a error y "74 u" no se
// entiende.
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
