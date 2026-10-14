/*
 * ============================================================
 * EL INVENTARIO DESDE UN EXCEL — importarProductos.js
 * ============================================================
 * El encargado sube su Excel en Inventario y la web lee las filas (ver
 * frontend/src/utils/importarExcel.js). Aquí, por tandas de 20:
 *
 *   1. columnasConIA   si la web no reconoció qué columna es cuál (nombre,
 *                      precio…), la IA lo decide viendo los encabezados y
 *                      unas filas de ejemplo.
 *   2. analizarLote    la IA completa lo que el Excel no trae: el nombre como
 *                      se ve en la tienda, la marca, el pasillo y la categoría
 *                      (las que ya existen, si alguna encaja), si se vende por
 *                      libra, si es +18 y una descripción corta. Se busca la
 *                      foto (fotosDeProductos.js) y se marca lo que ya existe.
 *                      No guarda nada: es la vista previa.
 *   3. importarLote    lo que el encargado aprobó: crea los pasillos,
 *                      categorías, marcas y proveedores que falten, sube la
 *                      foto a Cloudinary y crea el producto.
 *
 * Lo que trae el Excel manda sobre lo que diga la IA: si dice la categoría o
 * la marca, esas quedan. Sin IA (sin llave o sin respuesta) se importa igual,
 * con lo que traiga el Excel y "General" donde falte, y se avisa.
 *
 * Al importar NO se avisa a los clientes de "productos nuevos": cargar el
 * inventario de golpe no es una novedad que contar.
 * ============================================================
 */

import { Type } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";
import "./cloudinaryConfig.js";
import productModel from "../models/product.js";
import productTypeModel from "../models/productType.js";
import brandModel from "../models/brand.js";
import moduleModel from "../models/module.js";
import supplierModel from "../models/supplier.js";
import { getIA, generarConIA } from "./iaClient.js";
import { buscarFoto, enParalelo, sinTildes } from "./fotosDeProductos.js";

export const POR_TANDA = 20;
export const CAMPOS = ["nombre", "precio", "costo", "existencia", "codigo", "categoria", "pasillo", "marca", "proveedor", "unidad", "descripcion", "vence"];
const GENERAL = "General";

