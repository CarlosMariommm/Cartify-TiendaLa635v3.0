import express from 'express';
import supplierController from '../controller/supplier.js';

import { soloAdmin } from '../middlewares/validarSesion.js';

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Suppliers
 *   description: Gestión CRUD de proveedores.
 */

/**
 * @swagger
 * /supplier:
 *   get:
 *     summary: Lista todos los proveedores
 *     tags: [Suppliers]
 *     responses:
 *       200:
 *         description: Arreglo de proveedores.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supplier'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Crea un nuevo proveedor
 *     tags: [Suppliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplierInput'
 *     responses:
 *       201:
 *         description: Proveedor creado exitosamente.
 *       400:
 *         description: Falta el nombre o el correo, el formato del correo es inválido, o ya existe un proveedor con ese nombre.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /supplier/{id}:
 *   get:
 *     summary: Obtiene proveedores (usa el mismo listado que GET /supplier)
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del proveedor.
 *     responses:
 *       200:
 *         description: Arreglo de proveedores.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supplier'
 *       500:
 *         description: Error interno del servidor.
 *   put:
 *     summary: Actualiza un proveedor existente
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del proveedor a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplierInput'
 *     responses:
 *       200:
 *         description: Proveedor actualizado exitosamente.
 *       400:
 *         description: Faltan campos requeridos (name, phoneNumber, email o creditDays).
 *       404:
 *         description: Proveedor no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina un proveedor
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del proveedor a eliminar.
 *     responses:
 *       200:
 *         description: Proveedor eliminado exitosamente.
 *       404:
 *         description: Proveedor no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Los proveedores de la tienda, con sus contactos. Cosa del personal.
router.use(soloAdmin);

router.route("/")
    .get(supplierController.getSupplier)
    .post(supplierController.insertSupplier);

router.route("/:id")
    .put(supplierController.updateSupplier)
    .get(supplierController.getSupplier)
    .delete(supplierController.deleteSupplier);

export default router;