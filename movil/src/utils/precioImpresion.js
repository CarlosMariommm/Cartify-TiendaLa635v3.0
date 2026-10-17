// PRECIO DE UNA IMPRESIÓN — precioImpresion.js
// Puerto verbatim de `frontend/src/utils/precioImpresion.js` (que a su vez está espejado en el
// backend — ver ese archivo para el porqué de tenerlo duplicado).

// Páginas -> hojas de papel. A doble cara caben 2 páginas por hoja.
export const hojasNecesarias = (paginas, dobleCara) => {
  const n = Math.max(1, Number(paginas) || 1);
  return dobleCara ? Math.ceil(n / 2) : n;
};

export const calcularPrecioImpresion = ({ servicio, paginas = 1, copias = 1, color = false, dobleCara = false }) => {
  if (!servicio) return { hojas: 0, precioPorHoja: 0, total: 0 };

  // El recargo solo aplica si el formato de verdad permite color.
  const cobraColor = color && servicio.allowsColor;
  const precioPorHoja =
    (Number(servicio.pricePerCopy) || 0) + (cobraColor ? Number(servicio.colorSurcharge) || 0 : 0);

  const hojas = hojasNecesarias(paginas, dobleCara);
  const nCopias = Math.max(1, Number(copias) || 1);

  return {
    hojas,
    precioPorHoja: Number(precioPorHoja.toFixed(2)),
    total: Number((precioPorHoja * hojas * nCopias).toFixed(2)),
  };
};