// Para comparar nombres: "Coca-Cola" y "coca cola" son la misma marca.
export const normalizar = (t) => sinTildes(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const texto = (v, largo = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, largo);
const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

// Lo que no hace falta preguntarle a nadie: alcohol y tabaco son +18.
// Palabras enteras: "gin" no tiene que marcar el ginger ale, ni "ron" otra cosa.
const ADULTOS = /\b(cervezas?|pilsener|ron|vodka|whiske?y|tequila|vinos?|licor(es)?|aguardiente|brandy|ginebra|gin|cigarr\w*|tabaco|vape\w*|seltzer|micheladas?)\b/i;
export const pareceDeAdultos = (nombre) => ADULTOS.test(sinTildes(nombre));
export const pareceDeLibra = (unidad) => /^(lb|lbs|libra|libras)$/i.test(texto(unidad).replace(/\./g, ""));

/*
 * Una fila tal como llega de la web, limpia: textos recortados, números que
 * sean números (o null) y el código solo con lo que puede tener un código.
 */
export const limpiarFila = (f) => ({
  fila: Number.isInteger(f?.fila) ? f.fila : null,
  nombre: texto(f?.nombre, 100),
  precio: numero(f?.precio),
  costo: numero(f?.costo),
  existencia: numero(f?.existencia),
  codigo: texto(f?.codigo, 40).replace(/[^\w-]/g, ""),
  categoria: texto(f?.categoria, 40),
  pasillo: texto(f?.pasillo, 40),
  marca: texto(f?.marca, 40),
  proveedor: texto(f?.proveedor, 60),
  unidad: texto(f?.unidad, 20),
  descripcion: texto(f?.descripcion, 300),
  vence: f?.vence && !Number.isNaN(new Date(f.vence).getTime()) ? new Date(f.vence).toISOString().slice(0, 10) : null,
});

/* ══════════ 1. Qué columna es cuál, con IA ══════════ */

const ESQUEMA_COLUMNAS = {
  type: Type.OBJECT,
  properties: Object.fromEntries(CAMPOS.map((c) => [c, { type: Type.INTEGER, description: `Índice (desde 0) de la columna de ${c}; -1 si no hay` }])),
  required: CAMPOS,
};

export const columnasConIA = async (encabezados, ejemplos) => {
  if (!getIA()) return null;
  const columnas = encabezados.map((e, i) => `${i}: ${texto(e, 60) || "(sin título)"}`).join("\n");
  const filas = ejemplos.slice(0, 5).map((f) => f.map((v) => texto(v, 40)).join(" | ")).join("\n");
  const respuesta = await generarConIA({
    contents: `Columnas del Excel:\n${columnas}\n\nFilas de ejemplo:\n${filas}`,
    config: {
      systemInstruction: "Te pasan las columnas de un Excel con el inventario de una tienda de abarrotes de El Salvador. Di qué columna tiene cada dato: nombre del producto, precio de venta, costo (precio de compra), existencia (cantidad en bodega), código de barras, categoría, pasillo o sección, marca, proveedor, unidad de medida, descripción y fecha de vencimiento. Usa -1 si no está. Una columna no se usa para dos datos.",
      responseMimeType: "application/json",
      responseSchema: ESQUEMA_COLUMNAS,
      temperature: 0,
    },
  }, { intentos: 2 });
  const datos = JSON.parse(respuesta.text || "{}");
  const usadas = new Set();
  const mapa = {};
  CAMPOS.forEach((campo) => {
    const i = datos[campo];
    if (Number.isInteger(i) && i >= 0 && i < encabezados.length && !usadas.has(i)) {
      mapa[campo] = i;
      usadas.add(i);
    }
  });
  return mapa;
};

/* ══════════ 2. Completar lo que falta, con IA ══════════ */

const ESQUEMA_PRODUCTOS = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      i: { type: Type.INTEGER, description: "El número del producto, tal cual venía" },
      nombre: { type: Type.STRING },
      marca: { type: Type.STRING },
      pasillo: { type: Type.STRING },
      categoria: { type: Type.STRING },
      unidadVenta: { type: Type.STRING, enum: ["unidad", "libra"] },
      soloAdultos: { type: Type.BOOLEAN },
      empacado: { type: Type.BOOLEAN },
      descripcion: { type: Type.STRING },
    },
    required: ["i", "nombre", "marca", "pasillo", "categoria", "unidadVenta", "soloAdultos", "empacado", "descripcion"],
  },
};

const INSTRUCCIONES = [
  "Eres quien carga el inventario de una tienda de abarrotes de barrio en El Salvador. Te pasan productos leídos de un Excel y completas lo que falta.",
  "Para cada producto:",
  "- nombre: como se vería en la tienda. Mayúscula inicial, sin códigos ni precios. Conserva marca, sabor y tamaño (\"Coca-Cola 600 ml\").",
  "- marca: la del fabricante del producto si se sabe (Coca-Cola, Diana); vacío si es genérico (fruta, pan, verdura).",
  "- pasillo: uno de los pasillos que ya existen si alguno encaja; si no, uno nuevo corto y general (\"Bebidas\", \"Snacks\").",
  "- categoria: solo el nombre de la categoría, corto (\"Gaseosas\"), sin el pasillo; usa una de las que ya existen si encaja.",
  "- unidadVenta: \"libra\" solo si se vende por peso (queso al detalle, carne, fruta o verdura suelta); si no, \"unidad\".",
  "- soloAdultos: true solo para bebidas alcohólicas, cigarrillos o vapeadores.",
  "- empacado: true si es un producto empacado de fábrica, con su marca y su empaque; false si se vende suelto (fruta, verdura, pan de la panadería, queso o carne al detalle).",
  "- descripcion: una frase corta y natural que describa el producto, sin precio y sin hablarle a nadie.",
  "Si el Excel ya trae marca, pasillo o categoría, respétalos. No inventes tamaños ni sabores que no estén.",
].join("\n");

