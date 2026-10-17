// EL PRODUCTO QUE VE UN CLIENTE — productoPublico.js
// Los campos de un producto que pueden salir por una ruta pública: el catálogo (GET /product), un
// producto suelto (GET /product/:id) y los productos de cada promoción (GET /promotion).
export const CAMPOS_PUBLICOS_PRODUCTO =
  "name image salePrice unidadVenta piezas description soloAdultos isActive " +
  "typeId brandId moduleId stock maxQuantity familia fotoFuente createdAt";
