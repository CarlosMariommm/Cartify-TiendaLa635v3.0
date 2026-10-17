// EDAD — edad.js
// La cuenta de años para el candado de los productos +18. Es una barrera BLANDA a propósito: una
// fecha de nacimiento se puede mentir.

export const EDAD_MINIMA = 18;

// Años cumplidos a partir de una fecha (Date o "YYYY-MM-DD"). null si no hay/─inválida.
export const calcularEdad = (fecha) => {
  if (!fecha) return null;
  const nac = new Date(fecha);
  if (isNaN(nac.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  // Si todavía no llegó su cumpleaños este año, resta uno.
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
};

export const esMayorDeEdad = (fecha, minima = EDAD_MINIMA) => {
  const edad = calcularEdad(fecha);
  return edad != null && edad >= minima;
};