// Sin IA: lo que traiga el Excel, y "General" donde falte.
const sinIA = (f) => ({
  nombre: f.nombre,
  marca: f.marca,
  pasillo: f.pasillo || GENERAL,
  categoria: f.categoria || GENERAL,
  unidadVenta: pareceDeLibra(f.unidad) ? "libra" : "unidad",
  soloAdultos: pareceDeAdultos(f.nombre),
  // Sin IA no se sabe: con marca, se supone empacado.
  empacado: Boolean(f.marca || f.codigo),
  descripcion: f.descripcion || f.nombre,
});

const completarConIA = async (filas, catalogo) => {
  const existentes = [
    `Pasillos que ya existen: ${catalogo.pasillos.join(", ") || "(ninguno)"}`,
    `Categorías que ya existen: ${catalogo.categorias.join(", ") || "(ninguna)"}`,
  ].join("\n");
  const lista = filas.map((f, i) => [
    `${i} | ${f.nombre}`,
    f.marca && `marca: ${f.marca}`,
    f.categoria && `categoría: ${f.categoria}`,
    f.pasillo && `pasillo: ${f.pasillo}`,
    f.unidad && `unidad: ${f.unidad}`,
    f.descripcion && `detalle: ${f.descripcion.slice(0, 80)}`,
  ].filter(Boolean).join(" | ")).join("\n");

  const respuesta = await generarConIA({
    contents: `${existentes}\n\nProductos:\n${lista}`,
    config: { systemInstruction: INSTRUCCIONES, responseMimeType: "application/json", responseSchema: ESQUEMA_PRODUCTOS, temperature: 0.2 },
  }, { intentos: 2 });
  const datos = JSON.parse(respuesta.text || "[]");
  if (!Array.isArray(datos)) throw new Error("La IA no devolvió una lista");
  const porIndice = new Map();
  datos.forEach((d) => {
    if (Number.isInteger(d?.i) && d.i >= 0 && d.i < filas.length && !porIndice.has(d.i)) porIndice.set(d.i, d);
  });
  return filas.map((f, i) => {
    const d = porIndice.get(i);
    if (!d) return null;
    return {
      nombre: texto(d.nombre, 100) || f.nombre,
      // Lo que trae el Excel manda.
      marca: f.marca || texto(d.marca, 40),
      pasillo: f.pasillo || texto(d.pasillo, 40) || GENERAL,
      // Por si contesta "Bebidas › Gaseosas": solo lo último.
      categoria: f.categoria || texto(String(d.categoria ?? "").split(/[›>]/).pop(), 40) || GENERAL,
      unidadVenta: f.unidad ? (pareceDeLibra(f.unidad) ? "libra" : "unidad") : (d.unidadVenta === "libra" ? "libra" : "unidad"),
      // +18 si la IA lo dice o si salta a la vista: más vale preguntar la edad de más.
      soloAdultos: d.soloAdultos === true || pareceDeAdultos(f.nombre),
      // Con código de barras, empacado seguro.
      empacado: d.empacado === true || Boolean(f.codigo),
      descripcion: f.descripcion || texto(d.descripcion, 300) || f.nombre,
    };
  });
};

/*
 * Los pasillos y categorías que ya existen, para que la IA los reuse (y no
 * invente "Bebida" junto a "Bebidas"). Las marcas NO se le pasan: con la lista
 * a la vista le ponía a la Coca-Cola la marca de otro producto. Se le pide la
 * del fabricante y al guardar se junta con la que ya exista (ver normalizar).
 */
