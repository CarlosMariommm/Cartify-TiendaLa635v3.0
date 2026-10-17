// LAS LISTAS DEL PANEL — listasPanel.js
// Buscar, filtrar y ordenar igual en todas las listas del panel, con lo más reciente primero.

export const ORDEN_INICIAL = 'recientes';

export const fechaDeAlta = (item) => {
  const fecha = Date.parse(item?.createdAt);
  if (!Number.isNaN(fecha)) return fecha;
  const id = String(item?._id || '');
  return /^[a-f\d]{24}$/i.test(id) ? parseInt(id.slice(0, 8), 16) * 1000 : 0;
};

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const porNombre = (nombre) => (a, b) => plano(nombre(a)).localeCompare(plano(nombre(b)), 'es');

// `extras`: { clave: comparador } para los órdenes propios de una pantalla. `nombre`: de dónde
// sale el nombre (por defecto `name`).
export const ordenarLista = (lista, orden = ORDEN_INICIAL, { nombre = (x) => x?.name, extras = {} } = {}) => {
  const comparar = extras[orden] || {
    recientes: (a, b) => fechaDeAlta(b) - fechaDeAlta(a),
    antiguos: (a, b) => fechaDeAlta(a) - fechaDeAlta(b),
    nombre: porNombre(nombre),
  }[orden];
  const copia = [...(Array.isArray(lista) ? lista : [])];
  return comparar ? copia.sort(comparar) : copia;
};

// ¿Algún campo contiene lo buscado? Sin buscar nada, todo coincide.
export const coincide = (buscado, ...campos) => {
  const q = plano(buscado);
  return !q || campos.some((c) => plano(c).includes(q));
};
