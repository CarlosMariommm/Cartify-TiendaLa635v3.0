// SIMULADOR DE PEDIDO — solo en desarrollo
// Simula un pedido a domicilio de punta a punta (burbuja, mapa, "ya casi", código y avisos) sin
// escribir nada en la base.

import { avisoLocal } from './notificaciones';
import { distanciaMetros } from './geo';

// El id del pedido de prueba. No es un id de Mongo: si por error llegara al
// servidor, lo rechazaría sin tocar nada.
export const ID_SIMULADO = 'pedido-de-prueba';
export const esPedidoSimulado = (id) => id === ID_SIMULADO;

// El recorrido, en segundos desde que se arranca. Comprimido: un pedido de verdad tarda media
// hora; aquí dos minutos y medio. El viaje dura 90 segundos para que el repartidor se vea avanzar
// varias veces en el mapa (la app pregunta su posición cada 10).
const EN_CAMINO_EN = 35;
const DURACION_VIAJE = 90;
const RECORRIDOS = {
  delivery: [['preparando', 15], ['en_camino', 35], ['entregado', 35 + 90 + 5]],
  retiro: [['preparando', 15], ['listo', 35], ['entregado', 75]],
};

// De dónde sale el repartidor respecto a la casa: unos 1.6 km al noreste.
const SALIDA = { lat: 0.0115, lng: 0.0105 };
// Si no hay una dirección de verdad con coordenadas, una en San Salvador.
const DESTINO_POR_DEFECTO = { lat: 13.7035, lng: -89.2244 };

// Los textos que manda el servidor en cada paso (TEXTOS_PEDIDO en
// backend/src/utils/avisosCliente.js). Si allá cambian, se cambian aquí.
export const TEXTOS_PEDIDO = {
  preparando: { titulo: 'Estamos preparando tu pedido', cuerpo: 'Ya estamos juntando tus productos.' },
  en_camino: {
    titulo: 'Tu pedido va en camino',
    cuerpo: 'Ya salió de la tienda. Puedes verlo en el mapa y saber cuándo salir a la puerta.',
  },
  listo: { titulo: 'Tu pedido está listo', cuerpo: 'Ya puedes pasar a recogerlo a la tienda.' },
  entregado: { titulo: 'Tu pedido llegó', cuerpo: '¡Que lo disfrutes! Si quieres, califica la entrega desde la app.' },
};

let sim = null;
const relojes = [];
const oyentes = new Set();

const avisarCambio = () => oyentes.forEach((fn) => fn());

// Para que quien muestra los pedidos se entere al instante de cada paso, sin
// esperar a su siguiente consulta.
export const suscribirseASimulacion = (fn) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};

export const simulacionActiva = () => !!sim;

const segundos = () => (Date.now() - sim.inicio) / 1000;

const estadoActual = () => {
  const s = segundos();
  let estado = 'pagado';
  for (const [paso, en] of RECORRIDOS[sim.tipo]) if (s >= en) estado = paso;
  return estado;
};

// Arranca un pedido de prueba. `plantilla` es un pedido real del cliente (si tiene alguno): de ahí
// salen los productos y el total, para que se vea como uno de verdad. `destino` es a dónde va.
export const iniciarSimulacion = ({ plantilla = null, destino = null, tipo = 'delivery' } = {}) => {
  detenerSimulacion();
  const casa =
    destino?.lat != null && destino?.lng != null
      ? destino
      : plantilla?.deliveryLat != null && plantilla?.deliveryLng != null
        ? { lat: plantilla.deliveryLat, lng: plantilla.deliveryLng }
        : DESTINO_POR_DEFECTO;
  sim = {
    inicio: Date.now(),
    tipo: tipo === 'retiro' ? 'retiro' : 'delivery',
    plantilla,
    destino: casa,
    salida: { lat: casa.lat + SALIDA.lat, lng: casa.lng + SALIDA.lng },
  };

  const recorrido = RECORRIDOS[sim.tipo];
  recorrido.forEach(([paso, en]) => {
    relojes.push(setTimeout(() => {
      // Cada cambio de paso se anuncia a quien muestra el pedido…
      avisarCambio();
      // …y suena el aviso que manda el servidor en ese paso (el retiro no se
      // avisa al entregarse: se entrega en el mostrador, con la persona ahí).
      if (paso === 'entregado' && sim?.tipo === 'retiro') return;
      avisoLocal({
        ...TEXTOS_PEDIDO[paso],
        canal: 'pedidos',
        datos: { tipo: paso === 'en_camino' ? 'pedidoEnCamino' : 'pedido', estado: paso, pedidoId: ID_SIMULADO },
      });
    }, en * 1000));
  });

  // Al terminar, el pedido de prueba se va solo un rato después.
  const fin = recorrido[recorrido.length - 1][1];
  relojes.push(setTimeout(detenerSimulacion, (fin + 60) * 1000));

  avisarCambio();
};

