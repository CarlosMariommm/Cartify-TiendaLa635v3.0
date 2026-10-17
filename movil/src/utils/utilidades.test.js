import { describe, it, expect } from 'vitest';
import { idDeProductoEnEnlace, pedirProducto, soltarProductoPedido } from './enlaces';
import { foto, ANCHO } from './fotos';
import { URL_WEB_LEGAL } from './legales';

// Lo que la app hace sin pantallas de por medio: reconocer un enlace a un producto y pedir las
// fotos al tamaño justo. Ver también i18n/traducciones.test.js.

const ID = '6a66fd61802fdcc013afb642';

describe('enlaces que abren la app', () => {
  it('reconoce el enlace de la web y el esquema propio', () => {
    expect(idDeProductoEnEnlace(`${URL_WEB_LEGAL}/producto/${ID}`)).toBe(ID);
    expect(idDeProductoEnEnlace(`${URL_WEB_LEGAL}/producto/${ID}?utm_source=whatsapp`)).toBe(ID);
    expect(idDeProductoEnEnlace(`tiendala635://producto/${ID}`)).toBe(ID);
  });

  it('no se deja engañar por otro sitio ni por un id roto', () => {
    expect(idDeProductoEnEnlace(`https://otra-tienda.com/producto/${ID}`)).toBeNull();
    expect(idDeProductoEnEnlace(`https://cartify-tienda-la635Xvercel.app/producto/${ID}`)).toBeNull();
    expect(idDeProductoEnEnlace('tiendala635://producto/123')).toBeNull();
    expect(idDeProductoEnEnlace(`${URL_WEB_LEGAL}/`)).toBeNull();
    expect(idDeProductoEnEnlace(null)).toBeNull();
  });

  it('pedir y soltar un producto no revienta aunque nadie esté escuchando', () => {
    expect(() => { pedirProducto(ID); soltarProductoPedido(); }).not.toThrow();
  });
});

describe('fotos al tamaño justo (la misma regla que la web)', () => {
  it('transforma las de Cloudinary y deja las demás', () => {
    expect(foto('https://res.cloudinary.com/x/image/upload/v1/a.webp', ANCHO.ficha))
      .toBe('https://res.cloudinary.com/x/image/upload/f_auto,q_auto,c_limit,w_900/v1/a.webp');
    expect(foto('file:///data/foto.jpg', 400)).toBe('file:///data/foto.jpg');
  });
});
