// VALIDACIONES — validaciones.js
// Reglas reutilizables para los formularios del admin.

// ── Teclas ──────────────────────────────────────────────────
// En un input number el navegador deja escribir "e", "+" y "-": los bloqueamos.
export const bloquearTeclasNumero = (e) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};

// Para códigos y teléfonos: solo dígitos y guiones.
export const bloquearNoDigitos = (e) => {
  const permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', '-'];
  if (permitidas.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/[0-9]/.test(e.key)) e.preventDefault();
};

// ── Reglas para react-hook-form ─────────────────────────────
export const reglaPrecio = (etiqueta = 'El precio') => ({
  required: `${etiqueta} es obligatorio`,
  validate: (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return 'Debe ser un número válido';
    if (n <= 0) return `${etiqueta} debe ser mayor que 0`;
    if (n > 100000) return `${etiqueta} parece demasiado alto`;
    return true;
  },
});

export const reglaEntero = (etiqueta, minimo = 0) => ({
  required: `${etiqueta} es obligatorio`,
  validate: (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return 'Debe ser un número válido';
    if (!Number.isInteger(n)) return `${etiqueta} debe ser un número entero`;
    if (n < minimo) return `${etiqueta} no puede ser menor que ${minimo}`;
    return true;
  },
});

// ── DUI: hasta dónde llega esta validación ──────────────────
// NO se puede comprobar que un DUI exista de verdad: ese registro vive en el RNPN y no hay una API
// pública y gratuita para consultarlo.
const digitosDelDui = (valor) => String(valor || '').replace(/\D/g, '');

export const duiEsValido = (valor) => {
  const d = digitosDelDui(valor);
  if (d.length !== 9) return false;

  // Los nueve dígitos iguales se rechazan de entrada. "00000000-0" y "11111111-1" CUADRAN con el
  // verificador —son correctos en la aritmética— pero nadie tiene ese DUI. Son lo que sale cuando
  // alguien llena el campo por salir del paso, y el algoritmo solo no los detiene.
  if (/^(\d)\1{8}$/.test(d)) return false;

  let suma = 0;
  for (let i = 0; i < 8; i++) suma += Number(d[i]) * (9 - i);

  return (10 - (suma % 10)) % 10 === Number(d[8]);
};

// Mensaje único: si el número no cuadra, la persona necesita saber que revise
// lo que escribió, no enterarse de que existe un dígito verificador.
export const MENSAJE_DUI_INVALIDO = 'Ese DUI no parece correcto, revisa los números';

// DUI del personal: obligatorio y con formato 12345678-9. A propósito NO revisa el dígito
// verificador. En la base ya hay empleados cargados con DUI de prueba, y si la regla los
// rechazara, cambiarle el teléfono a uno de ellos se volvería imposible hasta corregir su DUI.
export const reglaDui = {
  required: 'El DUI es obligatorio',
  pattern: { value: /^\d{8}-\d$/, message: 'Formato de DUI: 12345678-9' },
};

// DUI del cliente: OPCIONAL. Mucha gente del barrio no lo anda a mano y perder un registro por eso
// no vale la pena. Vacío pasa; si escribió algo, tiene que estar completo y cuadrar el
// verificador.
export const reglaDuiOpcional = {
  validate: (valor) => {
    const d = digitosDelDui(valor);
    if (!d.length) return true; // no lo puso: perfecto, seguimos
    if (d.length < 9) return 'El DUI lleva 9 dígitos (12345678-9)';
    return duiEsValido(valor) || MENSAJE_DUI_INVALIDO;
  },
};

// Teléfono salvadoreño: 8 dígitos, normalmente 1234-5678.
export const reglaTelefono = {
  required: 'El teléfono es obligatorio',
  pattern: { value: /^\d{4}-?\d{4}$/, message: 'Formato de teléfono: 1234-5678' },
};

export const reglaCodigoBarras = {
  required: 'El código de barras es obligatorio',
  pattern: { value: /^\d{6,20}$/, message: 'Solo dígitos (entre 6 y 20)' },
};

