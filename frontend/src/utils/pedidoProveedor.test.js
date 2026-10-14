import { describe, it, expect } from 'vitest';
import { comoPedir, listaDelPedido, mensajeDePedido, nombreDelCanal, numeroDeWhatsApp } from './pedidoProveedor';

/*
 * El botón "Pedir" de la compra sugerida: qué abre y qué deja copiado,
 * según por dónde se le pide a cada proveedor.
 */

const PRODUCTOS = [
  { nombre: 'Leche Entera', unidad: 'unidad', pedir: 7 },
  { nombre: 'Queso Duro', unidad: 'libra', pedir: 2.5 },
];

describe('el pedido al proveedor', () => {
  it('la lista va una línea por producto, con la cantidad como en el reporte', () => {
    expect(listaDelPedido(PRODUCTOS)).toBe('• Leche Entera: 7\n• Queso Duro: 2.5 lb');
    expect(mensajeDePedido({ tienda: 'Tienda la 635', productos: PRODUCTOS }))
      .toBe('Buenos días. Le escribimos de Tienda la 635. Quisiéramos hacerle este pedido:\n• Leche Entera: 7\n• Queso Duro: 2.5 lb\nMuchas gracias.');
  });

  it('el número de WhatsApp lleva el 503 de El Salvador; si no sirve, se elige el contacto', () => {
    expect(numeroDeWhatsApp('7000-1111')).toBe('50370001111');
    expect(numeroDeWhatsApp('503 7000 1111')).toBe('50370001111');
    expect(numeroDeWhatsApp('+1 (305) 555-01234')).toBe('130555501234');
    expect(numeroDeWhatsApp('22200-1000')).toBe('');
    expect(numeroDeWhatsApp('')).toBe('');
  });

  it('WhatsApp: a su número; si no hay, al teléfono del proveedor si es de 8 dígitos', () => {
    const conNumero = comoPedir({ canal: 'whatsapp', whatsapp: '70001111', telefono: '2222-3333' }, { tienda: 'T', productos: PRODUCTOS });
    expect(conNumero.href.startsWith('https://wa.me/50370001111?text=')).toBe(true);
    expect(conNumero.copiar).toBeNull();
    expect(comoPedir({ canal: 'whatsapp', whatsapp: '', telefono: '2222-3333' }, { tienda: 'T', productos: PRODUCTOS }).href)
      .toMatch(/^https:\/\/wa\.me\/50322223333\?/);
    expect(comoPedir({ canal: 'whatsapp', whatsapp: '', telefono: '' }, { tienda: 'T', productos: PRODUCTOS }).href)
      .toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('app y llamada dejan la lista para copiar; sin lo necesario, no hay botón', () => {
    const app = comoPedir({ canal: 'app', app: 'BEES', enlace: 'https://www.bees.com/' }, { tienda: 'T', productos: PRODUCTOS });
    expect(app).toEqual({ tipo: 'app', texto: 'Pedir en BEES', href: 'https://www.bees.com/', copiar: '• Leche Entera: 7\n• Queso Duro: 2.5 lb' });
    expect(comoPedir({ canal: 'app', app: 'BEES', enlace: '' }, { tienda: 'T', productos: PRODUCTOS })).toBeNull();

    const llamada = comoPedir({ canal: 'llamada', telefono: '2222-3333' }, { tienda: 'T', productos: PRODUCTOS });
    expect(llamada).toMatchObject({ tipo: 'llamada', texto: 'Llamar al 2222-3333', href: 'tel:22223333' });
    expect(comoPedir({ canal: 'llamada', telefono: '' }, { tienda: 'T', productos: PRODUCTOS })).toBeNull();

    expect(comoPedir(null, { tienda: 'T', productos: PRODUCTOS })).toBeNull();
    expect(comoPedir({ canal: '' }, { tienda: 'T', productos: PRODUCTOS })).toBeNull();
  });

  it('cómo se dice el canal en la lista de proveedores y en el PDF', () => {
    expect(nombreDelCanal({ canal: 'whatsapp' })).toBe('WhatsApp');
    expect(nombreDelCanal({ canal: 'app', app: 'BEES' })).toBe('BEES');
    expect(nombreDelCanal({ canal: 'app', app: '' })).toBe('App');
    expect(nombreDelCanal({ canal: 'llamada' })).toBe('Llamada');
    expect(nombreDelCanal(undefined)).toBe('');
  });
});
