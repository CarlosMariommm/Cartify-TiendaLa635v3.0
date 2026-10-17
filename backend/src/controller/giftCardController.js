import crypto from "crypto";
import giftCardModel from "../models/giftCard.js";
import clientModel from "../models/client.js";

const giftCardController = {};

// Alfabeto sin caracteres que se confunden al dictar o al leer una tarjeta impresa: se van 0/O,
// 1/I/L y el 5/S. Quien recibe la tarjeta la teclea a mano, y "¿es cero o ele?" es una llamada al
// negocio.
const ALFABETO = "ABCDEFGHJKMNPQRTUVWXY2346789";

// Código tipo "635-A7K2-M9QX". Aleatorio de verdad (crypto), no correlativo:
// con GC-001, GC-002 cualquiera adivina el siguiente y canjea tarjetas ajenas.
const generarCodigo = () => {
  const bloque = (n) =>
    Array.from(crypto.randomBytes(n))
      .map((b) => ALFABETO[b % ALFABETO.length])
      .join("");
  return `635-${bloque(4)}-${bloque(4)}`;
};

/* ── Admin: crear tarjetas ── */
giftCardController.insertGiftCard = async (req, res) => {
  try {
    const { amount, cantidad, expiresAt, note } = req.body;

    const monto = Number(amount);
    if (!monto || monto <= 0) {
      return res.status(400).json({ message: "El monto debe ser mayor que 0" });
    }
    if (monto > 1000) {
      return res.status(400).json({ message: "El monto máximo por tarjeta es $1000" });
    }

    // Se pueden crear varias de un solo golpe (ej. 20 tarjetas de $5).
    const cuantas = Math.min(Math.max(1, Number(cantidad) || 1), 100);

    const creadas = [];
    for (let i = 0; i < cuantas; i++) {
      // Reintentamos por si el código sorteado ya existía. Con este alfabeto
      // es rarísimo, pero el índice único es el que manda y no queremos que
      // una colisión tumbe la creación entera.
      let guardada = null;
      for (let intento = 0; intento < 5 && !guardada; intento++) {
        try {
          guardada = await new giftCardModel({
            code: generarCodigo(),
            amount: monto,
            expiresAt: expiresAt || undefined,
            note,
          }).save();
        } catch (e) {
          if (e?.code !== 11000) throw e; // 11000 = código repetido
        }
      }
      if (guardada) creadas.push(guardada);
    }

    if (!creadas.length) {
      return res.status(500).json({ message: "No se pudieron generar las tarjetas" });
    }

    return res.status(201).json({
      message: `${creadas.length} tarjeta(s) creada(s)`,
      giftCards: creadas,
    });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/* ── Admin: listar ── */
giftCardController.getGiftCards = async (req, res) => {
  try {
    const tarjetas = await giftCardModel
      .find()
      .populate("redeemedBy", "fullName email")
      .sort({ createdAt: -1 });
    return res.status(200).json(tarjetas);
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/* ── Admin: anular una tarjeta que no se ha canjeado ── */
giftCardController.deleteGiftCard = async (req, res) => {
  try {
    const tarjeta = await giftCardModel.findById(req.params.id);
    if (!tarjeta) return res.status(404).json({ message: "Tarjeta no encontrada" });

    // Una tarjeta canjeada ya se convirtió en saldo de alguien: borrarla
    // dejaría ese saldo sin respaldo en la contabilidad.
    if (tarjeta.isRedeemed) {
      return res.status(400).json({
        message: "No se puede eliminar una tarjeta ya canjeada",
      });
    }

    await giftCardModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Tarjeta eliminada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/* ── Cliente: canjear ── */
giftCardController.redeemGiftCard = async (req, res) => {
  try {
    const { code, clientId } = req.body;
    if (!code || !clientId) {
      return res.status(400).json({ message: "Código y cliente son requeridos" });
    }

    const codigo = String(code).trim().toUpperCase();

    // EL CANJE, EN UNA SOLA OPERACIÓN ATÓMICA.
    // findOneAndUpdate busca y marca en el mismo paso, del lado de MongoDB.
    const ahora = new Date();
    const tarjeta = await giftCardModel.findOneAndUpdate(
      {
        code: codigo,
        isRedeemed: false,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: ahora } }],
      },
      { $set: { isRedeemed: true, redeemedBy: clientId, redeemedAt: ahora } },
      { new: true }
    );

    if (!tarjeta) {
      // No decimos cuál de los motivos fue: si respondiéramos "ya canjeada"
      // vs "no existe", alguien podría probar códigos y averiguar cuáles son
      // reales. Miramos el estado solo para dar un mensaje útil al dueño.
      const existente = await giftCardModel.findOne({ code: codigo });
      if (existente?.isRedeemed) {
        return res.status(400).json({ message: "Esa tarjeta ya fue canjeada" });
      }
      if (existente && existente.expiresAt && existente.expiresAt <= ahora) {
        return res.status(400).json({ message: "Esa tarjeta ya venció" });
      }
      return res.status(404).json({ message: "El código no es válido" });
    }

    // Ya con la tarjeta marcada, le sumamos el saldo al cliente.
    const cliente = await clientModel.findByIdAndUpdate(
      clientId,
      { $inc: { balance: tarjeta.amount } },
      { new: true }
    );

    if (!cliente) {
      // El cliente no existe: devolvemos la tarjeta a su estado original para
      // que no quede quemada sin que nadie recibiera el saldo.
      await giftCardModel.findByIdAndUpdate(tarjeta._id, {
        $set: { isRedeemed: false },
        $unset: { redeemedBy: "", redeemedAt: "" },
      });
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    return res.status(200).json({
      message: `Se agregaron $${tarjeta.amount.toFixed(2)} a tu saldo`,
      amount: tarjeta.amount,
      balance: cliente.balance,
    });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/* ── Cliente: consultar su saldo ── */
giftCardController.getBalance = async (req, res) => {
  try {
    const cliente = await clientModel.findById(req.params.clientId).select("balance");
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });
    return res.status(200).json({ balance: cliente.balance || 0 });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default giftCardController;
