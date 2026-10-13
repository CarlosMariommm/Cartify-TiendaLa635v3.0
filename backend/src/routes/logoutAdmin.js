import express from "express";
import logoutController from "../controller/Admin/logoutAdmin.js";

/*
 * ── Documentación de la API (Swagger) ──
 *
 * Viene de main. Va agrupada aquí y no pegada a cada ruta porque
 * swagger-jsdoc rastrea el archivo entero: dónde esté no cambia lo que
 * documenta, y así el código de las rutas se lee sin interrupciones.
 */

/**
 * @swagger
 * /logoutAdmin:
 *   post:
 *     summary: Cierra la sesión del administrador
 *     tags: [Admin Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushToken: { type: string, description: "Desde la app: el token de avisos de ese teléfono, que deja de recibir los pedidos nuevos." }
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
