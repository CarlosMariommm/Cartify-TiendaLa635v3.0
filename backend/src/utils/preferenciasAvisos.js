// QUÉ AVISOS QUIERE EL CLIENTE, Y POR DÓNDE — preferenciasAvisos.js
// Cada aviso se elige por separado en la app (la notificación del teléfono) y por correo.
// `notificationPrefs` los CORREOS.

export const AVISOS_CORREO = ["promociones", "nuevosProductos", "pedidoCerca"];

export const AVISOS_APP = [
  "promociones",
  "favoritosEnOferta",
  "nuevosProductos",
  "pedidoPreparando",
  "pedidoListo",
  "pedidoEntregado",
  "pedidoCancelado",
];

// Qué interruptor de la app gobierna cada paso del pedido. "En camino" y "listo para recoger" son
// el mismo momento para el cliente (ya puede esperarlo o ir por él), así que van juntos.
export const AVISO_DEL_ESTADO = {
  preparando: "pedidoPreparando",
  en_camino: "pedidoListo",
  listo: "pedidoListo",
  entregado: "pedidoEntregado",
  cancelado: "pedidoCancelado",
};

// Sin el campo es que nunca lo apagó: encendido.
export const quiereEnLaApp = (cliente, clave) => cliente?.avisosApp?.[clave] !== false;

// Del cuerpo de PATCH /client/:id/notifications al $set de la base. { app: { promociones: false }
// } apaga la notificación del teléfono { correo: { promociones: false } } apaga el correo {
// promociones: false } lo que mandan las versiones viejas de la web y la app: era el correo
export const cambiosDePreferencias = (cuerpo = {}) => {
  const cambios = {};
  const anotar = (lista, campo, origen) => {
    if (!origen || typeof origen !== "object") return;
    for (const clave of lista) {
      if (typeof origen[clave] === "boolean") cambios[`${campo}.${clave}`] = origen[clave];
    }
  };
  anotar(AVISOS_CORREO, "notificationPrefs", cuerpo);
  anotar(AVISOS_CORREO, "notificationPrefs", cuerpo.correo);
  anotar(AVISOS_APP, "avisosApp", cuerpo.app);
  return cambios;
};
