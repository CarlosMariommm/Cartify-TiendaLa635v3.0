// PEDIDOS — pedidosApi.js
// Los pedidos de un cliente: los que ya hizo y el que está haciendo.

import { peticion } from './api';
import { esPedidoSimulado, pedidoSimulado, repartidorSimulado, simulacionActiva } from '../utils/simulacionPedido';

// En desarrollo, con el simulador encendido (utils/simulacionPedido.js), la lista lleva adelante
// el pedido de prueba. Nada de eso existe en el servidor.
export const getPedidosDeCliente = async (clienteId) => {
  const reales = await peticion(`/order/client/${clienteId}`);
  if (!__DEV__ || !simulacionActiva()) return reales;
  const lista = Array.isArray(reales) ? reales : [];
  return [pedidoSimulado(), ...lista];
};

export const crearPedido = (datos) => peticion('/order', { metodo: 'POST', cuerpo: datos });

// El cliente cancela SU pedido, solo mientras está por preparar (el servidor lo revisa). Devuelve
// { order } ya cancelado, con lo devuelto en `reembolso`. Ver orderController.cancelarPorCliente.
export const cancelarPedido = (pedidoId, motivo) =>
  peticion(`/order/${pedidoId}/cancelar`, { metodo: 'PATCH', cuerpo: { motivo } });

// Cuánto se ha tardado de verdad en llegar a ese punto, según las entregas ya hechas por ahí.
export const getTiempoPorZona = (lat, lng) =>
  peticion(`/order/tiempo-zona?lat=${lat}&lng=${lng}`);

// Dónde va el repartidor y el estado del pedido; lo consulta useSeguimientoEnVivo cada pocos
// segundos. El del pedido de prueba sale del simulador, no del servidor.
export const getCourierPosition = (pedidoId) =>
  __DEV__ && esPedidoSimulado(pedidoId)
    ? Promise.resolve(repartidorSimulado())
    : peticion(`/order/${pedidoId}/courier`);
