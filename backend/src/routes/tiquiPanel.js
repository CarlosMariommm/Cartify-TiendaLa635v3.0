import express from "express";
import rateLimit from "express-rate-limit";
import tiquiPanelController from "../controller/tiquiPanelController.js";
import { soloPersonal } from "../middlewares/validarSesion.js";

// Tiqui del panel: la asistente del equipo. Es OTRA asistente que la de la tienda
// (/api/ai/asistente) y vive en su propia ruta, cerrada al personal: sabe cuánto vende la tienda y
// a quién le debe. Ver tiquiPanelController.

const router = express.Router();

router.use(soloPersonal);

// Su propio tope, aparte del de la tienda: una charla larga en el panel no le
// gasta el cupo a un cliente que está comprando desde la misma red.
const topeCharla = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiadas preguntas seguidas. Espera un momento." },
});

/**
 * @swagger
 * /api/tiqui-panel:
 *   post:
 *     summary: Habla con Tiqui del panel (solo personal)
 *     tags: [Tiqui del panel]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [frase]
 *             properties:
 *               frase: { type: string, example: "¿Cómo vamos hoy?" }
 *               historial:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     quien: { type: string, enum: [tiqui, persona] }
 *                     texto: { type: string }
 *               pantalla: { type: string, example: "/pedidos" }
 *     responses:
 *       200:
 *         description: Lo que dice Tiqui y, si hace falta, a qué pantalla lleva.
 *       401:
 *         description: Sin sesión de personal.
 */
router.post("/", topeCharla, tiquiPanelController.conversar);

/**
 * @swagger
 * /api/tiqui-panel/confirmar:
 *   post:
 *     summary: Aplica un cambio que Tiqui propuso y la persona confirmó (solo personal)
 *     tags: [Tiqui del panel]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, description: "La propuesta firmada que devolvió POST /api/tiqui-panel (dura 5 minutos)." }
 *     responses:
 *       200:
 *         description: "{ ok, respuesta, tipo } — si se aplicó y qué dice Tiqui."
 */
router.post("/confirmar", topeCharla, tiquiPanelController.confirmar);

/**
 * @swagger
 * /api/tiqui-panel/listo:
 *   get:
 *     summary: Despierta el servidor y dice si hay voz de Tiqui
 *     tags: [Tiqui del panel]
 *     responses:
 *       200:
 *         description: "{ listo: true, voz: boolean, consejo: string } — consejo: solo al administrador, lo más importante para vender mejor (vacío si no hay nada)"
 */
router.get("/listo", tiquiPanelController.listo);

export default router;
