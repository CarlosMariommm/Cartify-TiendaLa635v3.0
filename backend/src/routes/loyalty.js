import express from "express";
import loyaltyController from "../controller/loyaltyController.js";

import { duenoOPersonal } from "../middlewares/validarSesion.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * components:
 *   schemas:
 *     LoyaltySummary:
 *       type: object
 *       properties:
 *         available:
 *           type: number
 *           description: Saldo disponible = suma de lotes de puntos aún no vencidos.
 *           example: 320
 *         nextExpiry:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Fecha del próximo lote de puntos en vencer (null si no hay lotes).
 *         expiringSoon:
 *           type: number
 *           description: Puntos que vencen dentro de los próximos 30 días.
 *           example: 40
 */

/**
 * @swagger
 * tags:
 *   name: Loyalty
 *   description: Consulta del saldo de puntos de fidelidad del cliente.
 */

/**
 * @swagger
 * /loyalty/{clientId}/summary:
 *   get:
 *     summary: Resumen de puntos de un cliente (saldo disponible y próximos vencimientos)
 *     tags: [Loyalty]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente.
 *     responses:
 *       200:
 *         description: Resumen calculado en el momento (vencimiento "lazy", sin necesidad de tareas programadas).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoyaltySummary'
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Resumen de puntos de un cliente (saldo disponible + vencimientos).
router
  .route("/:clientId/summary")
  // Los puntos son de quien los ganó: cada quien ve los suyos, el personal ve
  // los de todos. Abierto, se leía el saldo de puntos de cualquiera.
  .get(duenoOPersonal("clientId"), loyaltyController.getSummary);

export default router;
