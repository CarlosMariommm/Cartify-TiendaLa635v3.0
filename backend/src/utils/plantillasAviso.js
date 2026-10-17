// LOS OTROS DOS AVISOS POR CORREO — plantillasAviso.js
// "Productos nuevos" y "Mi pedido va en camino": los dos interruptores que la pantalla de
// Notificaciones ofrecía y que no encendían nada.

import {
  AZUL, AZUL_OSCURO, dinero, limpio, ESTILOS, identidad, pie, boton, urlTienda,
} from "./correoBase.js";

// El sobre que comparten los dos. Recibe el contenido ya armado y lo mete en la misma tarjeta,
// para que los correos de la tienda se reconozcan entre sí.
const sobre = ({ tienda, encabezado, subtitulo, cuerpo, accion, enlaceBaja, motivoBaja }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${limpio(encabezado)}</title>
  ${ESTILOS}
</head>
<body class="fondo" style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <!-- Lo que se lee en la bandeja debajo del asunto, antes de abrir. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${limpio(subtitulo)}</div>

  <table class="fondo" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table class="tarjeta" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <tr>
          <td class="cabecera" style="background:${AZUL};padding:26px 40px 30px;text-align:center;">
            ${identidad(tienda)}
            <h1 class="sobre-color" style="margin:0;font-size:25px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;line-height:1.3;">${limpio(encabezado)}</h1>
            <p class="sobre-color" style="margin:8px 0 0;font-size:14px;color:#ffffff;opacity:0.88;">${limpio(subtitulo)}</p>
          </td>
        </tr>

        <tr><td style="padding:30px 40px 8px;">${cuerpo}</td></tr>

        <tr><td style="padding:24px 40px 10px;" align="center">${boton(accion)}</td></tr>

        ${pie({ nombreTienda: tienda.nombre, enlaceBaja, motivo: motivoBaja })}

      </table>
    </td></tr>
  </table>
</body>
</html>`;

/* ══════════ 1. Productos nuevos ══════════ */

// Va en LOTE y no uno por producto. Quien carga el inventario un lunes sube treinta cosas de
// corrido; con un correo por producto la tienda le manda treinta correos seguidos a cada cliente y
// termina en spam el mismo día. Ver avisosCliente.js.
export const plantillaProductosNuevos = ({ productos = [], tienda, enlaceBaja }) => {
  const varios = productos.length > 1;
  const visibles = productos.slice(0, 4);
  const restantes = productos.length - visibles.length;

  const filas = visibles.map((p) => {
    const foto = p.imagen
      ? `<img src="${limpio(p.imagen)}" width="54" height="54" alt="" style="display:block;width:54px;height:54px;object-fit:contain;border-radius:8px;background:#F5F5F5;" />`
      : `<div style="width:54px;height:54px;border-radius:8px;background:#F5F5F5;"></div>`;
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;" width="54">${foto}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f0f0f0;">
          <p class="titulo" style="margin:0;font-size:14px;font-weight:600;color:#1C1614;line-height:1.35;">${limpio(p.nombre)}</p>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;">
          <span class="titulo" style="font-size:15px;font-weight:700;color:${AZUL_OSCURO};">${dinero(p.precio)}</span>
        </td>
      </tr>`;
  }).join('');

  const encabezado = varios ? `Llegaron ${productos.length} cosas nuevas` : 'Llegó algo nuevo';
  const subtitulo = varios ? 'Recién puestas en el estante.' : 'Recién puesto en el estante.';

  const cuerpo = `
    <p class="tenue" style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9C9691;">
      ${varios ? 'Lo nuevo' : 'El producto'}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${filas}</table>
    ${restantes > 0
      ? `<p class="tenue" style="margin:14px 0 0;font-size:13px;color:#9C9691;">y ${restantes} producto${restantes === 1 ? '' : 's'} más en la tienda.</p>`
      : ''}`;

  const texto = [
    encabezado,
    '',
    ...visibles.map((p) => `- ${p.nombre}: ${dinero(p.precio)}`),
    restantes > 0 ? `y ${restantes} más.` : '',
    '',
    `Verlos en la tienda: ${urlTienda()}/`,
    '',
    'Te llega este correo porque pediste que te avisáramos de los productos nuevos.',
    enlaceBaja ? `Para dejar de recibirlos: ${enlaceBaja}` : '',
  ].filter((l) => l !== '').join('\n');

  return {
    asunto: varios
      ? `${productos.length} productos nuevos en ${tienda.nombre}`
      : `Nuevo en ${tienda.nombre}: ${productos[0]?.nombre || ''}`,
    html: sobre({
      tienda,
      encabezado,
      subtitulo,
      cuerpo,
      accion: { texto: 'Ver en la tienda', url: `${urlTienda()}/` },
      // Esto SÍ es publicidad: lleva su salida.
      enlaceBaja,
      motivoBaja: 'Te llega este correo porque pediste que te avisáramos de los productos nuevos.',
    }),
    texto,
  };
};

/* ══════════ 2. El pedido va en camino ══════════ */

