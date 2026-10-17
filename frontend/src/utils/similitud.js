// SIMILITUD ENTRE PRODUCTOS — similitud.js
// Decide qué tan parecidos son dos productos, sin inteligencia artificial ni nada raro: puros
// datos que la tienda ya llena en el admin.

import { clasificarPorReglas, tituloDeFamilia, esFamiliaValida } from './familias';

// Palabras que aparecen en todos lados y no dicen nada del producto.
const VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'para', 'por', 'y', 'en',
  'al', 'un', 'una', 'unos', 'unas', 'ml', 'lt', 'lts', 'kg', 'gr', 'grs', 'oz',
  'lb', 'lbs', 'pack', 'unidad', 'unidades', 'grande', 'pequeno', 'mediano',
]);

// Quita tildes y ñ para poder comparar. Se exporta porque familias.js normaliza exactamente igual:
// si cada archivo tuviera su propia versión, un día una dejaría pasar la ñ y "jabón de baño" nunca
// cazaría con "jabon de bano".
export const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// Parte el nombre en las palabras que de verdad describen el producto. "Gaseosa Cola 1.5 Lt" ->
// ['gaseosa', 'cola']
export const palabrasClave = (nombre) =>
  sinTildes(nombre)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length >= 3 && !VACIAS.has(p) && !/^\d+$/.test(p));

const id = (v) => (v && typeof v === 'object' ? v._id : v) || null;

// LA CADENA DE DECISIÓN DE LA FAMILIA
// En este orden, y con este orden hay una razón: 1. La familia YA GUARDADA en el producto — sea de
// reglas o de IA, ya se decidió una vez y no se vuelve a decidir. Es la que manda. 2.
export const familiaDeProducto = (producto, familiasExtra = {}) => {
  if (!producto) return null;

  const guardada = producto.familia;
  if (esFamiliaValida(guardada)) return guardada;

  const enCaliente = familiasExtra?.[producto.id || producto._id];
  if (esFamiliaValida(enCaliente)) return enCaliente;

  return clasificarPorReglas(producto);
};

// Puntaje de parecido entre dos productos (0 = nada que ver). Los pesos están ordenados por qué
// tan fuerte es la señal en una tienda de abarrotes: compartir el nombre y la categoría manda; el
// precio solo desempata.
export const puntajeSimilitud = (a, b) => {
  if (!a || !b || a.id === b.id) return 0;
  let puntos = 0;

  // 1. Palabras del nombre — la señal más fuerte y la que siempre está.
  const pa = palabrasClave(a.nombre || a.name);
  const pb = new Set(palabrasClave(b.nombre || b.name));
  const comunes = pa.filter((p) => pb.has(p)).length;
  if (comunes) puntos += 40 + (comunes - 1) * 15; // dos palabras iguales es mucho más que una

  // 2. Misma categoría.
  const catA = id(a.typeId) || a.categoria;
  const catB = id(b.typeId) || b.categoria;
  if (catA && catB && catA === catB) puntos += 35;

  // 2.5. Misma familia (energizantes, quesos, limpieza...). Pesa casi como la categoría porque hace
  // el mismo trabajo, pero mejor: la categoría la escribe a mano quien sube el producto y casi todo
  // quedó en "General", mientras que la familia se deduce del nombre.
  const famA = familiaDeProducto(a);
  const famB = familiaDeProducto(b);
  if (famA && famB && famA === famB) puntos += 30;

  // 3. Misma marca.
  const marcaA = id(a.brandId) || a.marca;
  const marcaB = id(b.brandId) || b.marca;
  if (marcaA && marcaB && marcaA === marcaB) puntos += 20;

  // 4. Mismo módulo (tienda / impresiones): evita mezclar peras con servicios.
  const modA = id(a.moduleId);
  const modB = id(b.moduleId);
  if (modA && modB && modA !== modB) return 0;

  // 5. Precio parecido (±30%). Desempata entre varios de la misma categoría.
  const precioA = Number(a.precio ?? a.salePrice) || 0;
  const precioB = Number(b.precio ?? b.salePrice) || 0;
  if (precioA > 0 && precioB > 0) {
    const razon = Math.min(precioA, precioB) / Math.max(precioA, precioB);
    if (razon >= 0.7) puntos += 12;
  }

  return puntos;
};

// Los N productos más parecidos a uno dado. El umbral evita el caso feo de "productos similares"
// mostrando cosas que no tienen nada que ver solo por rellenar la fila: si no hay parecidos de
// verdad, devuelve menos (o ninguno).
export const productosSimilares = (producto, catalogo, cantidad = 6, umbral = 20) =>
  (catalogo || [])
    .map((otro) => ({ otro, puntos: puntajeSimilitud(producto, otro) }))
    .filter((x) => x.puntos >= umbral)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, cantidad)
    .map((x) => x.otro);

// Agrupa el catálogo en familias para armar filas temáticas solas. Ej: [{clave:'quesos',
// titulo:'Quesos', productos:[Cheddar, Mozzarella]}]
export const agruparPorFamilia = (catalogo, minimo = 3, familiasExtra = {}) => {
  const grupos = new Map();

  (catalogo || []).forEach((p) => {
    const familia = familiaDeProducto(p, familiasExtra);
    // Sin familia, la primera palabra significativa suele ser el tipo:
    // "Queso Cheddar" -> "queso".
    const raiz = familia || palabrasClave(p.nombre || p.name)[0];
    if (!raiz) return;

    const clave = familia ? `familia:${familia}` : `raiz:${raiz}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        clave: familia || raiz,
        // "queso" -> "Queso" para el título de la sección de respaldo.
        titulo: familia ? tituloDeFamilia(familia) : raiz.charAt(0).toUpperCase() + raiz.slice(1),
        productos: [],
      });
    }
    grupos.get(clave).productos.push(p);
  });

  return [...grupos.values()]
    .filter((g) => g.productos.length >= minimo)
    .sort((a, b) => b.productos.length - a.productos.length);
};
