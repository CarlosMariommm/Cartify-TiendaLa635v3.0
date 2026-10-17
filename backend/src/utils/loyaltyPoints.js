import loyaltyLedgerModel from "../models/loyaltyLedger.js";
import loyaltyConfigModel from "../models/loyaltyConfig.js";

// Utilidades de puntos de fidelidad, compartidas entre controladores. Aquí vive la regla
// importante: al canjear se gastan PRIMERO los puntos que están más cerca de vencer (FIFO por
// fecha de vencimiento), para que al cliente no se le pierdan.

// La config del programa; si no existe todavía, la crea con sus defaults.
export const getLoyaltyConfig = async () => {
  let config = await loyaltyConfigModel.findOne();
  if (!config) config = await loyaltyConfigModel.create({});
  return config;
};

// Lotes que aún sirven: no vencidos y con saldo por usar.
const lotesDisponibles = (clientId) =>
  loyaltyLedgerModel
    .find({ clientId, expiresAt: { $gt: new Date() } })
    .sort({ expiresAt: 1 }); // el que vence primero, primero

// Cuántos puntos puede usar el cliente ahora mismo.
export const puntosDisponibles = async (clientId) => {
  const lotes = await lotesDisponibles(clientId);
  return lotes.reduce((acc, l) => acc + (l.points - (l.used || 0)), 0);
};

// Descuenta `puntos` del ledger, gastando primero los que vencen antes. Devuelve cuántos puntos se
// lograron consumir realmente.
export const consumirPuntos = async (clientId, puntos) => {
  let restantes = puntos;
  const lotes = await lotesDisponibles(clientId);

  for (const lote of lotes) {
    if (restantes <= 0) break;
    const saldo = lote.points - (lote.used || 0);
    if (saldo <= 0) continue;

    const aUsar = Math.min(saldo, restantes);
    lote.used = (lote.used || 0) + aUsar;
    await lote.save();
    restantes -= aUsar;
  }

  return puntos - restantes;
};
