import express from 'express';
import rateLimit from 'express-rate-limit';
import aiController from '../controller/aiController.js';

import { soloPersonal } from "../middlewares/validarSesion.js";

const router = express.Router();

// Estas rutas gastan cuota de Gemini (y la voz, créditos de ElevenLabs): abiertas, cualquiera
// podía quemarle la cuota del día a la tienda con un bucle. Las del asistente se quedan públicas
// porque las usa el kiosco, que a propósito NO tiene sesión.
const topeCharla = rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Demasiadas frases seguidas. Espera un momento." },
});

// Redacta el texto de una promoción a partir de los productos seleccionados.
router.route("/promo-copy")
    .post(soloPersonal, aiController.generarCopyPromo);

// El asistente la toca al abrirse: despierta el servidor (Render se duerme),
// deja el catálogo en memoria y avisa si hay voz de Tiqui. No gasta IA.
router.route("/listo")
    .get(aiController.listo);

// Tiqui: entiende lo que pidió el cliente y devuelve qué hacer y qué decir.
// La usan la web y la app.
router.route("/asistente")
    .post(topeCharla, aiController.asistente);

// La voz de Tiqui (ElevenLabs). GET para que el <audio> la reproduzca
// mientras llega. Ver utils/vozTiqui.js.
router.route("/voz")
    .get(topeCharla, aiController.voz);

// La ruta vieja de la app: las versiones ya instaladas la siguen llamando,
// así que ahora contesta Tiqui. Las acciones nuevas que no conocen, las ignoran.
router.route("/entender-herramientas")
    .post(topeCharla, aiController.asistente);

// La ruta vieja de la web (una acción por turno). Queda para las pestañas
// que sigan abiertas con la versión anterior; se puede quitar más adelante.
router.route("/entender")
    .post(topeCharla, aiController.entenderPedido);

// Acomoda en su estante los productos que las reglas del frontend no supieron
// clasificar. Lo que resuelve queda guardado en el producto.
router.route("/clasificar")
    .post(soloPersonal, aiController.clasificarProductos);

export default router;
