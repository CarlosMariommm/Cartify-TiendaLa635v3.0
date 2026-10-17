import { lazy } from 'react';

// LO QUE SE ABRE ENCIMA DE LA TIENDA — pantallasDiferidas.js
// El carrito, Tiqui, la ficha de un producto y el detalle de una promo se descargan aparte de la
// portada, y se piden apenas ella termina de cargar para que abran al instante.
const cargar = {
  carrito: () => import('./ShoppingCart'),
  asistente: () => import('./AsistenteVoz'),
  ficha: () => import('./ProductDetailModal'),
  promo: () => import('./PromoDetailModal'),
};

export const ShoppingCart = lazy(cargar.carrito);
export const AsistenteVoz = lazy(cargar.asistente);
export const ProductDetailModal = lazy(cargar.ficha);
export const PromoDetailModal = lazy(cargar.promo);

let pedidas = false;

export const precargarPantallas = () => {
  if (pedidas) return;
  pedidas = true;
  const pedir = () =>
    Object.values(cargar).forEach((importar) =>
      // Si falla (se cortó la red), se vuelve a intentar la próxima vez.
      importar().catch(() => { pedidas = false; })
    );
  // Safari no tiene requestIdleCallback: ahí se espera un poco y listo.
  if ('requestIdleCallback' in window) window.requestIdleCallback(pedir, { timeout: 4000 });
  else setTimeout(pedir, 2500);
};
