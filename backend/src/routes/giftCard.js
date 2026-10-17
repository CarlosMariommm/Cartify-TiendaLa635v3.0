import express from 'express';
import giftCardController from '../controller/giftCardController.js';

import { soloAdmin, conSesion, duenoOPersonal } from '../middlewares/validarSesion.js';

const router = express.Router();

// Admin: crear y listar tarjetas.
// La lista de tarjetas trae los CÓDIGOS, y un código de tarjeta de regalo es dinero: quien lo lee,
// lo canjea. Emitirlas, igual.
router.route("/")
    .get(soloAdmin, giftCardController.getGiftCards)
    .post(soloAdmin, giftCardController.insertGiftCard);

// Cliente: canjear un código y consultar su saldo.
// Canjear es cosa de quien tiene la tarjeta en la mano, pero con cuenta: el
// saldo tiene que ir a parar a alguien.
router.route("/redeem")
    .post(conSesion, giftCardController.redeemGiftCard);

// El saldo de cada quien es suyo.
router.route("/balance/:clientId")
    .get(duenoOPersonal("clientId"), giftCardController.getBalance);

router.route("/:id")
    .delete(soloAdmin, giftCardController.deleteGiftCard);

export default router;
