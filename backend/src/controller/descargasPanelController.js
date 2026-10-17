import { guardarDescarga, tomarDescarga } from "../utils/descargasPanel.js";

// LAS DESCARGAS DEL PANEL EN LA APP — descargasPanelController.js
// Ver utils/descargasPanel.js: el panel abierto dentro de la app sube aquí el reporte que armó y
// lo baja por una dirección de un solo rato, para que Android lo guarde en Descargas.

const descargasPanelController = {};

// POST /api/descargas?nombre=… — el cuerpo es el archivo tal cual.
descargasPanelController.guardar = (req, res) => {
  const { clave, error } = guardarDescarga({
    nombre: req.query.nombre,
    tipo: req.headers["content-type"],
    datos: req.body,
  });
  if (error) return res.status(400).json({ message: error });
  return res.status(200).json({ clave });
};

// GET /api/descargas/:clave/:nombre — el nombre va en la dirección para que
// Android le ponga ese nombre al archivo aunque no lea los encabezados.
descargasPanelController.entregar = (req, res) => {
  const descarga = tomarDescarga(req.params.clave);
  if (!descarga) {
    return res.status(404).json({ message: "La descarga venció. Vuelva a pedir el reporte." });
  }
  res.set({
    "Content-Type": descarga.tipo,
    "Content-Disposition": `attachment; filename="${descarga.nombre}"`,
    "Content-Length": String(descarga.datos.length),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  return res.status(200).send(descarga.datos);
};

export default descargasPanelController;
