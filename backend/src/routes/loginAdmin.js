import express from "express";
import loginAdminController from "../controller/Admin/loginAdmin.js";
import { soloAdmin } from "../middlewares/validarSesion.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Admin Auth
 *   description: Autenticación de administradores.
 */

/**
 * @swagger
 * /loginAdmin/login:
 *   post:
 *     summary: Paso 1 del inicio de sesión del personal (administrador o empleado)
 *     description: Revisa correo y contraseña y manda un código de 6 números al correo. La sesión se abre en el paso 2 (/loginAdmin/verify-2fa).
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               app: { type: boolean, description: "true desde la app del teléfono: devuelve twofaToken en el cuerpo, porque la app no guarda cookies como el navegador." }
 *     responses:
 *       200:
 *         description: Código enviado. Se deja la cookie twofaCookie (10 minutos) con la HUELLA del código, nunca el código.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 needs2FA: { type: boolean, example: true }
 *                 message: { type: string }
 *                 email: { type: string, description: "El correo enmascarado: ma****@gmail.com" }
 *                 twofaToken: { type: string, description: "Solo si app = true. Se devuelve en el paso 2." }
 *       400:
 *         description: Email inválido o contraseña no enviada.
 *       401:
 *         description: Contraseña incorrecta.
 *       403:
 *         description: Cuenta deshabilitada o bloqueada temporalmente por 5 minutos (5 intentos fallidos).
 *       404:
 *         description: No se encontró la cuenta.
 *       500:
 *         description: Error interno del servidor o no se pudo enviar el correo.
 *
 * /loginAdmin/verify-2fa:
 *   post:
 *     summary: Paso 2 del inicio de sesión del personal — el código del correo
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "482913" }
 *               twofaToken: { type: string, description: "Desde la app: el que devolvió el paso 1. En el navegador va en la cookie twofaCookie." }
 *     responses:
 *       200:
 *         description: "Sesión abierta: cookie authCookie (30 días) y { token, tipo: admin|employee, admin }."
 *       400:
 *         description: El código venció o no se escribió.
 *       401:
 *         description: El código no es correcto.
 *
 * /loginAdmin/pase-app:
 *   post:
 *     summary: Un pase de un solo uso para abrir el panel web dentro de la app
 *     description: Solo el administrador, con la sesión de la app (Authorization Bearer). El pase vence en un minuto.
 *     tags: [Admin Auth]
 *     responses:
 *       200:
 *         description: "{ pase }"
 *       401:
 *         description: Sin sesión.
 *       403:
 *         description: La sesión no es de administrador.
 *
 * /loginAdmin/pase-app/canjear:
 *   post:
 *     summary: El panel web canjea el pase y queda con la sesión abierta
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pase]
 *             properties:
 *               pase: { type: string }
 *     responses:
 *       200:
 *         description: "Sesión abierta: cookie authCookie (12 horas) y { token, tipo: admin, admin }."
 *       400:
 *         description: El pase no existe, ya se usó o venció.
 */


const router = express.Router();

router.post("/login", loginAdminController.login);
router.post("/verify-2fa", loginAdminController.verify2FA);
// El panel dentro de la app: ver utils/pasesPanel.js.
router.post("/pase-app", soloAdmin, loginAdminController.paseApp);
router.post("/pase-app/canjear", loginAdminController.canjearPaseApp);

export default router;