/*
 * ============================================================
 * TIENDA — lo que se necesita para pintar la portada
 * ============================================================
 * El equivalente móvil de `productService.js` y `promotionService.js` de la
 * web, juntos: son dos peticiones que siempre se hacen a la vez y que sin la
 * otra no sirven de nada. Un producto sin sus promociones muestra el precio
 * de lista aunque esté rebajado, y eso es enseñar un precio que no se va a
 * cobrar.
 *
 * Solo lectura. Crear, editar y borrar productos es cosa del panel, y el panel
 * no existe en móvil.
 * ============================================================
 */

import { peticion } from './api';

export const tiendaApi = {
  // Todo el catálogo. El backend devuelve el producto con brandId, typeId y
  // moduleId ya poblados; ver utils/catalogo.js para cómo se traduce.
  getProductos: () => peticion('/product'),

  getPromociones: () => peticion('/promotion'),

  // Lo que se lleva junto con cada producto en un mismo pedido: { productos: { id: [ids] } }.
  getTambienLlevan: () => peticion('/product/tambien-llevan'),
};

/*
 * "Quien compra esto también lleva", de toda la tienda, pedido UNA vez por
 * uso de la app y compartido entre fichas. Si falla, vacío (la ficha sale sin
 * esa fila) y la próxima ficha lo vuelve a intentar. Ver utils/tambienLlevan.js.
 */
let tambienLlevan = null;
export const cargarTambienLlevan = () => {
  if (!tambienLlevan) {
    tambienLlevan = tiendaApi.getTambienLlevan()
      .then((r) => (r && typeof r.productos === 'object' && r.productos) || {})
      .catch(() => {
        tambienLlevan = null;
        return {};
      });
  }
  return tambienLlevan;
};

/*
 * Las dos de un tirón.
 *
 * Las promociones se piden con red: que la tienda no abra porque el listado de
 * promos falló sería cambiar una rebaja por el catálogo entero. Sin promos los
 * productos salen a precio de lista, que es exactamente lo que hace la web
 * (`promotionService.getPromotions().catch(() => [])` en useStore).
 */
export const cargarTienda = async () => {
  const [productos, promociones] = await Promise.all([
    tiendaApi.getProductos(),
    tiendaApi.getPromociones().catch(() => []),
  ]);

  return {
    productos: Array.isArray(productos) ? productos : [],
    promociones: Array.isArray(promociones) ? promociones : [],
  };
};

export default tiendaApi;
