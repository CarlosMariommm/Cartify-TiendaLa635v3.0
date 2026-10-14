/*
 * ============================================================
 * FOTOS DE PRODUCTOS DE VERDAD — fotosDeProductos.js
 * ============================================================
 * Al importar el inventario desde Excel, cada producto busca su foto en Open
 * Food Facts: una base abierta y gratis de productos empacados, con la foto
 * del empaque que sube la gente (licencia CC BY-SA: hay que decir de dónde
 * salió, por eso el producto guarda `fotoFuente` y la ficha lo menciona).
 *
 *   Por código de barras  exacto: el código identifica el empaque. Es lo
 *                         que mejor funciona (la Coca-Cola de aquí aparece).
 *   Por nombre            solo si es un producto EMPACADO (lo dice la IA:
 *                         la fruta suelta, el pan o el queso al detalle no
 *                         tienen empaque que buscar; "Plátano maduro" traía
 *                         unos plátanos fritos de bolsa) y si el nombre (y
 *                         la marca, si hay) coinciden casi palabra por
 *                         palabra. Queda marcada para revisar. Medido:
 *                         buscar "Pilsener" a secas trae una de Sudáfrica,
 *                         así que se exige mucho.
 *
 * No se inventa nada: sin una foto que de verdad sea del producto, queda sin
 * foto y el encargado la sube. Nada de imágenes generadas que parezcan el
 * empaque y no lo sean.
 *
 * Open Food Facts pide identificarse con un User-Agent propio y no golpear
 * su búsqueda: cada pedido tiene su tope de tiempo, y un error o un "más
 * despacio" (429) es simplemente "sin foto".
 * ============================================================
 */

const PRODUCTO = "https://world.openfoodfacts.org/api/v2/product/";
const BUSCAR = "https://search.openfoodfacts.org/search";
const CAMPOS = "code,product_name,brands,image_front_url";
const AGENTE = "CartifyTiendaLa635/1.0 (+https://cartify-tienda-la635.vercel.app)";
export const FUENTE_OFF = "Open Food Facts";
const TOPE_MS = 6000;

// Palabras que no dicen qué producto es.
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "con", "sin", "y", "en", "al", "para", "por", "sabor", "original", "originales"]);

export const sinTildes = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");

// "Coca-Cola 600 ml" → ["coca", "cola", "600"]
export const palabras = (texto) => sinTildes(texto)
  .toLowerCase()
  .replace(/(\d+)\s*(ml|g|gr|lt|l|oz|kg)\b/g, "$1")
  .split(/[^a-z0-9]+/)
  .filter((p) => p && !VACIAS.has(p) && !(p.length < 2 && !/\d/.test(p)));

/*
 * Qué tanto del nombre buscado aparece en lo encontrado (0 a 1). Se mide
 * desde lo que se busca: "Lays Barbacoa" contra "Lay's Barbacoa 150 g"
 * coincide entero aunque lo encontrado diga más.
 */
export const parecido = (buscado, encontrado) => {
  const a = palabras(buscado);
  if (!a.length) return 0;
  const b = new Set(palabras(encontrado).flatMap((p) => [p, p.replace(/s$/, "")]));
  return a.filter((p) => b.has(p) || b.has(p.replace(/s$/, ""))).length / a.length;
};

// La foto grande del empaque (la de 400 px se queda corta en la ficha).
export const fotoGrande = (url) => String(url || "").replace(/\.(\d+)\.jpg$/, ".full.jpg");

const pedir = async (url) => {
  const respuesta = await fetch(url, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(TOPE_MS) });
  if (!respuesta.ok) return null;
  return respuesta.json();
};

export const porCodigo = async (codigo) => {
  if (!/^\d{8,14}$/.test(String(codigo || ""))) return null;
  try {
    const datos = await pedir(`${PRODUCTO}${codigo}.json?fields=${CAMPOS}`);
    const url = datos?.status === 1 ? datos.product?.image_front_url : null;
    return url ? { url: fotoGrande(url), fuente: FUENTE_OFF, por: "codigo" } : null;
  } catch {
    return null;
  }
};

export const porNombre = async (nombre, marca = "") => {
  const buscado = `${nombre} ${marca}`.trim();
  if (palabras(buscado).length < 2) return null; // "Pan" a secas no identifica nada
  try {
    const consulta = new URLSearchParams({ q: buscado, page_size: "5", fields: CAMPOS });
    const datos = await pedir(`${BUSCAR}?${consulta}`);
    const candidatos = (datos?.hits || [])
      .filter((h) => h.image_front_url)
      .map((h) => {
        const encontrado = `${h.product_name || ""} ${(Array.isArray(h.brands) ? h.brands : [h.brands]).join(" ")}`;
        return {
          url: h.image_front_url,
          nombre: parecido(nombre, encontrado),
          // Con marca en el Excel, la marca tiene que estar; sin ella no se arriesga.
          marca: marca ? parecido(marca, encontrado) : 1,
        };
      })
      .filter((c) => c.nombre >= 0.75 && c.marca >= 1)
      .sort((x, y) => y.nombre - x.nombre);
    return candidatos.length ? { url: fotoGrande(candidatos[0].url), fuente: FUENTE_OFF, por: "nombre" } : null;
  } catch {
    return null;
  }
};

// La foto de un producto del Excel, o null.
export const buscarFoto = async ({ codigo, nombre, marca, empacado = true }) =>
  (await porCodigo(codigo)) || (empacado ? await porNombre(nombre, marca) : null);

// Corre `tarea` sobre la lista de a `cuantas` a la vez, en orden.
export const enParalelo = async (lista, cuantas, tarea) => {
  const resultados = new Array(lista.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < lista.length) {
      const i = siguiente++;
      resultados[i] = await tarea(lista[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(cuantas, lista.length) }, trabajador));
  return resultados;
};
