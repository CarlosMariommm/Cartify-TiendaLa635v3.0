import express from 'express';
import productController from '../controller/product.js';
import upload from '../utils/cloudinaryConfig.js';


import { soloAdmin, soloPersonal } from '../middlewares/validarSesion.js';

/*
 * ── Documentación de la API (Swagger) ──
 *
 * Viene de main. Va agrupada aquí y no pegada a cada ruta porque
 * swagger-jsdoc rastrea el archivo entero: dónde esté no cambia lo que
 * documenta, y así el código de las rutas se lee sin interrupciones.
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Gestión del catálogo de productos.
 */

/**
 * @swagger
 * /product/tambien-llevan:
 *   get:
 *     summary: Lo que se lleva junto con cada producto en un mismo pedido (público)
 *     description: De los pedidos de los últimos 180 días, sin cancelados. Solo ids de productos activos; un par sale si va junto en 2 pedidos de 2 personas distintas o más, y más de lo que tocaría por azar. Se calcula una vez por hora. Ver src/utils/tambienLlevan.js.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: "{ productos: { idProducto: [ids, del que más se lleva junto al que menos] } }"
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /product:
 *   get:
 *     summary: Lista el catálogo con lo que ve un cliente (público)
 *     description: Sin costo, proveedor, código de barras ni vencimiento. typeId, brandId y moduleId vienen poblados solo con su nombre. Ver src/utils/productoPublico.js.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Arreglo de productos con los campos públicos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Crea un nuevo producto
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Producto creado exitosamente.
 *       400:
 *         description: Faltan campos requeridos o el código de barras ya está en uso.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /product/inventario:
 *   get:
 *     summary: Lista el inventario completo (personal)
 *     description: Todos los campos, con typeId, brandId, moduleId y supplierId poblados. Lo usa el panel.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Arreglo de productos completos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Sin sesión de personal.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /product/{id}:
 *   get:
 *     summary: Obtiene un producto con sus campos públicos
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del producto.
 *     responses:
 *       200:
 *         description: Arreglo de productos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Error interno del servidor.
 *   put:
 *     summary: Actualiza un producto existente
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del producto a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente.
 *       400:
 *         description: Faltan campos requeridos o el código de barras ya está en uso por otro producto.
 *       404:
 *         description: Producto no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina un producto (y su imagen en Cloudinary)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del producto a eliminar.
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente.
 *       404:
 *         description: Producto no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

/*
 * Ver el catálogo es público: la tienda se mira sin cuenta, esa es la puerta.
 * Tocarlo no. Con el POST/PUT/DELETE abiertos, cualquiera podía cambiarle los
 * precios a la tienda, vaciar existencias o borrar productos.
 */

router.route("/")
    .get(productController.getProduct)
    .post(soloAdmin, upload.single('image'), productController.insertProduct);

/*
 * El catálogo de arriba es el que ve un cliente: sin costo ni proveedor. El
 * panel necesita todo y lo pide aquí, con sesión de personal. Va antes de
 * "/:id" para que "inventario" no se lea como el id de un producto.
 */
router.get("/inventario", soloPersonal, productController.getInventario);

// Lo que se lleva junto en un mismo pedido, para la ficha de cada producto. Público, como el catálogo.
router.get("/tambien-llevan", productController.getTambienLlevan);

router.route("/:id")
    .put(soloAdmin, upload.single('image'), productController.updateProduct)
    .get(productController.getProductById)
    .delete(soloAdmin, productController.deleteProduct);

export default router;