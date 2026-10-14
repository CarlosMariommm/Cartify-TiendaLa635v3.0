import { CAMPOS, POR_TANDA, analizarLote, columnasConIA, importarLote } from "../utils/importarProductos.js";

/*
 * ============================================================
 * IMPORTAR EL INVENTARIO DESDE EXCEL — importarController.js
 * ============================================================
 * Las tres rutas de panel › Inventario › "Importar desde Excel", solo para
 * el administrador. La web lee el archivo y manda las filas por tandas de
 * 20 (así ninguna petición tarda más de unos segundos). Ver
 * utils/importarProductos.js.
 * ============================================================
 */

const importarController = {};

const lista = (valor) => (Array.isArray(valor) ? valor : []);

// POST /product/importar/columnas — { encabezados, ejemplos } → { mapa: { nombre: 0, precio: 3, … } }
importarController.columnas = async (req, res) => {
  const encabezados = lista(req.body?.encabezados).slice(0, 40).map((e) => String(e ?? ""));
  const ejemplos = lista(req.body?.ejemplos).slice(0, 5).map((f) => lista(f).slice(0, 40));
  if (!encabezados.length) return res.status(400).json({ message: "No llegaron las columnas del Excel" });
  try {
    const mapa = await columnasConIA(encabezados, ejemplos);
    if (!mapa) return res.status(503).json({ message: "La IA no está disponible para leer las columnas. Elíjalas a mano." });
    return res.status(200).json({ mapa, campos: CAMPOS });
  } catch (error) {
    console.log("error importar/columnas: " + error);
    return res.status(503).json({ message: "La IA no pudo leer las columnas ahora. Elíjalas a mano o intente en un minuto." });
  }
};

// POST /product/importar/analizar — { filas } (hasta 20) → la vista previa de esa tanda
importarController.analizar = async (req, res) => {
  const filas = lista(req.body?.filas);
  if (!filas.length) return res.status(400).json({ message: "No llegaron filas para revisar" });
  if (filas.length > POR_TANDA) return res.status(400).json({ message: `Mande las filas de ${POR_TANDA} en ${POR_TANDA}` });
  try {
    return res.status(200).json(await analizarLote(filas));
  } catch (error) {
    console.log("error importar/analizar: " + error);
    return res.status(500).json({ message: "No se pudieron revisar estas filas. Intente de nuevo." });
  }
};

// POST /product/importar — { productos } (hasta 20, ya revisados) → { resultados }
importarController.importar = async (req, res) => {
  const productos = lista(req.body?.productos);
  if (!productos.length) return res.status(400).json({ message: "No llegaron productos para importar" });
  if (productos.length > POR_TANDA) return res.status(400).json({ message: `Mande los productos de ${POR_TANDA} en ${POR_TANDA}` });
  try {
    return res.status(200).json({ resultados: await importarLote(productos) });
  } catch (error) {
    console.log("error importar: " + error);
    return res.status(500).json({ message: "No se pudieron importar estos productos. Intente de nuevo." });
  }
};

export default importarController;
