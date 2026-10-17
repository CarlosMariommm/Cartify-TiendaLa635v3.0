import loyaltyLedgerModel from "../models/loyaltyLedger.js";

const loyaltyController = {};

// Resumen de puntos del cliente (para su tarjeta de fidelidad): - available: saldo disponible =
// suma de lotes NO vencidos - nextExpiry: la próxima fecha en que vence un lote - expiringSoon:
// puntos que vencen dentro de los próximos 30 días
loyaltyController.getSummary = async (req, res) => {
  try {
    const now = new Date();

    // Solo los lotes que todavía no vencen, ordenados por el que vence primero.
    const lotes = await loyaltyLedgerModel
      .find({ clientId: req.params.clientId, expiresAt: { $gt: now } })
      .sort({ expiresAt: 1 });

    // Solo cuenta lo que NO se ha canjeado todavía (points - used).
    const saldo = (l) => l.points - (l.used || 0);

    const available = lotes.reduce((acc, l) => acc + saldo(l), 0);
    const conSaldo = lotes.filter((l) => saldo(l) > 0);
    const nextExpiry = conSaldo.length ? conSaldo[0].expiresAt : null;

    // Puntos que vencen dentro de 30 días (para avisarle al cliente).
    const en30 = new Date(now);
    en30.setDate(en30.getDate() + 30);
    const expiringSoon = conSaldo
      .filter((l) => l.expiresAt <= en30)
      .reduce((acc, l) => acc + saldo(l), 0);

    return res.status(200).json({ available, nextExpiry, expiringSoon });

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default loyaltyController;
