import express from "express";
import loyaltyConfigController from "../controller/loyaltyConfigController.js";

import { soloAdmin } from "../middlewares/validarSesion.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: LoyaltyConfig
 *   description: Configuración editable del programa de puntos de fidelidad (documento singleton).
 */

/**
 * @swagger
 * /loyaltyConfig:
 *   get:
 *     summary: Obtiene la configuración actual de puntos (la crea con defaults si aún no existe)
 *     tags: [LoyaltyConfig]
 *     responses:
 *       200:
 *         description: Configuración de fidelidad.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoyaltyConfig'
 *       500:
 *         description: Error interno del servidor.
 *   put:
 *     summary: Actualiza la tasa de puntos y/o los meses de vencimiento
 *     tags: [LoyaltyConfig]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoyaltyConfigInput'
 *     responses:
 *       200:
 *         description: Configuración actualizada (upsert automático si el singleton aún no existía).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Configuración actualizada
 *                 config:
 *                   $ref: '#/components/schemas/LoyaltyConfig'
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Leer la configuración es público: el cliente ve en su cuenta cuántos puntos gana por dólar y
// cuándo se le vencen, y eso tiene que poder consultarlo. Cambiar la tasa es otra cosa — con esto
// abierto, cualquiera se regalaba puntos ajustando el multiplicador.
router
  .route("/")
  .get(loyaltyConfigController.getConfig)                    // GET /api/loyaltyConfig -> config actual
  .put(soloAdmin, loyaltyConfigController.updateConfig);  // PUT /api/loyaltyConfig -> editar tasa/vencimiento

export default router;
