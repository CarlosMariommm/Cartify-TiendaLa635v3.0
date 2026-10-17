// EL PASE DEL PANEL — pasesPanel.js
// El administrador puede abrir el panel web DENTRO de la app del teléfono
// (movil/src/pages/personal/PanelWeb.js).

import crypto from "crypto";

export const VIDA_DEL_PASE_MS = 60 * 1000;

const pases = new Map(); // huella → { id, vence }

const huellaDe = (pase) => crypto.createHash("sha256").update(String(pase)).digest("hex");

const limpiarVencidos = (ahora) => {
  for (const [huella, pase] of pases) if (pase.vence <= ahora) pases.delete(huella);
};

// Un pase nuevo para la cuenta `id`. Devuelve el pase (64 letras y números).
export const crearPase = (id, ahora = Date.now()) => {
  limpiarVencidos(ahora);
  const pase = crypto.randomBytes(32).toString("hex");
  pases.set(huellaDe(pase), { id: String(id), vence: ahora + VIDA_DEL_PASE_MS });
  return pase;
};

// El id de quien lo pidió, o null si no existe, ya se usó o venció.
export const canjearPase = (pase, ahora = Date.now()) => {
  if (!/^[0-9a-f]{64}$/.test(String(pase ?? ""))) return null;
  const huella = huellaDe(pase);
  const guardado = pases.get(huella);
  pases.delete(huella);
  if (!guardado || guardado.vence <= ahora) return null;
  return guardado.id;
};
