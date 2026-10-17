import { describe, it, expect, vi, afterEach } from 'vitest';
import { foto, ANCHO } from './fotos';
import { enlaceDeProducto, compartirEnlace } from './compartir';

// Fotos al tamaño justo y enlaces para compartir: si fallan, la tienda se vuelve lenta o un
// producto compartido no abre.

const NUBE = 'https://res.cloudinary.com/dprv1cb0c/image/upload/v1791266881/grupo1B/fresas.webp';

describe('fotos de Cloudinary al tamaño en que se ven', () => {
  it('pide formato automático, calidad automática y el ancho justo', () => {
    expect(foto(NUBE, ANCHO.tarjeta)).toBe(
      'https://res.cloudinary.com/dprv1cb0c/image/upload/f_auto,q_auto,c_limit,w_400/v1791266881/grupo1B/fresas.webp'
    );
  });

  it('respeta una foto que ya viene transformada', () => {
    const lista = 'https://res.cloudinary.com/x/image/upload/w_200/v1/a.png';
    expect(foto(lista, 400)).toBe(lista);
  });

  it('no toca lo que no es de Cloudinary ni lo vacío', () => {
    expect(foto('https://lh3.googleusercontent.com/a/foto.jpg', 400)).toBe('https://lh3.googleusercontent.com/a/foto.jpg');
    expect(foto('blob:http://localhost/123', 400)).toBe('blob:http://localhost/123');
    expect(foto('', 400)).toBe('');
    expect(foto(undefined, 400)).toBeUndefined();
  });
});

describe('compartir un producto', () => {
  afterEach(() => vi.unstubAllGlobals());

  const conNavegador = ({ tactil, share, clipboard }) => {
    vi.stubGlobal('window', {
      location: { origin: 'https://cartify-tienda-la635.vercel.app' },
      matchMedia: () => ({ matches: tactil }),
    });
    vi.stubGlobal('navigator', { share, clipboard });
  };

  it('arma el enlace del producto con la dirección de la tienda', () => {
    conNavegador({ tactil: false });
    expect(enlaceDeProducto({ id: 'abc' })).toBe('https://cartify-tienda-la635.vercel.app/producto/abc');
  });

  it('en el teléfono abre el menú de compartir del sistema', async () => {
    const share = vi.fn().mockResolvedValue();
    conNavegador({ tactil: true, share });
    await expect(compartirEnlace({ titulo: 'Fresas', texto: 't', url: 'u' })).resolves.toBe('compartido');
    expect(share).toHaveBeenCalledWith({ title: 'Fresas', text: 't', url: 'u' });
  });

  it('si cierra el menú sin elegir, no es un error', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancelado'), { name: 'AbortError' }));
    conNavegador({ tactil: true, share });
    await expect(compartirEnlace({ url: 'u' })).resolves.toBe('cancelado');
  });

  it('en la computadora copia el enlace', async () => {
    const writeText = vi.fn().mockResolvedValue();
    conNavegador({ tactil: false, share: vi.fn(), clipboard: { writeText } });
    await expect(compartirEnlace({ url: 'u' })).resolves.toBe('copiado');
    expect(writeText).toHaveBeenCalledWith('u');
  });

  it('si no se puede copiar, lo dice', async () => {
    conNavegador({ tactil: false, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } });
    await expect(compartirEnlace({ url: 'u' })).resolves.toBe('error');
  });
});
