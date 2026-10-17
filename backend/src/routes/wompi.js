import express from "express";
import wompiController from "../controller/wompiController.js";

import { conSesion } from "../middlewares/validarSesion.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * components:
 *   schemas:
 *     WompiTokenResponse:
 *       type: object
 *       description: Respuesta cruda del servidor OAuth de Wompi (https://id.wompi.sv/connect/token), reenviada tal cual la recibe el backend.
 *       properties:
 *         access_token:
 *           type: string
 *           description: Token Bearer a usar en el header Authorization de /wompi/paymentTest y /wompi/payment3DS.
 *         expires_in:
 *           type: number
 *           description: Segundos de vigencia del access_token.
 *           example: 3600
 *         token_type:
 *           type: string
 *           example: Bearer
 *         scope:
 *           type: string
 *     WompiTransactionInput:
 *       type: object
 *       description: >
 *         El backend NO valida ni transforma este cuerpo: toma "token" para el header Authorization y
 *         reenvía "formData" tal cual (JSON.stringify) al endpoint de Wompi correspondiente. La forma
 *         exacta de "formData" (monto, moneda, referencia, datos de la tarjeta tokenizada, etc.) debe
 *         corresponder al contrato oficial de la API de Wompi El Salvador para el endpoint de destino
 *         (TransaccionCompra/TokenizadaSin3Ds o TransaccionCompra/3Ds); este proyecto no la tipa ni la valida.
 *       properties:
 *         token:
 *           type: string
 *           description: access_token Bearer obtenido previamente en POST /wompi/token.
 *         formData:
 *           type: object
 *           description: Cuerpo de la transacción, reenviado sin cambios a la API de Wompi (monto, moneda, referencia, tarjeta tokenizada, etc. según el endpoint).
 *           additionalProperties: true
 *       required:
 *         - token
 *         - formData
 *     WompiTransactionResponse:
 *       type: object
 *       description: Respuesta cruda devuelta por la API de Wompi para la transacción (su forma varía según el resultado - aprobada, rechazada o pendiente).
 *       additionalProperties: true
 */

/**
 * @swagger
 * tags:
 *   name: Wompi
 *   description: >
 *     Integración con la pasarela de pagos Wompi El Salvador (token OAuth y transacciones de compra
 *     tokenizadas). Estas rutas actúan como proxy hacia la API de Wompi (id.wompi.sv / api.wompi.sv)
 *     usando credenciales de aplicación guardadas en el servidor (config.wompi / variables de entorno).
 *     Este archivo NO define ninguna ruta de webhook/callback para recibir notificaciones asíncronas de
 *     Wompi; las tres rutas de abajo son consumidas por el frontend durante el checkout.
 */

/**
 * @swagger
 * /wompi/token:
 *   post:
 *     summary: Genera un token de acceso OAuth (client_credentials) contra el servidor de identidad de Wompi
 *     description: >
 *       No requiere requestBody: usa las credenciales de la aplicación (grant_type, audience, client_id,
 *       client_secret) configuradas en el servidor para solicitar un access_token a
 *       https://id.wompi.sv/connect/token. El access_token resultante debe usarse como Bearer al llamar
 *       /wompi/paymentTest o /wompi/payment3DS.
 *     tags: [Wompi]
 *     responses:
 *       200:
 *         description: Token generado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WompiTokenResponse'
 *       500:
 *         description: Error interno del servidor, o error devuelto por el servidor de identidad de Wompi.
 */

/**
 * @swagger
 * /wompi/paymentTest:
 *   post:
 *     summary: Ejecuta una transacción de compra tokenizada SIN 3D Secure (flujo de pruebas)
 *     description: >
 *       Reenvía "formData" tal cual, autenticado con "token" (Bearer), a
 *       POST https://api.wompi.sv/TransaccionCompra/TokenizadaSin3Ds.
 *     tags: [Wompi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WompiTransactionInput'
 *     responses:
 *       200:
 *         description: Respuesta de Wompi para la transacción (aprobada, rechazada o pendiente, según formData).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WompiTransactionResponse'
 *       500:
 *         description: Error interno del servidor, o error devuelto por la API de Wompi.
 */

/**
 * @swagger
 * /wompi/payment3DS:
 *   post:
 *     summary: Ejecuta una transacción de compra CON 3D Secure (flujo real/producción)
 *     description: >
 *       Reenvía "formData" tal cual, autenticado con "token" (Bearer), a
 *       POST https://api.wompi.sv/TransaccionCompra/3Ds.
 *     tags: [Wompi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WompiTransactionInput'
 *     responses:
 *       200:
 *         description: Respuesta de Wompi para la transacción (puede incluir un paso adicional de autenticación 3DS).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WompiTransactionResponse'
 *       500:
 *         description: Error interno del servidor, o error devuelto por la API de Wompi.
 */


const router = express.Router()

// La pasarela de pago. Todavía no cobra de verdad, pero estas rutas hablan con un servicio externo
// con las credenciales de la tienda: abiertas, cualquiera las dispara desde afuera. Como mínimo,
// hay que ser alguien.
router.route("/token").post(conSesion, wompiController.generarToken)
router.route("/paymentTest").post(conSesion, wompiController.paymentTest)
router.route("/payment3DS").post(conSesion, wompiController.payment3DS)

export default router

