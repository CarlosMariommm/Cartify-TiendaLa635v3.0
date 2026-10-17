import express from 'express';
import moduleController from '../controller/module.js';

import { soloAdmin } from '../middlewares/validarSesion.js';

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Gestión CRUD de módulos/estantes de la tienda.
 */

/**
 * @swagger
 * /module:
 *   get:
 *     summary: Lista todos los módulos
 *     tags: [Modules]
 *     responses:
 *       200:
 *         description: Arreglo de módulos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Module'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Crea un nuevo módulo
 *     tags: [Modules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModuleInput'
 *     responses:
 *       201:
 *         description: Módulo creado exitosamente.
 *       400:
 *         description: El nombre es obligatorio o ya existe un módulo con ese nombre.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /module/{id}:
 *   get:
 *     summary: Obtiene módulos (usa el mismo listado que GET /module)
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del módulo.
 *     responses:
 *       200:
 *         description: Arreglo de módulos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Module'
 *       500:
 *         description: Error interno del servidor.
 *   put:
 *     summary: Actualiza un módulo existente
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del módulo a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModuleInput'
 *     responses:
 *       200:
 *         description: Módulo actualizado exitosamente.
 *       400:
 *         description: Faltan campos requeridos (name o description).
 *       404:
 *         description: Módulo no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina un módulo
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del módulo a eliminar.
 *     responses:
 *       200:
 *         description: Módulo eliminado exitosamente.
 *       404:
 *         description: Módulo no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Los módulos son los pasillos de la tienda: se ven sin cuenta, se crean desde
// el panel.

router.route("/")
    .get(moduleController.getModule)
    .post(soloAdmin, moduleController.insertModule);

router.route("/:id")
    .put(soloAdmin, moduleController.updateModule)
    .get(moduleController.getModule)
    .delete(soloAdmin, moduleController.deleteModule);

export default router;