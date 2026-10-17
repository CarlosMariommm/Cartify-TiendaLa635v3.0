import api from './api';

// SERVICIO DE PRODUCTOS — productService.js
// Centraliza todas las peticiones HTTP relacionadas con productos. Usa la instancia de Axios (api)
// que ya tiene el baseURL y los interceptores de errores configurados.
export const productService = {
  // 1- Obtener el catálogo de la tienda (SELECT). Público: viene sin costo,
  //    proveedor ni código de barras. El panel usa getInventario.
  getProducts: async () => {
    const response = await api.get('/product');
    return response.data;
  },

  // 1a- Lo que se lleva junto con cada producto en un mismo pedido:
  //     { productos: { id: [ids] } }. Público. Ver utils/tambienLlevan.js.
  getTambienLlevan: async () => {
    const response = await api.get('/product/tambien-llevan');
    return response.data;
  },

  // 1c- Importar desde Excel, por tandas de 20 (solo el dueño). Ver utils/importarExcel.js.
  importarColumnas: async (encabezados, ejemplos) => {
    const response = await api.post('/product/importar/columnas', { encabezados, ejemplos });
    return response.data;
  },
  analizarImportacion: async (filas) => {
    const response = await api.post('/product/importar/analizar', { filas });
    return response.data;
  },
  importarProductos: async (productos) => {
    const response = await api.post('/product/importar', { productos });
    return response.data;
  },

  // 1b- Obtener el inventario completo, con costo y proveedor. Pide sesión de
  //     personal: es lo que la tienda no le enseña a un cliente.
  getInventario: async () => {
    const response = await api.get('/product/inventario');
    return response.data;
  },

  // 2- Crear un nuevo producto con imagen (INSERT)
  //    Se usa FormData porque lleva un archivo (imagen) adjunto
  createProduct: async (formData) => {
    const response = await api.post('/product', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // 3- Actualizar un producto existente por su ID (UPDATE)
  //    También usa FormData en caso de que se cambie la imagen
  updateProduct: async (id, formData) => {
    const response = await api.put(`/product/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // 4- Eliminar un producto por su ID (DELETE)
  deleteProduct: async (id) => {
    const response = await api.delete(`/product/${id}`);
    return response.data;
  }
};
