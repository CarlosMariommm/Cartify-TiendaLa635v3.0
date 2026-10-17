// VOLAR AL CARRITO — volarAlCarrito.js
// Al tocar "+", una copia de la foto del producto sale volando en arco hasta el botón del carrito
// del encabezado, se encoge al llegar y el carrito se sacude.

const DURACION = 800;

const menosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// El botón del carrito que se ve en pantalla (el encabezado es pegajoso, así
// que casi siempre está; en el panel o en el checkout no hay y no se vuela).
const destinoVisible = () =>
  [...document.querySelectorAll('[data-destino-carrito]')].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  });

const sacudir = (destino) => {
  destino.animate(
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-14deg) scale(1.06)' },
      { transform: 'rotate(9deg)' },
      { transform: 'rotate(-4deg)' },
      { transform: 'rotate(0deg)' },
    ],
    { duration: 560, easing: 'ease-out' }
  );
  const globo = destino.querySelector('.globo-pop');
  globo?.animate(
    [{ transform: 'scale(1.7)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }],
    { duration: 520, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
  );
};

/**
 * @param {Element} origen  la foto (o el recuadro de la foto) desde donde sale
 */
export const volarAlCarrito = (origen) => {
  if (typeof document === 'undefined' || !origen) return;
  const destino = destinoVisible();
  if (!destino) return;
  if (menosMovimiento()) return;

  const de = origen.getBoundingClientRect();
  const a = destino.getBoundingClientRect();
  // Una foto que no se ve (tapada por un modal que ya se cerró, o sin tamaño)
  // no tiene de dónde salir.
  if (!de.width || !de.height) return;

  const capa = document.createElement('div');
  Object.assign(capa.style, {
    position: 'fixed',
    left: `${de.left}px`,
    top: `${de.top}px`,
    width: `${de.width}px`,
    height: `${de.height}px`,
    zIndex: '9999',
    pointerEvents: 'none',
    willChange: 'transform',
  });

  const foto = origen.cloneNode(true);
  foto.removeAttribute?.('id');
  Object.assign(foto.style, {
    width: '100%',
    height: '100%',
    maxWidth: 'none',
    maxHeight: 'none',
    margin: '0',
    objectFit: 'contain',
    display: 'block',
    transition: 'none',
    willChange: 'transform, opacity',
    filter: 'drop-shadow(0 12px 18px rgba(0, 0, 0, 0.25))',
  });
  capa.appendChild(foto);
  document.body.appendChild(capa);

  const dx = a.left + a.width / 2 - (de.left + de.width / 2);
  const dy = a.top + a.height / 2 - (de.top + de.height / 2);

  capa.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }],
    { duration: DURACION, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' }
  );
  const vuelo = foto.animate(
    [
      { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translateY(${dy}px) scale(0.12) rotate(25deg)`, opacity: 0.55 },
    ],
    { duration: DURACION, easing: 'cubic-bezier(0.6, -0.4, 0.74, 0.05)', fill: 'forwards' }
  );

  const terminar = () => {
    capa.remove();
    sacudir(destino);
  };
  vuelo.onfinish = terminar;
  vuelo.oncancel = () => capa.remove();
};

export default volarAlCarrito;
