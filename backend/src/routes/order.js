import express from "express";
import orderController from "../controller/orderController.js";
import uploadPrint from "../utils/printUpload.js";
import { soloPersonal, soloCliente, conSesion } from "../middlewares/validarSesion.js";
import { identificarComprador } from "../middlewares/identificarComprador.js";

// ── Documentación de la API (Swagger) ──
// Va agrupada aquí y no pegada a cada ruta porque swagger-jsdoc rastrea el archivo entero: dónde
// esté no cambia lo que documenta, y así el código de las rutas se lee sin interrupciones.

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Pedidos de clientes (checkout, impresión, historial y cambio de estado).
 */

/**
 * @swagger
 * /order:
 *   get:
 *     summary: Lista todos los pedidos (pantalla del empleado)
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pagado, preparando, en_camino, listo, entregado, cancelado]
 *         description: Filtra por estado del pedido.
 *     responses:
 *       200:
 *         description: Arreglo de pedidos, con clientId (fullName, email, phoneNumber) e items.productId poblados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       500:
 *         description: Error interno del servidor.
 *   post:
 *     summary: Crea un pedido (checkout). Otorga puntos de fidelidad según la configuración activa.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderCreateInput'
 *     responses:
 *       201:
 *         description: Pedido creado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pedido creado
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 pointsEarned:
 *                   type: number
 *       400:
 *         description: clientId e items son requeridos.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /order/print:
 *   post:
 *     summary: Crea un pedido de impresión (sube archivo y calcula el precio según el servicio)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/PrintOrderInput'
 *     responses:
 *       201:
 *         description: Pedido de impresión creado. Intenta enviarse por correo a la impresora (emailedToPrinter indica si tuvo éxito).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pedido de impresión creado
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 emailedToPrinter:
 *                   type: boolean
 *       400:
 *         description: Faltan clientId/serviceId, o no se subió el archivo a imprimir.
 *       404:
 *         description: Servicio de impresión no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /order/client/{clientId}:
 *   get:
 *     summary: Lista los pedidos de un cliente (su historial), del más reciente al más antiguo
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del cliente.
 *     responses:
 *       200:
 *         description: Arreglo de pedidos del cliente, con items.productId poblado.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @swagger
 * /order/{id}/status:
 *   put:
 *     summary: Cambia el estado de un pedido (preparando, entregado, cancelado, pagado)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del pedido.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderStatusInput'
 *     responses:
 *       200:
 *         description: Estado actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Estado actualizado
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Estado inválido.
 *       404:
 *         description: Pedido no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */


const router = express.Router();

// Estas rutas estaban TODAS abiertas. Devolvían, a quien preguntara, el historial de compras de
// cualquier cliente con su dirección y sus coordenadas, y dejaban cambiar el estado de un pedido
// ajeno.

router
  .route("/")
  // Todos los pedidos de la tienda: la pantalla del empleado.
  .get(soloPersonal, orderController.getOrders)
  // Crear pedido. Ver identificarComprador: el cliente por su cookie, el
  // kiosco por su código, y el personal a nombre de quien cobra en caja.
  .post(identificarComprador, orderController.createOrder);

// Pedido de impresión. El identificador va DESPUÉS de multer a propósito: hasta que multer no
// procesa el multipart, req.body viene vacío y el código del kiosco no se podría leer.
router
  .route("/print")
  .post(uploadPrint.single("file"), identificarComprador, orderController.createPrintOrder);

// Cuánto tardamos de verdad en llegar a un punto, según las entregas pasadas. Va ANTES de /:id/...
// para que "tiempo-zona" no se lea como un id de pedido.
router
  .route("/tiempo-zona")
  .get(orderController.getTiempoPorZona);

// El historial de un cliente. El controlador comprueba que sea el suyo.
router
  .route("/client/:clientId")
  .get(conSesion, orderController.getOrdersByClient);

// UN pedido completo (pantalla de estado del pedido). conSesion deja pasar a quien tenga sesión;
// el controlador comprueba además que el pedido sea suyo.
router
  .route("/:id")
  .get(conSesion, orderController.getOrderById);

router
  .route("/:id/status")
  .put(soloPersonal, orderController.updateOrderStatus);

// El cliente valora el servicio de entrega de SU pedido. conSesion deja pasar a quien tenga
// sesión; el controlador comprueba además que el pedido sea suyo y que ya esté entregado.
/**
 * @swagger
 * /order/{id}/cancelar:
 *   patch:
 *     summary: El cliente cancela su propio pedido mientras está por preparar
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Por qué lo cancela (mínimo 4 caracteres).
 *     responses:
 *       200:
 *         description: Pedido cancelado; stock, saldo y puntos devueltos.
 *       400:
 *         description: Falta el motivo, o el pedido ya no está por preparar.
 *       403:
 *         description: El pedido es de otro cliente.
 *       409:
 *         description: La tienda lo empezó a preparar en ese momento.
 */
router
  .route("/:id/cancelar")
  .patch(soloCliente, orderController.cancelarPorCliente);

router
  .route("/:id/rating")
  .patch(conSesion, orderController.rateService);

// Seguimiento en vivo: el repartidor escribe su punto, el cliente lo lee. Escribir es del
// personal; leer lo necesita el cliente que está esperando su pedido, y el controlador comprueba
// que el pedido sea suyo.
router
  .route("/:id/courier")
  .get(conSesion, orderController.getCourierPosition)
  .put(soloPersonal, orderController.updateCourierPosition);

export default router;
