import { Package, ChefHat, Bike, Check, Store } from 'lucide-react-native';
import { COLORES_OSCURO } from '../theme/colores';
import { tAhora } from './idioma';

// LOS PASOS DE UN PEDIDO — pasosPedido.js
// Por dónde va un pedido, escrito UNA sola vez. Copia de `frontend/src/utils/pasosPedido.js`, con
// lucide-react-native en vez de lucide-react — mismos iconos, mismo trazo.

export const PASOS_TODOS = [
  // `pose`: cómo sale Tiqui en ese paso (components/Tiqui/Mascota.js), igual que en la web.
  { id: 'pagado', label: 'Recibido', detalle: 'Tu pedido entró a la tienda', Icono: Package, pose: 'recibido' },
  { id: 'preparando', label: 'Preparando', detalle: 'Están juntando tus productos', Icono: ChefHat, pose: 'preparando' },
  { id: 'en_camino', label: 'En camino', detalle: 'Un repartidor va para tu casa', Icono: Bike, pose: 'en-camino' },
  // Solo retiro en la tienda: el aviso de "ya puede pasar por él".
  { id: 'listo', label: 'Listo para recoger', detalle: 'Ya puedes pasar por él a la tienda', Icono: Store, pose: 'entregado' },
  { id: 'entregado', label: 'Entregado', detalle: '¡Que lo disfrutes!', Icono: Check, pose: 'entregado' },
];

// La pose de Tiqui para un estado cualquiera, incluido "cancelado", que no es un paso de la lista
// (un pedido cancelado no avanza a ningún lado).
export const poseDeEstado = (estado) =>
  estado === 'cancelado'
    ? 'cancelado'
    : (PASOS_TODOS.find((p) => p.id === estado) || PASOS_TODOS[0]).pose;

// Los pasos que le tocan a ESTE pedido. "En camino" solo existe para domicilio: un retiro en el
// local no tiene a quién seguirle el mapa.
// Ya en el idioma de la tienda (ver utils/idioma.js): quien los pinta solo pone p.label.
export const pasosDe = (deliveryType) =>
  (deliveryType === 'delivery'
    ? PASOS_TODOS.filter((p) => p.id !== 'listo')
    : PASOS_TODOS.filter((p) => p.id !== 'en_camino')
  ).map((p) => ({ ...p, label: tAhora(p.label), detalle: tAhora(p.detalle) }));

// En qué paso está, como índice dentro de la lista que le toca. Devuelve 0 cuando el estado no
// está en la lista (un pedido recién creado) — eso es un respaldo, NO la forma de resolver un
// estado que falta: para eso está pasosDe.
export const indiceDePaso = (pasos, estado) => {
  const i = pasos.findIndex((p) => p.id === estado);
  return i === -1 ? 0 : i;
};

// La etiqueta y el color de cada estado, para las chapas de "Pagado", "Cancelado", etc.
export const ESTADOS_PEDIDO = {
  pagado: { texto: 'Pagado', color: '#2563EB', fondo: '#E8EFFD' },
  preparando: { texto: 'Preparando', color: '#D97706', fondo: '#FBF0DF' },
  en_camino: { texto: 'En camino', color: '#1D4ED8', fondo: '#E3EAFB' },
  listo: { texto: 'Listo para recoger', color: '#6D28D9', fondo: '#EFE8FB' },
  entregado: { texto: 'Entregado', color: '#16A34A', fondo: '#E4F5EA' },
  cancelado: { texto: 'Cancelado', color: '#DC2626', fondo: '#FBE7E7' },
};

// En modo oscuro las chapas salen de los colores de estado de la paleta oscura: un fondo pastel
// sobre negro deslumbra, y un azul oscuro sobre fondo oscuro no se lee.
const ESTADOS_PEDIDO_OSCURO = {
  pagado: { texto: 'Pagado', color: COLORES_OSCURO.infoVivo, fondo: COLORES_OSCURO.infoFondo },
  preparando: { texto: 'Preparando', color: COLORES_OSCURO.avisoVivo, fondo: COLORES_OSCURO.avisoFondo },
  en_camino: { texto: 'En camino', color: COLORES_OSCURO.infoVivo, fondo: COLORES_OSCURO.infoFondo },
  listo: { texto: 'Listo para recoger', color: '#C4B5FD', fondo: '#241B38' },
  entregado: { texto: 'Entregado', color: COLORES_OSCURO.exitoVivo, fondo: COLORES_OSCURO.exitoFondo },
  cancelado: { texto: 'Cancelado', color: COLORES_OSCURO.peligro, fondo: COLORES_OSCURO.peligroFondo },
};

// También ya traducidos: en el modo del personal tAhora es siempre español.
export const estadosPedido = (oscuro) => {
  const base = oscuro ? ESTADOS_PEDIDO_OSCURO : ESTADOS_PEDIDO;
  return Object.fromEntries(Object.entries(base).map(([k, e]) => [k, { ...e, texto: tAhora(e.texto) }]));
};

// sellosDeCancelacion: del pedido que devolvió el servidor al cancelar, solo el id, el estado y los
// sellos, igual que en la web. El texto de lo devuelto lo arma textoDevuelto, con `reembolso`.
export const sellosDeCancelacion = (pedido) => {
  const sellos = {};
  ['_id', 'status', 'cancelReason', 'cancelledAt', 'cancelledBy', 'cancelledByClient', 'reembolso'].forEach((k) => {
    if (pedido?.[k] !== undefined) sellos[k] = pedido[k];
  });
  return sellos;
};

// `antes`: dicho antes de cancelar ("Le devolvemos…"), para avisar qué pasará.
export const textoDevuelto = (pedido, { antes = false } = {}) => {
  const saldo = Number(pedido?.reembolso?.saldo) || 0;
  const puntos = Number(pedido?.reembolso?.puntos) || 0;
  const partes = [
    saldo > 0 ? tAhora('${monto} a tu saldo', { monto: saldo.toFixed(2) }) : '',
    puntos > 0 ? tAhora('{n} puntos', { n: puntos }) : '',
  ]
    .filter(Boolean);
  if (!partes.length) return '';
  const lista = partes.join(tAhora(' y '));
  return antes ? tAhora('Te devolvemos {lista}.', { lista }) : tAhora('Te devolvimos {lista}.', { lista });
};
