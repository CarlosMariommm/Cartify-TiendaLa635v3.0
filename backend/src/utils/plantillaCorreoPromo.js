// EL CORREO DE UNA PROMOCIÓN NUEVA — plantillaCorreoPromo.js
// El aviso que sale cuando la tienda publica una promoción.

import { config } from "../../config.js";
import { dinero, limpio, ESTILOS, identidad, pie, boton } from "./correoBase.js";

// El color del correo sale del MISMO tema con que se dibujó el banner en la tienda, para que el
// aviso y la promo se reconozcan como la misma cosa.
const COLOR_POR_TEMA = {
  cafe: "#B46C30",
  fresco: "#2E8B5A",
  atardecer: "#E86A0C",
  noche: "#2A211C",
  cielo: "#2C68A8",
  crema: "#8A5222",   // el tema claro va con su café oscuro: sobre crema el texto blanco no se lee
  navidad: "#C1121F",
  anonuevo: "#35355C",
  sanvalentin: "#E5486A",
  diamadre: "#A06BB8",
  independencia: "#0F47AF",
  halloween: "#EE7B0A",
  blackfriday: "#1C1614", // el amarillo del tema es el acento, no el fondo
};

const AZUL_DE_LA_CASA = "#003049";

const colorDe = (promo) => {
  if (promo?.tema === "personalizado" && promo?.colorFondo) return promo.colorFondo;
  return COLOR_POR_TEMA[promo?.tema] || AZUL_DE_LA_CASA;
};

// El sello: el mismo texto corto que lleva el banner. Sale de la oferta, no de un campo escrito a
// mano, salvo en los anuncios —que no tienen número que mostrar y por eso llevan su etiqueta.
const selloDe = (promo, items) => {
  if (promo.type === "anuncio") return (promo.etiqueta || "Nuevo").toUpperCase();
  if (promo.type === "nxm") return `${promo.buyQty}x${promo.payQty}`;
  if (promo.type === "precio_fijo") {
    const menor = Math.min(...items.map((i) => Number(i.precioOferta) || Infinity));
    return Number.isFinite(menor) ? `DESDE ${dinero(menor)}` : "OFERTA";
  }
  const mayor = Math.max(...items.map((i) => Number(i.descuento) || 0));
  return mayor > 0 ? `-${mayor}%` : "OFERTA";
};

// Una frase que dice qué se gana, en el idioma de quien compra. "Compre 2 y pague 1" se entiende
// sin pensar; "nxm con buyQty 2" no.
const gananciaDe = (promo, items) => {
  if (promo.type === "anuncio") return "Recién llegado a la tienda.";
  if (promo.type === "nxm") return `Compre ${promo.buyQty} y pague ${promo.payQty}.`;
  if (promo.type === "precio_fijo") return "Precio especial por tiempo limitado.";
  const mayor = Math.max(...items.map((i) => Number(i.descuento) || 0));
  return mayor > 0 ? `Hasta ${mayor}% de descuento.` : "Precios especiales.";
};

