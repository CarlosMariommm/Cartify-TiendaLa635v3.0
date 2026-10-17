import express from "express";
import loginClientController from "../controller/Clients/loginClient.js";
import googleAuthClientController from "../controller/Clients/googleAuthClient.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Client Auth
 *   description: Autenticación de clientes.
 */

/**
 * @swagger
 * /loginClient/login:
 *   post:
 *     summary: Inicia sesión como cliente
 *     tags: [Client Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientLoginInput'
 *     responses:
 *       200:
 *         description: Login exitoso. Se establece la cookie httpOnly authCookie con el JWT (30 días).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                 client:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     image:
 *                       type: string
 *       400:
 *         description: Email inválido o contraseña no enviada.
 *       401:
 *         description: Correo no encontrado o contraseña incorrecta.
 *       403:
 *         description: Cuenta deshabilitada, no verificada, o bloqueada temporalmente por 5 minutos (5 intentos fallidos).
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

router.post("/login", loginClientController.login);
// Inicio de sesión con Google. Recibe el ID token del botón del frontend.
router.post("/google", googleAuthClientController.login);

export default router;