export const detenerSimulacion = () => {
  relojes.splice(0).forEach(clearTimeout);
  const habia = !!sim;
  sim = null;
  if (habia) avisarCambio();
};

// El pedido de prueba, con la misma forma que los del servidor.
export const pedidoSimulado = () => {
  if (!sim) return null;
  const p = sim.plantilla || {};
  const items = Array.isArray(p.items) && p.items.length
    ? p.items
    : [{ productId: null, name: 'Manzana', price: 5.2, amount: 2 }];
  const total = typeof p.total === 'number' ? p.total : items.reduce((t, i) => t + (i.price || 0) * (i.amount || 1), 0);
  return {
    ...p,
    _id: ID_SIMULADO,
    status: estadoActual(),
    deliveryType: sim.tipo === 'retiro' ? 'retiro' : 'delivery',
    deliveryAddress: p.deliveryAddress || 'Dirección de prueba',
    deliveryLat: sim.destino.lat,
    deliveryLng: sim.destino.lng,
    deliveryCode: '4827',
    createdAt: new Date(sim.inicio).toISOString(),
    items,
    total,
    // Sin valoraciones: calificar un pedido de prueba escribiría reseñas de verdad.
    rating: undefined,
    simulado: true,
  };
};

// El camino del repartidor de prueba: dos calles en L y no una línea recta, para que se vea la
// ruta como la dibuja el servidor (ver backend/src/utils/rutaReparto.js). Devuelve dónde va según
// el avance (0 a 1) y la ruta que le falta, con la misma forma que la del servidor.
const sobreElCamino = (avance) => {
  const camino = [sim.salida, { lat: sim.salida.lat, lng: sim.destino.lng }, sim.destino];
  const tramos = camino.slice(1).map((p, i) => distanciaMetros(camino[i], p) || 0);
  const total = tramos.reduce((suma, m) => suma + m, 0);
  let recorrido = total * avance;
  let i = 0;
  while (i < tramos.length - 1 && recorrido > tramos[i]) {
    recorrido -= tramos[i];
    i += 1;
  }
  const t = tramos[i] ? Math.min(1, recorrido / tramos[i]) : 1;
  const desde = camino[i];
  const hasta = camino[i + 1];
  const punto = { lat: desde.lat + (hasta.lat - desde.lat) * t, lng: desde.lng + (hasta.lng - desde.lng) * t };
  const metros = Math.round(total * (1 - avance));
  return {
    punto,
    ruta: {
      puntos: [[punto.lng, punto.lat], ...camino.slice(i + 1).map((p) => [p.lng, p.lat])],
      metros,
      // A 18 km/h, la moto de barrio de utils/geo.js.
      segundos: Math.round(metros / 5),
    },
  };
};

// Lo mismo que devuelve GET /order/:id/courier, con el repartidor avanzando.
export const repartidorSimulado = () => {
  if (!sim) return { status: 'cancelado', deliveryType: 'delivery', destino: null, courier: null, ruta: null };
  if (sim.tipo === 'retiro') return { status: estadoActual(), deliveryType: 'retiro', destino: null, courier: null, ruta: null };
  const status = estadoActual();
  let courier = null;
  let ruta = null;
  if (status === 'en_camino') {
    const avance = Math.min(1, (segundos() - EN_CAMINO_EN) / DURACION_VIAJE);
    const enCamino = sobreElCamino(avance);
    ruta = enCamino.ruta;
    courier = {
      active: true,
      lat: enCamino.punto.lat,
      lng: enCamino.punto.lng,
      name: 'Carlos (prueba)',
      updatedAt: new Date().toISOString(),
    };
  }
  return { status, deliveryType: 'delivery', destino: sim.destino, courier, ruta };
};

// Los otros dos avisos que manda el servidor, para ver cómo se ven. Mismos textos y la misma carga
// que en avisosCliente.js y avisoPromo.js.
export const probarAvisoProductosNuevos = () =>
  avisoLocal({
    titulo: '3 productos nuevos',
    cuerpo: 'Churritos Diana, Jugo de naranja, Pan dulce',
    datos: { tipo: 'productosNuevos' },
  });

// Con una promo de verdad de la tienda, para que al tocarlo haya qué abrir.
export const probarAvisoPromo = (promo) =>
  avisoLocal({
    titulo: promo?.title || 'Nueva promoción',
    cuerpo: promo?.promoDescription || 'Aprovéchela en la tienda.',
    datos: { tipo: 'promo', promoId: String(promo?._id || '') },
  });
