import express from "express";
import kioskController from "../controller/kioskController.js";

import { soloCliente } from "../middlewares/validarSesion.js";

const router = express.Router();

// Casi todo aquí es PÚBLICO a propósito: el kiosco no tiene sesión ni debe tenerla —esa es la idea
// entera— así que abrir la sesión, consultar su estado y cerrarla las hace una pantalla anónima.

// El kiosco abre una sesión y muestra su QR.
router.route("/sesion")
    .post(kioskController.crearSesion);

// El kiosco pregunta si ya la escanearon; el teléfono la reclama.
router.route("/sesion/:codigo")
    .get(kioskController.estadoSesion)
    .put(soloCliente, kioskController.vincularSesion);

// Ya se cobró: la sesión se cierra para que el mismo QR no sirva dos veces.
router.route("/sesion/:codigo/cerrar")
    .put(kioskController.cerrarSesion);

export default router;
