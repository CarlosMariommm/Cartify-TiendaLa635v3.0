// IMPRESIONES — impresionesApi.js
// Trae los formatos con su precio y los materiales disponibles, y crea el pedido de impresión con
// su archivo, igual que la web.

import { peticion } from './api';

export const getFormatosImpresion = () => peticion('/printService');

export const getMaterialesImpresion = () => peticion('/printMaterial');

// `datos` ya viene armado como FormData (con el archivo adentro) — ver Impresiones.js.
// `peticion()` reconoce un FormData y lo manda tal cual, sin forzarle un Content-Type: JSON (igual
// que ya hace Register.js con la foto de perfil).
export const crearPedidoImpresion = (datosFormulario) =>
  peticion('/order/print', { metodo: 'POST', cuerpo: datosFormulario });
