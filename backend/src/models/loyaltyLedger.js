// Ledger (libro mayor) de puntos de fidelidad — vencimiento por LOTES. Cada compra que otorga
// puntos crea un lote aquí, con su fecha de vencimiento. Los puntos "disponibles" del cliente =
// suma de los lotes cuyo venceEn aún no pasó.

import { Schema, model } from 'mongoose';

const loyaltyLedgerSchema = new Schema({
    clientId: { type: Schema.Types.ObjectId, ref: 'clientModel', required: true },
    points: { type: Number, required: true },
    used: { type: Number, default: 0 },
    earnedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'orderModel' },
}, {
    timestamps: true,
});

export default model('loyaltyLedgerModel', loyaltyLedgerSchema, 'LoyaltyLedger');
