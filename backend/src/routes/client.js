import express from "express";
import clientController from "../controller/Clients/clientController.js";
import upload from "../utils/cloudinaryConfig.js";
import { soloAdmin, duenoOPersonal } from "../middlewares/validarSesion.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Gestión de clientes (administración y autoservicio "Mi Cuenta").
 */

/**
 * @swagger
 * /client:
 *   get:
 *     summary: Lista todos los clientes
 *     tags: [Clients]
 *     responses:
 *       200:
 *         description: Arreglo de clientes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Client'
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /client/{id}:
 *   get:
 *     summary: Obtiene un cliente por id (sin el campo password)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente.
 *     responses:
 *       200:
 *         description: Cliente encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   put:
 *     summary: Actualiza un cliente (uso administrativo)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ClientUpdateInput'
 *     responses:
 *       200:
 *         description: Cliente actualizado exitosamente. Devuelve el cliente actualizado.
 *       400:
 *         description: Faltan campos requeridos (fullName, dui, phoneNumber, ClientAddress, email o userName).
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Elimina un cliente
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente a eliminar.
 *     responses:
 *       200:
 *         description: Cliente eliminado exitosamente.
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /client/{id}/profile:
 *   patch:
 *     summary: El cliente edita su propio perfil (datos básicos)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientProfileUpdateInput'
 *     responses:
 *       200:
 *         description: Perfil actualizado. Devuelve el cliente actualizado (sin password).
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /client/{id}/addresses:
 *   patch:
 *     summary: El cliente reemplaza su lista de direcciones de entrega
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientAddressesInput'
 *     responses:
 *       200:
 *         description: Direcciones actualizadas. Devuelve el cliente actualizado (sin password).
 *       400:
 *         description: addresses debe ser un arreglo.
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /client/{id}/notifications:
 *   patch:
 *     summary: El cliente actualiza sus preferencias de notificación
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientNotificationsInput'
 *     responses:
 *       200:
 *         description: Preferencias actualizadas. Devuelve el cliente actualizado (sin password).
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /client/{id}/payment-methods:
 *   patch:
 *     summary: El cliente reemplaza su lista de métodos de pago (datos no sensibles)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientPaymentMethodsInput'
 *     responses:
 *       200:
 *         description: Métodos de pago actualizados. Devuelve el cliente actualizado (sin password).
 *       400:
 *         description: paymentMethods debe ser un arreglo.
 *       404:
 *         description: Cliente no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// SIN middleware de sesión, y es correcto: es el enlace "dejar de recibirlos" del pie de los
// correos, que tiene que funcionar de un clic desde el teléfono de alguien que quizá nunca inició
// sesión en este navegador. La puerta la hace el token firmado que viene en el cuerpo.
router.post("/notificaciones/baja", clientController.bajaNotificacion);

// LA MISMA BAJA, PERO PARA EL BOTÓN DEL PROPIO CORREO.
// Gmail, Outlook y Yahoo le ponen un botón de "Cancelar suscripción" junto al nombre del remitente
// cuando el correo trae el encabezado List-Unsubscribe con soporte de un clic (RFC 8058).
router.post("/notificaciones/baja/:token", clientController.bajaNotificacion);

// Todo este router estaba abierto. Con el id en la URL —que se adivina o se copia— cualquiera leía
// y EDITABA la cuenta de otro: sus direcciones con coordenadas, sus métodos de pago, sus
// favoritos.

// La lista de todos los clientes: cosa del personal. Misma razón que /registerClient/all, que es
// la gemela que usa el panel.
router
  .route("/")
  .get(soloAdmin, clientController.getClients);

// Borrar una cuenta es irreversible y hasta hace poco estaba abierto: con un curl y un _id
// cualquiera podía borrar a un cliente de la tienda.
router
  .route("/:id")
  .get(duenoOPersonal("id"), clientController.getClientById)
  .put(duenoOPersonal("id"), upload.single("image"), clientController.updateClient)
  .delete(soloAdmin, clientController.deleteClient);

// El cliente edita su propio perfil (datos básicos, y opcionalmente su foto).
router
  .route("/:id/profile")
  .patch(duenoOPersonal("id"), upload.single("image"), clientController.updateClientProfile);

// Los productos que el cliente marcó con el corazón.
router
  .route("/:id/favorites")
  .get(duenoOPersonal("id"), clientController.getFavorites)
  .patch(duenoOPersonal("id"), clientController.toggleFavorite);

// El cliente gestiona su lista de direcciones de entrega.
router
  .route("/:id/addresses")
  .patch(duenoOPersonal("id"), clientController.updateAddresses);

// El cliente actualiza sus preferencias de notificación.
router
  .route("/:id/notifications")
  .patch(duenoOPersonal("id"), clientController.updateNotifications);

// El teléfono registra (o da de baja) el token con el que le llegan los avisos.
router
  .route("/:id/push-token")
  .patch(duenoOPersonal("id"), clientController.updatePushToken);

// El cliente gestiona sus métodos de pago (datos no sensibles).
router
  .route("/:id/payment-methods")
  .patch(duenoOPersonal("id"), clientController.updatePaymentMethods);

export default router;
