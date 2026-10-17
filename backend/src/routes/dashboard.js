import express from "express";
import dashboardController from "../controller/dashboardController.js";

import { soloAdmin, soloPersonal } from "../middlewares/validarSesion.js";

const router = express.Router();

// Las cifras del negocio: ventas, inversión y ganancia. De la tienda y de nadie más.
router.use(soloPersonal);

// GET /api/dashboard/summary?periodo=semana|mes|anio  -> todo el resumen
router.route("/summary").get(dashboardController.getSummary);

// GET /api/dashboard/chart?periodo=...  -> solo la gráfica (cambio de periodo)
router.route("/chart").get(dashboardController.getChart);

// GET /api/dashboard/pronostico[?forzar=1][&demo=1] -> lo que se va a vender, cuándo se acaba cada
// producto y qué pedirle a cada proveedor (con demo=1, de la demostración). Solo el administrador:
// son compras y proveedores. Ver utils/pronostico.js.
router.route("/pronostico").get(soloAdmin, dashboardController.getPronostico);

export default router;
