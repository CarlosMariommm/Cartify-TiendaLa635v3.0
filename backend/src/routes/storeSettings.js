import express from "express";
import storeSettingsController from "../controller/storeSettingsController.js";
import upload from "../utils/cloudinaryConfig.js";

import { soloAdmin } from "../middlewares/validarSesion.js";

const router = express.Router();

// Leer los ajustes es público y tiene que serlo: de aquí salen el nombre, el logo y el orden de la
// portada que ve cualquiera que entre a la tienda. Escribirlos, no. Con el PUT abierto, un
// desconocido podía renombrarle la tienda, cambiarle el lema o apagarle la portada entera.
router
  .route("/")
  .get(storeSettingsController.getSettings)                   // GET  /api/storeSettings -> ajustes actuales
  .put(soloAdmin, storeSettingsController.updateSettings); // PUT  /api/storeSettings -> nombre, lema, portada, temporada

// El logo va por su propia puerta: cambiarlo es una acción sola y no tiene por qué obligar a
// reenviar el nombre, el lema y la portada entera. Multer sube la imagen a Cloudinary y el
// controlador solo guarda la URL que devuelve.
router
  .route("/logo")
  .put(soloAdmin, upload.single("logo"), storeSettingsController.updateLogo)
  .delete(soloAdmin, storeSettingsController.deleteLogo);

export default router;
