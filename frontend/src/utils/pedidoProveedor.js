// PEDIRLE AL PROVEEDOR CON UN TOQUE — pedidoProveedor.js
// Desde la compra sugerida del pronóstico, arma el pedido y lo manda por donde se le pide a cada
// proveedor: WhatsApp con el mensaje escrito, su app o sitio, o una llamada.

import { cantidad } from './reportePredictivo';

const digitos = (texto) => String(texto || '').replace(/\D/g, '');

// La lista, una línea por producto: "• Leche Entera: 7".
export const listaDelPedido = (productos) =>
  productos.map((p) => `• ${p.nombre}: ${cantidad(p.pedir, p.unidad)}`).join('\n');

export const mensajeDePedido = ({ tienda, productos }) =>
  `Buenos días. Le escribimos de ${tienda || 'la tienda'}. Quisiéramos hacerle este pedido:\n${listaDelPedido(productos)}\nMuchas gracias.`;

// El número para wa.me: con el 503 de El Salvador si son 8 dígitos. Vacío si no hay uno que sirva
// (entonces WhatsApp deja elegir el contacto).
export const numeroDeWhatsApp = (numero) => {
  const d = digitos(numero);
  if (d.length === 8) return `503${d}`;
  if (d.length === 11 && d.startsWith('503')) return d;
  return d.length > 11 ? d : '';
};

export const enlaceDeWhatsApp = (numero, texto) => {
  const n = numeroDeWhatsApp(numero);
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

// Qué botón lleva cada proveedor, o null si todavía no se dijo por dónde se le pide. `pedido` es
// lo que manda el servidor con la compra sugerida.
export const comoPedir = (pedido, { tienda, productos }) => {
  if (!pedido?.canal) return null;
  const mensaje = mensajeDePedido({ tienda, productos });
  if (pedido.canal === 'whatsapp') {
    const numero = numeroDeWhatsApp(pedido.whatsapp) || numeroDeWhatsApp(digitos(pedido.telefono).length === 8 ? pedido.telefono : '');
    return { tipo: 'whatsapp', texto: 'Pedir por WhatsApp', href: enlaceDeWhatsApp(numero, mensaje), copiar: null };
  }
  if (pedido.canal === 'app' && pedido.enlace) {
    return { tipo: 'app', texto: `Pedir en ${pedido.app || 'la app'}`, href: pedido.enlace, copiar: listaDelPedido(productos) };
  }
  if (pedido.canal === 'llamada' && digitos(pedido.telefono)) {
    return { tipo: 'llamada', texto: `Llamar al ${pedido.telefono}`, href: `tel:${digitos(pedido.telefono)}`, copiar: listaDelPedido(productos) };
  }
  return null;
};

// Deja la lista en el portapapeles. Con el portapapeles del navegador y, si no deja (algunos
// WebView), con el truco del cuadro de texto. Dice si se copió.
export const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copiado = document.execCommand('copy');
      area.remove();
      return copiado;
    } catch {
      return false;
    }
  }
};

// Los proveedores activos que todavía no tienen por dónde se les pide (la invitación del panel).
export const sinCanalDePedido = (proveedores) =>
  (Array.isArray(proveedores) ? proveedores : []).filter((p) => p.isActive !== false && !p.pedidos?.canal);

// Cómo se dice el canal en la lista de proveedores y en el PDF.
export const nombreDelCanal = (pedido) =>
  pedido?.canal === 'whatsapp' ? 'WhatsApp'
    : pedido?.canal === 'app' ? (pedido.app || 'App')
      : pedido?.canal === 'llamada' ? 'Llamada'
        : '';
