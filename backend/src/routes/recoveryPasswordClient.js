import express from "express";

import recoveryPasswordController from "../controller/Clients/recoveryPasswordClient.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Password Recovery
 *   description: Recuperación de contraseña de clientes vía código enviado por correo.
 */

/**
 * @swagger
 * /recoveryPasswordClient/requestCode:
 *   post:
 *     summary: Solicita un código de recuperación de contraseña
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecoveryRequestCodeInput'
 *     responses:
 *       200:
 *         description: Código enviado por correo. Se establece la cookie recoveryCookie (15 min).
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor o error al enviar el correo.
 */

/**
 * @swagger
 * /recoveryPasswordClient/verifyCode:
 *   post:
 *     summary: Verifica el código de recuperación
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecoveryVerifyCodeInput'
 *     responses:
 *       200:
 *         description: Código verificado. Renueva la cookie recoveryCookie marcada como verified.
 *       400:
 *         description: Código inválido o la sesión de recuperación expiró (falta recoveryCookie).
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /recoveryPasswordClient/newPassword:
 *   post:
 *     summary: Establece la nueva contraseña tras verificar el código
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecoveryNewPasswordInput'
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente. Limpia la cookie recoveryCookie.
 *       400:
 *         description: Faltan campos, las contraseñas no coinciden, el código no fue verificado, o la sesión expiró.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

router.route("/requestCode").post(recoveryPasswordController.requestCode);
router.route("/verifyCode").post(recoveryPasswordController.verifyCode);
router.route("/newPassword").post(recoveryPasswordController.newPassword);

export default router;