// "hasta el 3 de septiembre". Sin hora: nadie compra a las 23:59:59.
const vencimientoEnTexto = (endsAt) => {
  if (!endsAt) return "";
  const fecha = new Date(endsAt);
  if (isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-SV", { day: "numeric", month: "long" });
};

// Una fila de producto: foto chica, nombre y precio. El precio se muestra tachado + nuevo solo
// cuando de verdad baja. En un anuncio no hay rebaja, así que sale el precio de siempre y ya:
// inventarle un tachado a un producto que no cambió de precio es mentirle al cliente.
const filaProducto = (item, color) => {
  const hayRebaja = item.precioOferta != null && item.precioOferta < item.precio;

  const foto = item.imagen
    ? `<img src="${limpio(item.imagen)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;object-fit:contain;border-radius:8px;background:#F5F5F5;" />`
    : `<div style="width:52px;height:52px;border-radius:8px;background:#F5F5F5;"></div>`;

  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;" width="52">${foto}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #f0f0f0;">
        <p class="titulo" style="margin:0;font-size:14px;font-weight:600;color:#1C1614;line-height:1.35;">${limpio(item.nombre)}</p>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;">
        ${hayRebaja
          ? `<span class="tenue" style="font-size:12px;color:#9C9691;text-decoration:line-through;">${dinero(item.precio)}</span>
             <span style="font-size:15px;font-weight:800;color:${color};margin-left:6px;">${dinero(item.precioOferta)}</span>`
          : `<span class="titulo" style="font-size:15px;font-weight:700;color:#1C1614;">${dinero(item.precio)}</span>`}
      </td>
    </tr>`;
};

// Recibe: promo, items, tienda, enlaceBaja.
export const plantillaCorreoPromo = ({ promo, items = [], tienda, enlaceBaja }) => {
  const color = colorDe(promo);
  const nombreTienda = tienda?.nombre || config.tienda.nombre;
  const sello = selloDe(promo, items);
  const ganancia = gananciaDe(promo, items);
  const vence = vencimientoEnTexto(promo.endsAt);
  const titulo = promo.title || promo.promoDescription;

  // El enlace lleva a la promo abierta, no a la portada. Quien hace clic en "40% en quesos" quiere
  // ver los quesos, no ponerse a buscarlos.
  const enlace = `${config.tienda.url}/?promo=${promo._id}`;

  // Tres productos y "y N más". Un correo con la lista completa de una promo de cuarenta productos
  // se vuelve un catálogo que nadie baja hasta el final, y los clientes de correo cortan los
  // mensajes largos con un "[Mensaje recortado]" justo encima del botón.
  const visibles = items.slice(0, 3);
  const restantes = items.length - visibles.length;

  const asunto = promo.type === "anuncio"
    ? `Novedad en ${nombreTienda}: ${titulo}`
    : `${sello} — ${titulo}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${limpio(titulo)}</title>
  ${ESTILOS}
</head>
<body class="fondo" style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <!-- Lo que se lee en la bandeja debajo del asunto, antes de abrir. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${limpio(ganancia)} ${vence ? `Válido hasta el ${vence}.` : ""}
  </div>

  <table class="fondo" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table class="tarjeta" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- El banner, con el color del tema que eligió la tienda -->
        <tr>
          <td class="cabecera" style="background:${color};padding:26px 40px 32px;text-align:center;">
            ${identidad(tienda || {})}
            <span class="sobre-color" style="display:inline-block;background:rgba(255,255,255,0.18);color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1.4px;padding:6px 16px;border-radius:999px;">${limpio(sello)}</span>
            <h1 class="sobre-color" style="margin:16px 0 0;font-size:27px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.25;">${limpio(titulo)}</h1>
            <p class="sobre-color" style="margin:8px 0 0;font-size:14px;color:#ffffff;opacity:0.88;">${limpio(ganancia)}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:30px 40px 8px;">
            ${promo.title && promo.promoDescription && promo.title !== promo.promoDescription
              ? `<p class="texto" style="margin:0 0 22px;font-size:15px;color:#555555;line-height:1.65;">${limpio(promo.promoDescription)}</p>`
              : ""}

            <p class="tenue" style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9C9691;">
              ${items.length === 1 ? "El producto" : "Lo que entra en la promo"}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0">
              ${visibles.map((i) => filaProducto(i, color)).join("")}
            </table>

            ${restantes > 0
              ? `<p class="tenue" style="margin:14px 0 0;font-size:13px;color:#9C9691;">y ${restantes} producto${restantes === 1 ? "" : "s"} más en la tienda.</p>`
              : ""}
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 8px;" align="center">
            ${boton({ texto: "Ver la promoción", url: enlace, color })}
            ${vence
              ? `<p class="tenue" style="margin:16px 0 0;font-size:13px;color:#9C9691;">Válido hasta el <strong style="color:#6B6560;">${vence}</strong>, mientras haya existencias.</p>`
              : `<p class="tenue" style="margin:16px 0 0;font-size:13px;color:#9C9691;">Mientras haya existencias.</p>`}
          </td>
        </tr>

        ${pie({
          nombreTienda,
          enlaceBaja,
          motivo: `Le llega este correo porque pidió enterarse de las promociones de ${nombreTienda}.`,
        })}

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // La versión en texto. No es un trámite: un correo que es SOLO HTML es una de las señales que más
  // pesan para que los filtros lo manden a spam, y este sale en lote a toda la lista de clientes.
  const texto = [
    `${sello} — ${titulo}`,
    "",
    ganancia,
    promo.promoDescription && promo.promoDescription !== titulo ? promo.promoDescription : "",
    "",
    ...visibles.map((i) => {
      const hayRebaja = i.precioOferta != null && i.precioOferta < i.precio;
      return hayRebaja
        ? `- ${i.nombre}: ${dinero(i.precio)} -> ${dinero(i.precioOferta)}`
        : `- ${i.nombre}: ${dinero(i.precio)}`;
    }),
    restantes > 0 ? `y ${restantes} producto${restantes === 1 ? "" : "s"} más.` : "",
    "",
    vence ? `Válido hasta el ${vence}, mientras haya existencias.` : "Mientras haya existencias.",
    "",
    `Ver la promoción: ${enlace}`,
    "",
    `Le llega este correo porque pidió enterarse de las promociones de ${nombreTienda}.`,
    enlaceBaja ? `Para dejar de recibirlos: ${enlaceBaja}` : "",
  ]
    .filter((linea) => linea !== "")
    .join("\n");

  return { asunto, html, texto };
};

export default plantillaCorreoPromo;
