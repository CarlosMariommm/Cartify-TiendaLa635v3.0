// EL COMPROBANTE DE UN PEDIDO — comprobantePedido.js
// PDF formal de un pedido (datos, detalle y totales) que el personal baja desde Pedidos para
// imprimirlo o mandarlo. El cliente no lo baja por su cuenta.

import { COLOR, MARGEN, asegurarEspacio, dinero, fechaLarga, hoyLocal, nuevoReporte, parrafo, pie, seccion, tabla } from './reportesPdf';

// Los 6 últimos del id, en mayúsculas: el mismo número que se ve en Pedidos ("#A1B2C3").
export const numeroDePedido = (id) => String(id || '').slice(-6).toUpperCase();

export const nombreDelComprobante = (id) => `comprobante-pedido-${numeroDePedido(id)}.pdf`;

const PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', saldo: 'Saldo de la cuenta (tarjeta de regalo)' };

// "3:45 p. m.", en la hora de El Salvador.
export const horaLocal = (cuando) => {
  const fecha = new Date(cuando);
  const h = Number(fecha.toLocaleString('en-US', { timeZone: 'America/El_Salvador', hour: 'numeric', hour12: false })) % 24;
  const min = fecha.toLocaleString('en-US', { timeZone: 'America/El_Salvador', minute: '2-digit' }).padStart(2, '0');
  return `${h % 12 || 12}:${min} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};

// "14 de octubre de 2026, 3:45 p. m.", con la fecha de El Salvador.
const cuando = (fecha) => `${fechaLarga(hoyLocal(new Date(fecha)))}, ${horaLocal(fecha)}`;

// "2", "1.5 lb": las libras con su unidad.
const cantidadDe = (item) => {
  const n = Number(item.amount) || 0;
  const texto = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return item.productId?.unidadVenta === 'libra' ? `${texto} lb` : texto;
};

const ancho = (doc) => doc.internal.pageSize.getWidth();

// Las filas "dato: valor" de arriba, en dos columnas.
const datos = (doc, filas, y) => {
  const anchoValor = ancho(doc) - MARGEN * 2 - 38;
  filas.forEach(([etiqueta, valor]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(String(valor), anchoValor);
    y = asegurarEspacio(doc, y, lineas.length * 4.2);
    doc.setTextColor(...COLOR.suave);
    doc.text(etiqueta, MARGEN, y);
    doc.setTextColor(...COLOR.tinta);
    doc.text(lineas, MARGEN + 38, y);
    y += lineas.length * 4.2 + 1.4;
  });
  return y + 4;
};

// Los totales, a la derecha como en cualquier recibo. El último (el total) va en negrita y con su línea.
const totales = (doc, filas, y) => {
  const derecha = ancho(doc) - MARGEN - 2;
  const columnaEtiqueta = derecha - 78;
  y = asegurarEspacio(doc, y, filas.length * 5.2 + 6);
  filas.forEach(([etiqueta, valor, final]) => {
    if (final) {
      doc.setDrawColor(...COLOR.tinta);
      doc.setLineWidth(0.35);
      doc.line(columnaEtiqueta, y - 3.6, derecha, y - 3.6);
      y += 1.2;
    }
    doc.setFont('helvetica', final ? 'bold' : 'normal');
    doc.setFontSize(final ? 10.5 : 9);
    doc.setTextColor(...(final ? COLOR.tinta : COLOR.suave));
    doc.text(etiqueta, columnaEtiqueta, y);
    doc.setTextColor(...COLOR.tinta);
    doc.text(valor, derecha, y, { align: 'right' });
    y += final ? 6.5 : 5.2;
  });
  return y + 4;
};

// `pedido`: como lo trae Pedidos (con `clientId` e `items.productId` poblados). `tienda`: lo que
// devuelve datosDeLaTienda.
export const construirComprobante = (pedido, tienda) => {
  const numero = numeroDePedido(pedido._id);
  const { doc, y: inicio } = nuevoReporte({
    tienda,
    titulo: 'Comprobante de compra',
    renglones: [`Pedido #${numero}`, cuando(pedido.createdAt)],
  });

  const items = (pedido.items || []).filter((item) => Number(item.amount) > 0);
  const subtotal = pedido.subtotal ?? items.reduce((s, item) => s + item.price * item.amount, 0);
  const domicilio = pedido.deliveryType === 'delivery';

  let y = seccion(doc, 'Datos del pedido', inicio);
  y = datos(doc, [
    ['Cliente', pedido.clientId?.fullName || 'Cliente'],
    ['Entrega', domicilio ? `A domicilio${pedido.deliveryAddress ? `: ${pedido.deliveryAddress}` : ''}` : 'Retiro en la tienda'],
    ['Forma de pago', PAGO[pedido.paymentMethod] || 'Efectivo'],
    ...(pedido.status === 'entregado' && pedido.deliveredAt ? [['Entregado', cuando(pedido.deliveredAt)]] : []),
  ], y);

  y = seccion(doc, 'Detalle', y);
  y = tabla(doc, {
    y,
    encabezado: ['Producto', 'Cantidad', 'Precio unitario', 'Importe'],
    filas: items.map((item) => [
      item.name || item.productId?.name || 'Producto',
      cantidadDe(item),
      dinero(item.price),
      dinero(item.price * item.amount),
    ]),
    derecha: [1, 2, 3],
    anchos: { 1: 24, 2: 32, 3: 30 },
  });

  const descuento = Number(pedido.discount) || 0;
  const envio = Number(pedido.shippingCost) || 0;
  const servicio = Number(pedido.serviceFee) || 0;
  y = totales(doc, [
    ['Subtotal', dinero(subtotal)],
    ...(descuento > 0 ? [[`Descuento con puntos${pedido.pointsRedeemed ? ` (${pedido.pointsRedeemed} pts)` : ''}`, `-${dinero(descuento)}`]] : []),
    ...(domicilio || envio > 0 ? [['Envío', envio > 0 ? dinero(envio) : 'Gratis']] : []),
    ...(servicio > 0 ? [['Tarifa de servicio', dinero(servicio)]] : []),
    ['Total', dinero(pedido.total), true],
  ], y);

  if (Number(pedido.pointsEarned) > 0) {
    y = parrafo(doc, `Con esta compra se sumaron ${pedido.pointsEarned} puntos de fidelidad a la cuenta.`, y, { tamano: 8.5, color: COLOR.tinta });
  }
  parrafo(doc, 'Este comprobante detalla la compra y lo que se cobró por ella. No sustituye a la factura ni al comprobante de crédito fiscal.', y);

  pie(doc, `Comprobante del pedido #${numero}  ·  ${tienda.nombre}`);
  return doc;
};