const leerCatalogo = async () => {
  const [pasillos, categorias] = await Promise.all([
    moduleModel.find({ isActive: { $ne: false } }).select("name").lean(),
    productTypeModel.find({ isActive: { $ne: false } }).select("type moduleId").lean(),
  ]);
  const nombreDePasillo = new Map(pasillos.map((m) => [String(m._id), m.name]));
  return {
    pasillos: pasillos.map((m) => m.name).filter(Boolean).slice(0, 60),
    categorias: categorias.map((c) => `${c.type} (pasillo ${nombreDePasillo.get(String(c.moduleId)) || "?"})`).slice(0, 120),
  };
};

// Lo que ya está en la tienda: por código de barras o por el mismo nombre.
const leerExistentes = async () => {
  const productos = await productModel.find({}).select("name barCode").lean();
  return {
    porCodigo: new Map(productos.filter((p) => p.barCode).map((p) => [String(p.barCode).trim(), p])),
    porNombre: new Map(productos.map((p) => [normalizar(p.name), p])),
  };
};

const yaExiste = (existentes, f, nombre) => {
  const p = (f.codigo && existentes.porCodigo.get(f.codigo)) || existentes.porNombre.get(normalizar(nombre)) || existentes.porNombre.get(normalizar(f.nombre));
  return p ? { id: String(p._id), nombre: p.name } : null;
};

/*
 * La vista previa de una tanda: cada fila completada, con su foto propuesta,
 * si ya existe y qué le falta. `ia` dice si contestó la IA.
 */
export const analizarLote = async (entrada) => {
  const filas = entrada.slice(0, POR_TANDA).map(limpiarFila);
  const [catalogo, existentes] = await Promise.all([leerCatalogo(), leerExistentes()]);

  let completadas = null;
  if (getIA()) {
    try {
      completadas = await completarConIA(filas, catalogo);
    } catch (error) {
      console.log(`importar: la IA no completó la tanda — ${String(error?.message || error).slice(0, 80)}`);
    }
  }

  const listas = filas.map((f, i) => ({ ...f, ...(completadas?.[i] || sinIA(f)), ia: Boolean(completadas?.[i]) }));
  const fotos = await enParalelo(listas, 5, (f) => (f.nombre ? buscarFoto(f) : null));

  return {
    ia: Boolean(completadas),
    filas: listas.map((f, i) => {
      const avisos = [];
      if (!f.nombre) avisos.push("Sin nombre");
      if (!(f.precio > 0)) avisos.push("Sin precio de venta");
      return { ...f, foto: fotos[i] || null, duplicado: f.nombre ? yaExiste(existentes, f, f.nombre) : null, avisos };
    }),
  };
};

/* ══════════ 3. Guardar lo aprobado ══════════ */

/*
 * Busca por nombre (sin importar mayúsculas ni tildes) o lo crea. `cache`
 * vive lo que dura la tanda y guarda la PROMESA, no el resultado: las filas
 * se guardan de a cuatro a la vez, y con el resultado dos filas de un pasillo
 * nuevo lo buscarían al mismo tiempo, no lo encontrarían y crearían dos.
 */
const buscarOCrear = (cache, clave, buscar, crear) => {
  if (!cache.has(clave)) cache.set(clave, buscar().then((encontrado) => encontrado || crear()));
  return cache.get(clave);
};

const porNombreExacto = (modelo, campo, nombre, extra = {}) => async () => {
  const candidatos = await modelo.find({ ...extra }).select(`${campo}`).lean();
  return candidatos.find((c) => normalizar(c[campo]) === normalizar(nombre)) || null;
};

