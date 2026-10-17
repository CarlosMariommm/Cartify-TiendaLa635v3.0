// COMPARTIR UN PRODUCTO — compartir.js
// Cada producto tiene su dirección (/producto/:id). Compartirla es lo que más se hace en El
// Salvador con una tienda: mandarla por WhatsApp ("¿te traigo esto?").

export const enlaceDeProducto = (producto) =>
  `${window.location.origin}/producto/${producto.id}`;

const esTactil = () => window.matchMedia?.('(pointer: coarse)').matches;

// Devuelve qué pasó, para que quien llama avise como corresponde: 'compartido' | 'cancelado' |
// 'copiado' | 'error'
export const compartirEnlace = async ({ titulo, texto, url }) => {
  if (esTactil() && navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto, url });
      return 'compartido';
    } catch (error) {
      // Cerró el menú sin elegir: no es un error, no se avisa nada.
      if (error?.name === 'AbortError') return 'cancelado';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copiado';
  } catch {
    return 'error';
  }
};
