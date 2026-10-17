// PROMOCIONES — promos.js
// Helpers de presentación de una promo. Viven aparte porque los usan tanto la tienda (carrusel)
// como el admin (vista previa), y así el empleado ve exactamente lo mismo que va a ver el cliente.

const numero = (v) => Number(v) || 0;

// Sin traductor (el panel, que va en español) se usa el texto tal cual, con sus llaves {n}
// rellenadas. La tienda pasa `t` de useIdioma.
const sinTraducir = (s, v) => (v ? String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m)) : s);

// El sello del ahorro que va en la tarjeta: "-25%", "$1.25" o "2x1".
export const etiquetaPromo = (promo, t = sinTraducir) => {
  if (!promo) return '';
  const items = Array.isArray(promo.items) ? promo.items : [];

  // El anuncio no tiene ahorro que mostrar: su sello es una palabra que la tienda escribe ("Nuevo",
  // "De la casa"). Sin esto saldría "-0%", que es peor que no poner nada.
  if (promo.type === 'anuncio') {
    return (promo.etiqueta || '').trim() || t('Nuevo');
  }

  if (promo.type === 'nxm') {
    return `${numero(promo.buyQty) || 2}x${numero(promo.payQty) || 1}`;
  }

  if (promo.type === 'precio_fijo') {
    const precios = items.map((it) => numero(it.fixedPrice)).filter((n) => n > 0);
    if (!precios.length) return t('Oferta');
    return `$${Math.min(...precios).toFixed(2)}`;
  }

  // Descuento: mostramos el mayor, que es el gancho.
  const descuentos = items.map((it) => numero(it.discount)).filter((n) => n > 0);
  if (!descuentos.length) return t('Oferta');
  return `-${Math.max(...descuentos)}%`;
};

// ── Vencimiento ── El backend apaga las promos vencidas cuando alguien pide la lista, pero la
// tienda no puede depender de eso: alguien con la página abierta desde ayer seguiría viendo la
// promo de ayer.

// Medianoche de hoy: comparar días completos, no horas.
const hoyCero = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const fechaFin = (promo) => {
  if (!promo?.endsAt) return null;
  const f = new Date(promo.endsAt);
  return isNaN(f.getTime()) ? null : f;
};

export const promoVencida = (promo) => {
  const fin = fechaFin(promo);
  return !!fin && fin.getTime() < Date.now();
};

// Una promo rige si está activa y todavía no se le pasó la fecha.
export const promoVigente = (promo) =>
  !!promo && promo.isActive !== false && !promoVencida(promo);

// Cuánto le queda, dicho como lo diría una persona. "Termina el 3 de agosto" sirve para planear;
// "Último día" es lo que hace que alguien compre hoy.
export const textoVencimiento = (promo, t = sinTraducir, locale = 'es') => {
  const fin = fechaFin(promo);
  if (!fin) return null;
  if (promoVencida(promo)) return t('Vencida');

  const finDia = new Date(fin);
  finDia.setHours(0, 0, 0, 0);
  const dias = Math.round((finDia - hoyCero()) / 86400000);

  if (dias <= 0) return t('Último día');
  if (dias === 1) return t('Termina mañana');
  if (dias <= 6) return t('Quedan {n} días', { n: dias });

  return t('Termina el {fecha}', { fecha: fin.toLocaleDateString(locale, { day: 'numeric', month: 'long' }) });
};

// Las que de verdad se anuncian en la tienda: vigentes y marcadas para anunciar. Ya NO se exige
// imagen — la tarjeta se dibuja con el texto y los colores del tema. Lo que sí hace falta es un
// título: sin él el banner saldría vacío.
export const promosVisibles = (lista) =>
  (Array.isArray(lista) ? lista : []).filter(
    (p) => promoVigente(p) && p.showBanner !== false && (p.image || p.title)
  );

// ── Clasificación por pasillo ── Los pasillos (módulos) a los que pertenece una promo salen de
// SUS productos: una promo de pan tiene productos de Panadería, así que es una promo de Panadería.
export const modulosDePromo = (promo) => {
  const ids = new Set();
  (promo?.items || []).forEach((it) => {
    const prod = it?.productId;
    if (!prod || typeof prod !== 'object') return;
    const mod = prod.moduleId?._id || prod.moduleId;
    if (mod) ids.add(String(mod));
  });
  return [...ids];
};

// ¿Esta promo se muestra en este pasillo? Sin pasillo elegido (toda la tienda), sí. Con pasillo,
// solo si alguno de sus productos vive ahí.
export const promoEnModulo = (promo, moduloId) => {
  if (!moduloId) return true;
  const mods = modulosDePromo(promo);
  if (mods.length === 0) return true;
  return mods.includes(String(moduloId));
};
