import express from "express";
import logoutController from "../controller/Clients/logoutClient.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * /logoutClient:
 *   post:
 *     summary: Cierra la sesión del cliente
 *     tags: [Client Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada. Limpia la cookie authCookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sesión cerrada
 */


const router = express.Router();

router.route("/").post(logoutController.logout);

export default router;