const subirFoto = async (foto) => {
  if (!foto?.url || !/^https:\/\//.test(foto.url)) return null;
  try {
    const subida = await cloudinary.uploader.upload(foto.url, { folder: "grupo1B", timeout: 20000 });
    return { image: [subida.secure_url], public_id: subida.public_id, fotoFuente: foto.fuente || undefined };
  } catch (error) {
    console.log(`importar: no se pudo subir la foto — ${String(error?.message || error).slice(0, 80)}`);
    return null;
  }
};

export const importarLote = async (entrada) => {
  const filas = entrada.slice(0, POR_TANDA);
  const existentes = await leerExistentes();
  const caches = { pasillo: new Map(), categoria: new Map(), marca: new Map(), proveedor: new Map() };

  return enParalelo(filas, 4, async (crudo) => {
    const f = { ...limpiarFila(crudo), foto: crudo?.foto };
    const base = { fila: f.fila, nombre: f.nombre };
    if (!f.nombre) return { ...base, estado: "error", motivo: "Sin nombre" };
    if (!(f.precio > 0)) return { ...base, estado: "error", motivo: "Sin precio de venta" };
    const repetido = yaExiste(existentes, f, f.nombre);
    if (repetido) return { ...base, estado: "omitido", motivo: `Ya existe: ${repetido.nombre}` };
    // Que dos filas iguales de la misma tanda no entren dos veces.
    existentes.porNombre.set(normalizar(f.nombre), { _id: "en-curso", name: f.nombre });
    if (f.codigo) existentes.porCodigo.set(f.codigo, { _id: "en-curso", name: f.nombre });

    try {
      const nombrePasillo = texto(crudo?.pasillo, 40) || GENERAL;
      const pasillo = await buscarOCrear(caches.pasillo, normalizar(nombrePasillo),
        porNombreExacto(moduleModel, "name", nombrePasillo),
        () => moduleModel.create({ name: nombrePasillo, description: "", isActive: true }));
      const nombreCategoria = texto(crudo?.categoria, 40) || GENERAL;
      const categoria = await buscarOCrear(caches.categoria, `${pasillo._id}|${normalizar(nombreCategoria)}`,
        porNombreExacto(productTypeModel, "type", nombreCategoria, { moduleId: pasillo._id }),
        () => productTypeModel.create({ type: nombreCategoria, moduleId: pasillo._id }));
      const marca = f.marca
        ? await buscarOCrear(caches.marca, normalizar(f.marca), porNombreExacto(brandModel, "name", f.marca), () => brandModel.create({ name: f.marca }))
        : null;
      const proveedor = f.proveedor
        ? await buscarOCrear(caches.proveedor, normalizar(f.proveedor), porNombreExacto(supplierModel, "name", f.proveedor), () => supplierModel.create({ name: f.proveedor, isActive: true }))
        : null;

      const foto = await subirFoto(f.foto);
      const existencia = f.existencia ?? 0;
      const producto = await productModel.create({
        name: f.nombre,
        ...(foto || {}),
        typeId: categoria._id,
        moduleId: pasillo._id,
        ...(marca ? { brandId: marca._id } : {}),
        ...(proveedor ? { supplierId: proveedor._id } : {}),
        salePrice: f.precio,
        ...(f.costo != null ? { priceCost: f.costo } : {}),
        description: texto(crudo?.descripcion, 300) || f.nombre,
        ...(f.codigo ? { barCode: f.codigo } : {}),
        stock: existencia,
        maxQuantity: existencia,
        unidadVenta: crudo?.unidadVenta === "libra" ? "libra" : "unidad",
        soloAdultos: crudo?.soloAdultos === true || pareceDeAdultos(f.nombre),
        ...(f.vence ? { expirationDate: new Date(`${f.vence}T12:00:00-06:00`) } : {}),
        isActive: true,
        importadoDe: "excel",
      });
      return { ...base, estado: "creado", id: String(producto._id), conFoto: Boolean(foto) };
    } catch (error) {
      console.log(`importar: no se pudo crear "${f.nombre}" — ${String(error?.message || error).slice(0, 80)}`);
      return { ...base, estado: "error", motivo: "No se pudo guardar" };
    }
  });
};
