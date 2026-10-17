// LAS DESCARGAS DEL PANEL EN LA APP — descargasPanel.js
// Los reportes del panel (el PDF del Dashboard, el inventario, el recordatorio para el calendario)
// se arman en el navegador y se "descargan" con un enlace a un blob.

import crypto from "crypto";

export const VIDA_DE_LA_DESCARGA_MS = 2 * 60 * 1000;
const USOS_MAXIMOS = 4;
// Topes para que esto no se coma la memoria del servidor.
export const TAMANO_MAXIMO = 10 * 1024 * 1024;
const TOTAL_MAXIMO = 60 * 1024 * 1024;

// Lo que se puede bajar: lo que arma el panel, nada más.
export const TIPOS_PERMITIDOS = ["application/pdf", "text/calendar", "text/csv"];

const descargas = new Map(); // clave → { nombre, tipo, datos, vence, usos }

const limpiarVencidas = (ahora) => {
  for (const [clave, d] of descargas) if (d.vence <= ahora || d.usos >= USOS_MAXIMOS) descargas.delete(clave);
};

const ocupado = () => [...descargas.values()].reduce((suma, d) => suma + d.datos.length, 0);

// "Reporte LA635 (oct).pdf" → "Reporte-LA635-oct-.pdf": sin rutas ni comillas.
export const nombreSeguro = (nombre) => {
  const limpio = String(nombre ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(0, 80);
  return limpio || "archivo";
};

// Guarda un archivo y devuelve { clave } o { error }. `tipo` es el Content-Type con el que llegó;
// se le quita lo de "; charset=…".
export const guardarDescarga = ({ nombre, tipo, datos }, ahora = Date.now()) => {
  const tipoLimpio = String(tipo ?? "").split(";")[0].trim().toLowerCase();
  if (!TIPOS_PERMITIDOS.includes(tipoLimpio)) return { error: "Ese tipo de archivo no se puede descargar" };
  if (!Buffer.isBuffer(datos) || !datos.length) return { error: "No llegó ningún archivo" };
  if (datos.length > TAMANO_MAXIMO) return { error: "El archivo es demasiado grande" };

  limpiarVencidas(ahora);
  if (ocupado() + datos.length > TOTAL_MAXIMO) return { error: "Hay demasiadas descargas a la vez. Intente en un minuto." };

  const clave = crypto.randomBytes(24).toString("hex");
  descargas.set(clave, { nombre: nombreSeguro(nombre), tipo: tipoLimpio, datos, vence: ahora + VIDA_DE_LA_DESCARGA_MS, usos: 0 });
  return { clave };
};

// El archivo, o null si no existe, ya venció o ya se bajó las veces permitidas.
export const tomarDescarga = (clave, ahora = Date.now()) => {
  if (!/^[0-9a-f]{48}$/.test(String(clave ?? ""))) return null;
  const d = descargas.get(clave);
  if (!d || d.vence <= ahora || d.usos >= USOS_MAXIMOS) {
    descargas.delete(clave);
    return null;
  }
  d.usos += 1;
  return d;
};
