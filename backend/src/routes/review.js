import express from "express";
import reviewController from "../controller/reviewController.js";

import { conSesion } from "../middlewares/validarSesion.js";

const router = express.Router();

// Las opiniones se LEEN en la ficha del producto sin cuenta, como en cualquier tienda. Escribirlas
// y borrarlas necesita sesión: abierto, cualquiera dejaba reseñas a nombre de otro o borraba las
// que no le gustaran.

router
  .route("/")
  .post(conSesion, reviewController.upsert);

router
  .route("/:productId")
  .get(reviewController.getByProduct)
  .delete(conSesion, reviewController.remove);

export default router;
