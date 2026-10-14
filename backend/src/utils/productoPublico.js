/*
 * ============================================================
 * EL PRODUCTO QUE VE UN CLIENTE — productoPublico.js
 * ============================================================
 * Los campos de un producto que pueden salir por una ruta pública: el
 * catálogo (GET /product), un producto suelto (GET /product/:id) y los
 * productos de cada promoción (GET /promotion).
 *
 * Antes esas rutas devolvían el documento entero, con el proveedor poblado.
 * Cualquiera que abriera /api/product veía el costo de cada cosa (o sea el
 * margen de la tienda), a quién se le compra, el código de barras y el id de
 * la foto en Cloudinary. Un competidor no necesitaba más que el navegador.
 *
 * Va en un solo lugar a propósito: si cada ruta tuviera su propia lista, la
 * próxima que se abra copiaría la que tenga más a mano, y basta una para que
 * el costo vuelva a salir.
 *
 * Lo que entra, y quién lo usa:
 *   - nombre, foto, precio, unidadVenta, piezas, descripción, soloAdultos,
 *     isActive: la tarjeta, el detalle y el carrito.
 *   - typeId, brandId, moduleId: categoría, marca y pasillo.
 *   - stock: el tope del carrito y el "quedan X".
 *   - maxQuantity: la fila "se está acabando" mide el stock contra él.
 *   - familia: las filas temáticas de la portada.
 *   - fotoFuente: de dónde salió la foto si no es de la tienda ("Open Food
 *     Facts", al importar desde Excel); la ficha da el crédito que pide su
 *     licencia.
 *   - createdAt: la fila de lo nuevo.
 * La app ya instalada lee exactamente esto (movil/src/utils/catalogo.js); si
 * se quita algo de aquí, se le rompe a quien no ha actualizado.
 *
 * Lo que NO entra: priceCost, supplierId, barCode, public_id, expirationDate,
 * familiaOrigen. El panel los trae por GET /product/inventario, con sesión.
 * ============================================================
 */
export const CAMPOS_PUBLICOS_PRODUCTO =
  "name image salePrice unidadVenta piezas description soloAdultos isActive " +
  "typeId brandId moduleId stock maxQuantity familia fotoFuente createdAt";