export const plantillaPedidoEnCamino = ({ pedido, nombreCliente, tienda }) => {
  const saluda = nombreCliente ? `${nombreCliente.split(' ')[0]}, tu` : 'Tu';
  const enlace = `${urlTienda()}/mi-cuenta/pedido/${pedido._id}`;

  const cuerpo = `
    <p class="texto" style="margin:0 0 18px;font-size:15px;color:#555555;line-height:1.6;">
      ${limpio(saluda)} pedido ya salió de la tienda. Puedes ver en el mapa por dónde
      viene y calcular cuándo salir a la puerta.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;">
      <tr>
        <td class="tenue" style="padding:14px 16px;font-size:13px;color:#9C9691;">Total del pedido</td>
        <td class="titulo" style="padding:14px 16px;text-align:right;font-size:17px;font-weight:800;color:#1C1614;">${dinero(pedido.total)}</td>
      </tr>
    </table>
    <p class="tenue" style="margin:16px 0 0;font-size:13px;color:#9C9691;line-height:1.55;">
      Si nadie contesta en la puerta, quien lo lleva te va a llamar al teléfono
      de tu cuenta.
    </p>`;

  const texto = [
    'Tu pedido va en camino',
    '',
    `${saluda} pedido ya salió de la tienda.`,
    `Total: ${dinero(pedido.total)}`,
    '',
    `Seguirlo en el mapa: ${enlace}`,
    '',
    'Si nadie contesta en la puerta, quien lo lleva te va a llamar.',
  ].join('\n');

  return {
    asunto: `Tu pedido va en camino — ${tienda.nombre}`,
    html: sobre({
      tienda,
      encabezado: 'Tu pedido va en camino',
      subtitulo: 'Ya salió de la tienda.',
      cuerpo,
      accion: { texto: 'Seguirlo en el mapa', url: enlace },
      // SIN enlace de baja. Esto no es publicidad: es información de algo que la persona compró y está
      // esperando. Ofrecerle "dejar de recibir esto" junto al aviso de su propia entrega la haría dudar
      // de si se dio de baja de algo importante. El interruptor sigue en Mi Cuenta.
      enlaceBaja: null,
    }),
    texto,
  };
};

// PEDIDO CANCELADO — con el motivo y lo que se le devolvió.
// Este correo sale siempre, sin interruptor: es la única forma de enterarse para quien compró en
// la web y no tiene la app.
export const plantillaPedidoCancelado = ({ pedido, nombreCliente, tienda }) => {
  const saluda = nombreCliente ? `${nombreCliente.split(' ')[0]}, lo` : 'Lo';
  const numero = String(pedido._id).slice(-6).toUpperCase();
  const enlace = `${urlTienda()}/mi-cuenta/pedido/${pedido._id}`;
  const motivo = pedido.cancelReason || '';
  const saldo = Number(pedido.reembolso?.saldo) || 0;
  const puntos = Number(pedido.reembolso?.puntos) || 0;

  const devuelto = [
    saldo > 0 ? `${dinero(saldo)} a tu saldo` : '',
    puntos > 0 ? `${puntos} puntos a tu cuenta` : '',
  ].filter(Boolean);

  const cuerpo = `
    <p class="texto" style="margin:0 0 18px;font-size:15px;color:#555555;line-height:1.6;">
      ${limpio(saluda)} sentimos: tuvimos que cancelar tu pedido #${numero}.
    </p>
    ${motivo ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;">
      <tr>
        <td style="padding:14px 16px;">
          <div class="tenue" style="font-size:12px;color:#9C9691;margin-bottom:4px;">El motivo</div>
          <div class="titulo" style="font-size:15px;color:#1C1614;line-height:1.5;">${limpio(motivo)}</div>
        </td>
      </tr>
    </table>` : ''}
    ${devuelto.length ? `
    <p class="texto" style="margin:16px 0 0;font-size:14px;color:#555555;line-height:1.55;">
      Ya te devolvimos ${limpio(devuelto.join(' y '))}.
    </p>` : ''}
    <p class="tenue" style="margin:16px 0 0;font-size:13px;color:#9C9691;line-height:1.55;">
      Si tienes dudas, escríbenos y lo revisamos.
    </p>`;

  const texto = [
    'Tu pedido fue cancelado',
    '',
    `${saluda} sentimos: tuvimos que cancelar tu pedido #${numero}.`,
    motivo ? `Motivo: ${motivo}` : '',
    devuelto.length ? `Ya te devolvimos ${devuelto.join(' y ')}.` : '',
    '',
    `Ver el pedido: ${enlace}`,
    '',
    'Si tienes dudas, escríbenos y lo revisamos.',
  ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');

  return {
    asunto: `Tu pedido #${numero} fue cancelado — ${tienda.nombre}`,
    html: sobre({
      tienda,
      encabezado: 'Tu pedido fue cancelado',
      subtitulo: `Pedido #${numero}`,
      cuerpo,
      accion: { texto: 'Ver el pedido', url: enlace },
      // Sin enlace de baja, igual que "va en camino": no es publicidad.
      enlaceBaja: null,
    }),
    texto,
  };
};
