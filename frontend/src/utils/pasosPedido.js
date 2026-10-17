import { Package, ChefHat, Bike, Check, Store } from 'lucide-react';
import { tAhora } from './idioma';

// LOS PASOS DE UN PEDIDO — pasosPedido.js
// Por dónde va un pedido, escrito UNA sola vez.

// `pose` es la ilustración de la mascota para ese paso (ver components/UI/Mascota.jsx). El ícono
// sigue para la línea de tiempo, donde todo tiene que caber en un círculo chico.
export const PASOS_TODOS = [
  { id: 'pagado', label: 'Recibido', detalle: 'Tu pedido entró a la tienda', Icono: Package, pose: 'recibido' },
  { id: 'preparando', label: 'Preparando', detalle: 'Están juntando tus productos', Icono: ChefHat, pose: 'preparando' },
  { id: 'en_camino', label: 'En camino', detalle: 'Un repartidor va para tu casa', Icono: Bike, pose: 'en-camino' },
  // Solo retiro en la tienda: el aviso de "ya puede pasar por él".
  { id: 'listo', label: 'Listo para recoger', detalle: 'Ya puedes pasar por él a la tienda', Icono: Store, pose: 'entregado' },
  { id: 'entregado', label: 'Entregado', detalle: '¡Que lo disfrutes!', Icono: Check, pose: 'entregado' },
];

// La ilustración de un estado cualquiera, incluido "cancelado", que no es un paso de la lista (un
// pedido cancelado no avanza a ningún lado).
export const poseDeEstado = (estado) =>
  estado === 'cancelado'
    ? 'cancelado'
    : (PASOS_TODOS.find((p) => p.id === estado) || PASOS_TODOS[0]).pose;

// Los pasos que le tocan a ESTE pedido. "En camino" solo existe para domicilio: un retiro en el
// local no tiene a quién seguirle el mapa, y pintarle ese paso a alguien que va a pasar por su
// bolsa es prometerle un repartidor que no va a salir.
export const pasosDe = (deliveryType) =>
  deliveryType === 'delivery'
    ? PASOS_TODOS.filter((p) => p.id !== 'listo')
    : PASOS_TODOS.filter((p) => p.id !== 'en_camino');

// En qué paso está, como índice dentro de la lista que le toca. Devuelve 0 cuando el estado no
// está en la lista, que es lo que hay que hacer con un pedido recién creado.
export const indiceDePaso = (pasos, estado) => {
  const i = pasos.findIndex((p) => p.id === estado);
  return i === -1 ? 0 : i;
};

// sellosDeCancelacion: del pedido que devolvió el servidor al cancelar, solo el estado y los sellos,
// para mezclarlos con el que ya está en pantalla. textoDevuelto: "Te devolvimos $4.50 a tu
// saldo y 200 puntos." (vacío si no hubo nada que devolver).
export const sellosDeCancelacion = (pedido) => {
  const sellos = {};
  ['status', 'cancelReason', 'cancelledAt', 'cancelledBy', 'cancelledByClient', 'reembolso'].forEach((k) => {
    if (pedido?.[k] !== undefined) sellos[k] = pedido[k];
  });
  return sellos;
};

export const textoDevuelto = (pedido) => {
  const saldo = Number(pedido?.reembolso?.saldo) || 0;
  const puntos = Number(pedido?.reembolso?.puntos) || 0;
  const partes = [
    saldo > 0 ? tAhora('{monto} a tu saldo', { monto: `$${saldo.toFixed(2)}` }) : '',
    puntos > 0 ? tAhora('{n} puntos', { n: puntos }) : '',
  ].filter(Boolean);
  return partes.length ? tAhora('Te devolvimos {que}.', { que: partes.join(` ${tAhora('y')} `) }) : '';
};
