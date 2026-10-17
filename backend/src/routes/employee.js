import express from 'express';
import employeeController from '../controller/Employee/employeeController.js';
import upload from '../utils/cloudinaryConfig.js';

import { soloAdmin } from '../middlewares/validarSesion.js';

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Gestión CRUD de empleados.
 */

/**
 * @swagger
 * /employee:
 *   get:
 *     summary: Lista todos los empleados
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Arreglo de empleados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Crea un nuevo empleado
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeInput'
 *     responses:
 *       201:
 *         description: Empleado creado exitosamente.
 *       500:
 *         description: Error interno del servidor (el controlador no valida campos faltantes explícitamente; si falta el archivo de imagen u otro dato requerido, la petición fallará).
 */

/**
 * @swagger
 * /employee/{id}:
 *   get:
 *     summary: Obtiene empleados (usa el mismo listado que GET /employee)
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del empleado.
 *     responses:
 *       200:
 *         description: Arreglo de empleados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       500:
 *         description: Error interno del servidor.
 *   put:
 *     summary: Actualiza un empleado existente
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del empleado a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeInput'
 *     responses:
 *       200:
 *         description: Empleado actualizado exitosamente.
 *       400:
 *         description: Faltan campos requeridos (email, userName, password, fullName, dui o phoneNumber).
 *       404:
 *         description: Empleado no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina un empleado
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del empleado a eliminar.
 *     responses:
 *       200:
 *         description: Empleado eliminado exitosamente.
 *       404:
 *         description: Empleado no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Todo lo de empleados es del personal, sin excepción: aquí se listan, se dan de alta y se borran
// las cuentas de quienes trabajan en la tienda.
router.use(soloAdmin);

router.route("/")
    .get(employeeController.getEmployees)
    .post(upload.single('image'), employeeController.insertEmployee);  

router.route("/:id")
    .put(upload.single('image'), employeeController.updateEmployee)
    .get(employeeController.getEmployees)
    .delete(employeeController.deleteEmployee);

export default router;