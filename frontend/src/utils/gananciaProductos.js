// GANANCIA POR PRODUCTO — gananciaProductos.js
// Cuánto deja cada producto: por unidad (precio menos costo) y con todo lo que hay en bodega, al
// precio normal (sin promociones). Lo usa el dashboard del administrador.

const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Lo de un producto. `margen` va de 0 a 1 (null si no hay precio o costo para calcularlo).
export const gananciaDeProducto = (p) => {
  const precio = numero(p?.salePrice);
  const costo = numero(p?.priceCost);
  const stock = Math.max(numero(p?.stock), 0);
  const sinCosto = !(costo > 0);
  const porUnidad = sinCosto ? null : precio - costo;
  return {
    id: p?._id,
    nombre: p?.name || '',
    categoria: p?.typeId?.type || p?.categoria || '',
    porLibra: p?.unidadVenta === 'libra',
    precio,
    costo,
    stock,
    sinCosto,
    porUnidad,
    margen: !sinCosto && precio > 0 ? porUnidad / precio : null,
    delStock: sinCosto ? null : porUnidad * stock,
    createdAt: p?.createdAt,
  };
};

// Los totales de la bodega. Los productos sin costo no entran: no se sabe cuánto dejan.
export const resumenDeGanancias = (filas) => {
  const conCosto = filas.filter((f) => !f.sinCosto);
  const invertido = conCosto.reduce((s, f) => s + f.costo * f.stock, 0);
  const valorVenta = conCosto.reduce((s, f) => s + f.precio * f.stock, 0);
  return {
    invertido,
    valorVenta,
    ganancia: valorVenta - invertido,
    margen: valorVenta > 0 ? (valorVenta - invertido) / valorVenta : null,
    conPerdida: conCosto.filter((f) => f.porUnidad < 0).length,
    sinCosto: filas.length - conCosto.length,
  };
};

// Los órdenes propios de la tabla (además de los de siempre, ver utils/listasPanel.js). Los
// productos sin costo van siempre al final.
const alFinal = (f) => (f.sinCosto ? 1 : 0);
export const ORDENES_GANANCIA = {
  'ganancia-stock': (a, b) => alFinal(a) - alFinal(b) || (b.delStock ?? 0) - (a.delStock ?? 0),
  'ganancia-unidad': (a, b) => alFinal(a) - alFinal(b) || (b.porUnidad ?? 0) - (a.porUnidad ?? 0),
  'margen-alto': (a, b) => alFinal(a) - alFinal(b) || (b.margen ?? 0) - (a.margen ?? 0),
  'margen-bajo': (a, b) => alFinal(a) - alFinal(b) || (a.margen ?? 0) - (b.margen ?? 0),
};
