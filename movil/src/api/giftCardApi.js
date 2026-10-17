// TARJETAS DE REGALO Y SALDO — giftCardApi.js
// Consulta el saldo del cliente y canjea el código de una tarjeta de regalo.

import { peticion } from './api';

export const getSaldo = (clienteId) => peticion(`/giftCard/balance/${clienteId}`);

export const canjearTarjeta = (codigo, clienteId) =>
  peticion('/giftCard/redeem', {
    metodo: 'POST',
    cuerpo: { code: codigo, clientId: clienteId },
  });
