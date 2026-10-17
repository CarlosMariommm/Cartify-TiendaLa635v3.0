import express from 'express';
import adminController from '../controller/Admin/adminController.js';

import { soloPersonal } from '../middlewares/validarSesion.js';

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: Gestión CRUD de administradores.
 */

/**
 * @swagger
 * /admin:
 *   get:
 *     summary: Lista todos los administradores
 *     tags: [Admins]
 *     responses:
 *       200:
 *         description: Arreglo de administradores.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Admin'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Crea un nuevo administrador
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminLoginInput'
 *     responses:
 *       201:
 *         description: Administrador creado exitosamente.
 *       400:
 *         description: Faltan campos obligatorios, el formato del correo es inválido, o ya existe un administrador con ese correo.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /admin/{id}:
 *   get:
 *     summary: Obtiene administradores (usa el mismo listado que GET /admin)
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del administrador.
 *     responses:
 *       200:
 *         description: Arreglo de administradores.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Admin'
 *       500:
 *         description: Error interno del servidor.
 *   put:
 *     summary: Actualiza un administrador existente
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del administrador a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/AdminLoginInput'
 *             description: password es opcional aquí; si se omite, se conserva la contraseña actual.
 *     responses:
 *       200:
 *         description: Administrador actualizado exitosamente.
 *       400:
 *         description: Faltan email/userName o el formato del correo es inválido.
 *       404:
 *         description: Administrador no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina un administrador
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del administrador a eliminar.
 *     responses:
 *       200:
 *         description: Administrador eliminado exitosamente.
 *       404:
 *         description: Administrador no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Las cuentas de administrador: la llave del panel entero. Con esto abierto, la lista de admins —y
// su hash— se consultaba sin nada.
router.use(soloPersonal);

router.route("/")
    .get(adminController.getAdmins)
    .post(adminController.insertAdmin);

router.route("/:id")
    .put(adminController.updateAdmin)
    .get(adminController.getAdmins)
    .delete(adminController.deleteAdmin);

export default router;