// LEER EL EXCEL DEL INVENTARIO — importarExcel.js
// Lee el .xlsx o .csv en el navegador, encuentra la fila de títulos, reconoce qué columna es cuál
// y convierte cada fila en un producto.

export const MAXIMO_DE_FILAS = 500;

// Los datos que se buscan en el Excel, con cómo se le dicen al encargado.
export const CAMPOS = [
  { campo: 'nombre', texto: 'Nombre del producto', obligatorio: true },
  { campo: 'precio', texto: 'Precio de venta', obligatorio: true },
  { campo: 'costo', texto: 'Costo' },
  { campo: 'existencia', texto: 'Existencia' },
  { campo: 'codigo', texto: 'Código de barras' },
  { campo: 'categoria', texto: 'Categoría' },
  { campo: 'pasillo', texto: 'Pasillo' },
  { campo: 'marca', texto: 'Marca' },
  { campo: 'proveedor', texto: 'Proveedor' },
  { campo: 'unidad', texto: 'Unidad (unidad o libra)' },
  { campo: 'descripcion', texto: 'Descripción' },
  { campo: 'vence', texto: 'Vencimiento' },
];

export const normalizar = (t) => String(t ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Cómo suele llamarse cada columna. El ORDEN importa: "Precio de compra" tiene "precio", pero es
// el costo; "Descripción del producto" tiene "producto", pero si hay otra columna "Producto", esa
// es el nombre.
const TITULOS = [
  ['costo', /\b(costo|costos|compra|cost)\b/],
  ['precio', /\b(precio|pvp|venta|valor|price)\b/],
  ['existencia', /\b(existencias?|stock|cantidad|cant|inventario|disponibles?|qty)\b/],
  ['codigo', /\b(codigo|cod|barras?|ean|upc|sku)\b/],
  ['vence', /\b(vence|vencimiento|caducidad|expira|expiracion)\b/],
  ['proveedor', /\b(proveedor|proveedores|distribuidor|supplier)\b/],
  ['marca', /\b(marca|fabricante|brand)\b/],
  ['pasillo', /\b(pasillo|seccion|modulo|area|departamento)\b/],
  ['categoria', /\b(categoria|categorias|tipo|familia|rubro|linea|clase|category)\b/],
  ['unidad', /\b(unidad|medida|u ?\/? ?m|um|unit)\b/],
  ['descripcion', /\b(descripcion|detalle|notas?|observaciones)\b/],
  ['nombre', /\b(nombre|producto|productos|articulo|articulos|item|name)\b/],
];

export const mapearColumnas = (encabezados) => {
  const mapa = {};
  (encabezados || []).forEach((titulo, i) => {
    const t = normalizar(titulo);
    if (!t) return;
    const encontrado = TITULOS.find(([campo, patron]) => mapa[campo] === undefined && patron.test(t));
    if (encontrado) mapa[encontrado[0]] = i;
  });
  // Sin columna de nombre, la descripción hace de nombre ("Descripción del producto").
  if (mapa.nombre === undefined && mapa.descripcion !== undefined) {
    mapa.nombre = mapa.descripcion;
    delete mapa.descripcion;
  }
  return mapa;
};

export const faltaLoEsencial = (mapa) => mapa.nombre === undefined || mapa.precio === undefined;

const vacia = (fila) => !fila || fila.every((v) => v === null || v === undefined || String(v).trim() === '');

// La fila de títulos: la primera (de las 10 de arriba) donde se reconoce el nombre o el precio. Si
// ninguna, la primera con al menos dos textos.
export const buscarEncabezado = (filas) => {
  const arriba = filas.slice(0, 10);
  const conTitulos = arriba.findIndex((f) => {
    const mapa = mapearColumnas(f);
    return mapa.nombre !== undefined || mapa.precio !== undefined;
  });
  if (conTitulos >= 0) return conTitulos;
  const conTextos = arriba.findIndex((f) => (f || []).filter((v) => typeof v === 'string' && v.trim()).length >= 2);
  return Math.max(conTextos, 0);
};

// "$1.25" → 1.25 · "1,250.50" → 1250.5 · "1,25" → 1.25 · "Q 3" → 3. Con punto y coma a la vez, el
// que va último es el decimal.
export const leerNumero = (valor) => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  let t = String(valor ?? '').replace(/[^\d.,-]/g, '');
  if (!t || !/\d/.test(t)) return null;
  const punto = t.lastIndexOf('.');
  const coma = t.lastIndexOf(',');
  if (punto >= 0 && coma >= 0) {
    t = punto > coma ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
  } else if (coma >= 0) {
    // "1,25" es decimal; "1,250" son miles.
    t = /,\d{1,2}$/.test(t) && (t.match(/,/g) || []).length === 1 ? t.replace(',', '.') : t.replace(/,/g, '');
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const leerFecha = (valor) => {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString().slice(0, 10);
  const t = String(valor ?? '').trim();
  const dma = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // 31/12/2026, como se escribe aquí
  if (dma) return `${dma[3]}-${dma[2].padStart(2, '0')}-${dma[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
};

const textoDe = (valor) => (valor === null || valor === undefined ? '' : String(valor).trim());

// Las filas debajo del encabezado, como productos. `fila` es el número de fila en el Excel (para avisar "fila 12").
export const aProductos = (filas, inicio, mapa) => filas
  .map((f, i) => ({ f, fila: inicio + i + 1 }))
  .filter(({ f }) => !vacia(f))
  .map(({ f, fila }) => {
    const celda = (campo) => (mapa[campo] === undefined ? null : f[mapa[campo]]);
    // Los códigos de barras largos llegan como número (7.41e12): se escriben enteros.
    const codigo = celda('codigo');
    return {
      fila,
      nombre: textoDe(celda('nombre')),
      precio: leerNumero(celda('precio')),
      costo: leerNumero(celda('costo')),
      existencia: leerNumero(celda('existencia')),
      codigo: typeof codigo === 'number' ? codigo.toFixed(0) : textoDe(codigo),
      categoria: textoDe(celda('categoria')),
      pasillo: textoDe(celda('pasillo')),
      marca: textoDe(celda('marca')),
      proveedor: textoDe(celda('proveedor')),
      unidad: textoDe(celda('unidad')),
      descripcion: textoDe(celda('descripcion')),
      vence: leerFecha(celda('vence')),
    };
  })
  .filter((p) => p.nombre);

/* ══════════ Leer el archivo ══════════ */

// Una línea de CSV, con sus comillas ("Galletas, 12 u").
const partirLinea = (linea, separador) => {
  const celdas = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') { actual += '"'; i++; } else entreComillas = !entreComillas;
    } else if (c === separador && !entreComillas) {
      celdas.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  celdas.push(actual);
  return celdas.map((v) => v.trim());
};

export const leerCsv = (texto) => {
  const lineas = String(texto).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  // Excel en español guarda con punto y coma; el resto, con coma.
  const primera = lineas[0] || '';
  const separador = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  return lineas.map((l) => partirLinea(l, separador));
};

export const leerArchivo = async (archivo) => {
  const nombre = String(archivo?.name || '').toLowerCase();
  if (nombre.endsWith('.csv')) return leerCsv(await archivo.text());
  if (nombre.endsWith('.xls')) throw new Error('Ese es el formato viejo de Excel (.xls). Ábralo en Excel y guárdelo como .xlsx.');
  if (!nombre.endsWith('.xlsx')) throw new Error('Suba un archivo de Excel (.xlsx) o .csv.');
  // Se carga solo cuando hace falta: la mayoría de las veces nadie importa nada.
  const { readSheet } = await import('read-excel-file/browser');
  return readSheet(archivo);
};

// La plantilla para quien no tiene un Excel armado (o quiere ver cómo va).
export const PLANTILLA_CSV = [
  'Nombre;Precio de venta;Costo;Existencia;Código de barras;Categoría;Marca;Proveedor;Unidad;Vencimiento',
  'Coca-Cola 600 ml;1.00;0.65;24;7411001800231;Gaseosas;Coca-Cola;Distribuidora;unidad;',
  'Queso duro;3.50;2.40;10;;Quesos;;Lácteos del Valle;libra;31/12/2026',
].join('\r\n');
