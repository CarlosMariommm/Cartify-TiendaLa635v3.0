import { describe, it, expect } from 'vitest';
import { construirComprobante, horaLocal, nombreDelComprobante, numeroDePedido } from './comprobantePedido';

// El comprobante de un pedido (panel › Pedidos): que diga lo que se cobró, como se cobró, y que
// las fechas sean las de El Salvador.

const TIENDA = { nombre: 'Tienda la 635', direccion: 'Calle Sevilla 635', telefono: '2222-3333', nit: '0614-010190-101-3' };

const PEDIDO = {
  _id: '6a7f00000000000000a1b2c3',
  clientId: { fullName: 'Sofía Rivas' },
  createdAt: '2026-10-14T21:45:00Z', // 3:45 p. m. en El Salvador
  deliveredAt: '2026-10-15T01:10:00Z', // 7:10 p. m. del 14
  status: 'entregado',
  deliveryType: 'delivery',
  deliveryAddress: 'Pasaje 4 #33, Col. Providencia',
  paymentMethod: 'tarjeta',
  items: [
    { name: 'Leche Entera', price: 1.25, amount: 2, productId: { name: 'Leche Entera', unidadVenta: 'unidad' } },
    { name: 'Queso Fresco', price: 4, amount: 1.5, productId: { name: 'Queso Fresco', unidadVenta: 'libra' } },
  ],
  subtotal: 8.5,
  discount: 1,
  pointsRedeemed: 100,
  shippingCost: 1.5,
  serviceFee: 0.25,
  total: 9.25,
  pointsEarned: 9,
};

// jsPDF guarda los paréntesis escapados: "\(".
const textoDe = (doc) => doc.output();

describe('el comprobante', () => {
  it('lleva el encabezado, los datos, el detalle y los totales tal como se cobraron', () => {
    const texto = textoDe(construirComprobante(PEDIDO, TIENDA));
    for (const parte of [
      'TIENDA LA 635', 'NIT 0614-010190-101-3', 'COMPROBANTE DE COMPRA', 'Pedido #A1B2C3',
      '14 de octubre de 2026, 3:45 p. m.', 'Sofía Rivas', 'A domicilio: Pasaje 4 #33, Col. Providencia', 'Tarjeta',
      'Entregado', '14 de octubre de 2026, 7:10 p. m.',
      'Leche Entera', '$2.50', '1.5 lb', '$6.00',
      'Subtotal', '$8.50', 'Descuento con puntos', '100 pts', '-$1.00', '$1.50', 'Tarifa de servicio', '$0.25', 'Total', '$9.25',
      'se sumaron 9 puntos', 'No sustituye a la factura', 'Comprobante del pedido #A1B2C3',
    ]) {
      expect(texto, parte).toContain(parte);
    }
  });

  it('retiro en la tienda, sin envío ni descuento, y sin nombre si la cuenta ya no existe', () => {
    const texto = textoDe(construirComprobante(
      { ...PEDIDO, clientId: null, deliveryType: 'retiro', shippingCost: 0, discount: 0, serviceFee: 0, status: 'listo', pointsEarned: 0, total: 8.5 },
      TIENDA,
    ));
    expect(texto).toContain('Retiro en la tienda');
    expect(texto).not.toContain('Descuento');
    expect(texto).not.toContain('Tarifa de servicio');
    expect(texto).not.toContain('puntos de fidelidad');
    expect(texto).not.toContain('7:10 p. m.');
    expect(texto).toContain('Cliente');
  });

  it('a domicilio con envío gratis lo dice', () => {
    expect(textoDe(construirComprobante({ ...PEDIDO, shippingCost: 0 }, TIENDA))).toContain('Gratis');
  });

  it('el número y el nombre del archivo son los que se ven en Pedidos', () => {
    expect(numeroDePedido(PEDIDO._id)).toBe('A1B2C3');
    expect(nombreDelComprobante(PEDIDO._id)).toBe('comprobante-pedido-A1B2C3.pdf');
  });

  it('la hora es la de El Salvador', () => {
    expect(horaLocal('2026-10-15T03:05:00Z')).toBe('9:05 p. m.');
    expect(horaLocal('2026-10-14T06:00:00Z')).toBe('12:00 a. m.');
    expect(horaLocal('2026-10-14T18:30:00Z')).toBe('12:30 p. m.');
  });
});
