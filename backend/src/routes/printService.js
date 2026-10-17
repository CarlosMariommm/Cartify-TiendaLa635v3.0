import express from 'express';
import printServiceController from '../controller/printServiceController.js';

import { soloAdmin } from "../middlewares/validarSesion.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: PrintServices
 *   description: Catálogo de formatos de impresión (módulo Impresiones).
 */

/**
 * @swagger
 * /printService:
 *   get:
 *     summary: Lista todos los servicios de impresión
 *     tags: [PrintServices]
 *     responses:
 *       200:
 *         description: Arreglo de servicios de impresión.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PrintService'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Crea un nuevo servicio de impresión
 *     tags: [PrintServices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrintServiceInput'
 *     responses:
 *       201:
 *         description: Servicio creado exitosamente.
 *       400:
 *         description: Nombre y precio por copia son requeridos.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /printService/{id}:
 *   put:
 *     summary: Actualiza un servicio de impresión existente
 *     tags: [PrintServices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del servicio a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrintServiceInput'
 *     responses:
 *       200:
 *         description: Servicio actualizado exitosamente.
 *       400:
 *         description: Nombre y precio por copia son requeridos.
 *       404:
 *         description: Servicio no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina un servicio de impresión
 *     tags: [PrintServices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del servicio a eliminar.
 *     responses:
 *       200:
 *         description: Servicio eliminado exitosamente.
 *       404:
 *         description: Servicio no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Los servicios de impresión y sus precios se consultan desde la tienda; el
// catálogo lo arma el panel.

router.route("/")
  .get(printServiceController.getServices)
  .post(soloAdmin, printServiceController.insertService);

router.route("/:id")
  .put(soloAdmin, printServiceController.updateService)
  .delete(soloAdmin, printServiceController.deleteService);

export default router;