// ── Funciones sueltas (forms con useState) ──────────────────

// Devuelve el número si es válido dentro del rango, o null si no lo es.
export const numeroEnRango = (valor, { min = -Infinity, max = Infinity, entero = false } = {}) => {
  const n = Number(valor);
  if (valor === '' || valor === null || Number.isNaN(n)) return null;
  if (entero && !Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
};

// Avisa si una promoción deja productos vendiéndose POR DEBAJO DEL COSTO. No lo bloquea: una
// tienda puede querer un producto gancho a pérdida a propósito.
export const avisoVentaBajoCosto = ({ tipo, items, buyQty, payQty, costos = {}, precios = {} }) => {
  // Un anuncio no cambia el precio, así que no puede hacer perder plata. Si el producto ya se vendía
  // bajo costo, ese es un problema del producto y se avisa en su formulario, no aquí.
  if (tipo === 'anuncio') return null;

  const bajoCosto = [];

  items.forEach((it) => {
    const costo = Number(costos[it.productId]) || 0;
    const normal = Number(precios[it.productId]) || 0;
    if (costo <= 0) return; // sin costo cargado no hay nada que comparar

    let precioFinal = normal;
    if (tipo === 'descuento') {
      precioFinal = normal * (1 - (Number(it.discount) || 0) / 100);
    } else if (tipo === 'precio_fijo') {
      precioFinal = Number(it.fixedPrice) || 0;
    } else if (tipo === 'nxm') {
      // En un 3x2 cada unidad sale al promedio de lo que se paga.
      const compra = Number(buyQty) || 2;
      const paga = Number(payQty) || 1;
      precioFinal = compra > 0 ? (normal * paga) / compra : normal;
    }

    if (precioFinal < costo) {
      bajoCosto.push({ nombre: it.name, precioFinal, costo });
    }
  });

  if (!bajoCosto.length) return null;

  const primero = bajoCosto[0];
  const resto = bajoCosto.length - 1;
  return `"${primero.nombre}" quedaría a $${primero.precioFinal.toFixed(2)} y le cuesta $${primero.costo.toFixed(2)}: pierde $${(primero.costo - primero.precioFinal).toFixed(2)} en cada venta` +
    (resto > 0 ? ` (y ${resto} producto${resto > 1 ? 's' : ''} más)` : '');
};

// Valida una promoción completa antes de guardarla. Devuelve un mensaje de error, o null si todo
// está bien.
export const validarPromocion = ({ tipo, items, buyQty, payQty, precios = {} }) => {
  if (!items.length) return 'Agrega al menos un producto';

  // El anuncio solo necesita productos: no hay importes que revisar.
  if (tipo === 'anuncio') return null;

  if (tipo === 'descuento') {
    for (const it of items) {
      const d = numeroEnRango(it.discount, { min: 0, max: 100 });
      if (d === null) return `El descuento de "${it.name}" debe estar entre 0 y 100`;
      if (d === 0) return `"${it.name}" tiene 0% de descuento`;
    }
  }

  if (tipo === 'precio_fijo') {
    for (const it of items) {
      const p = numeroEnRango(it.fixedPrice, { min: 0.01 });
      if (p === null) return `El precio de "${it.name}" debe ser mayor que 0`;
      // Si el "precio de oferta" es mayor al normal, no es una oferta.
      const normal = precios[it.productId];
      if (normal && p >= normal) return `El precio de oferta de "${it.name}" debe ser menor a su precio normal ($${normal})`;
    }
  }

  if (tipo === 'nxm') {
    const compra = numeroEnRango(buyQty, { min: 2, entero: true });
    const paga = numeroEnRango(payQty, { min: 1, entero: true });
    if (compra === null) return 'En "Compra" pon un número entero de 2 o más';
    if (paga === null) return 'En "Paga" pon un número entero de 1 o más';
    if (paga >= compra) return 'En un NxM, "Paga" debe ser menor que "Compra" (ej. compra 2, paga 1)';
  }

  return null;
};
