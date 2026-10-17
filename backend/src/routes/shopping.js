import express from 'express';
import shoppingController from '../controller/shoppingController.js';

import { soloAdmin } from '../middlewares/validarSesion.js';

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Shoppings
 *   description: Compras de inventario a proveedores (reabastecimiento). Distinto de Orders, que son las ventas al cliente.
 */

/**
 * @swagger
 * /shopping:
 *   get:
 *     summary: Lista todas las compras a proveedores
 *     tags: [Shoppings]
 *     responses:
 *       200:
 *         description: Arreglo de compras, con supplierId y products.productId poblados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Shopping'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Registra una nueva compra a un proveedor
 *     tags: [Shoppings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShoppingInput'
 *     responses:
 *       201:
 *         description: Compra registrada exitosamente.
 *       400:
 *         description: Faltan campos requeridos o el arreglo de productos está vacío.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /shopping/{id}:
 *   put:
 *     summary: Actualiza una compra existente
 *     tags: [Shoppings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId de la compra a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShoppingInput'
 *     responses:
 *       200:
 *         description: Compra actualizada exitosamente.
 *       400:
 *         description: Faltan campos requeridos o el arreglo de productos está vacío.
 *       404:
 *         description: Compra no encontrada.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina una compra
 *     tags: [Shoppings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId de la compra a eliminar.
 *     responses:
 *       200:
 *         description: Compra eliminada exitosamente.
 *       404:
 *         description: Compra no encontrada.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Las compras a proveedor: lo que le cuesta la mercadería a la tienda.
router.use(soloAdmin);

router.route("/")
    .get(shoppingController.getShoppings)
    .post(shoppingController.insertShopping);

router.route("/:id")
    .put(shoppingController.updateShopping)
    .delete(shoppingController.deleteShopping);

export default router;