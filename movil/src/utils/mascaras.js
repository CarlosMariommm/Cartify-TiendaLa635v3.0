// MÁSCARAS DE ENTRADA — mascaras.js
// Puerto de `frontend/src/utils/mascaras.js`.

const soloDigitos = (valor) => String(valor || '').replace(/\D/g, '');

// DUI salvadoreño: 8 dígitos, guion y el verificador. 01234567-8
export const formatearDui = (valor) => {
  const d = soloDigitos(valor).slice(0, 9);
  if (d.length <= 8) return d;
  return `${d.slice(0, 8)}-${d.slice(8)}`;
};

// Teléfono de El Salvador: 8 dígitos partidos a la mitad. 7890-1234
export const formatearTelefono = (valor) => {
  const d = soloDigitos(valor).slice(0, 8);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
};

// Fecha de nacimiento: día y mes primero, como se dice acá. 31/12/2000
export const formatearFecha = (valor) => {
  const d = soloDigitos(valor).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

// Está completo (no si está bien: para eso están las validaciones).
export const duiCompleto = (valor) => soloDigitos(valor).length === 9;
export const telefonoCompleto = (valor) => soloDigitos(valor).length === 8;

// Cuántos caracteres puede tener el campo ya formateado (para maxLength).
export const LARGO_DUI = 10;        // 8 + guion + 1
export const LARGO_TELEFONO = 9;    // 4 + guion + 4
export const LARGO_FECHA = 10;      // 2 + barra + 2 + barra + 4

// "31/12/2000" (lo que se ve en el campo) -> "2000-12-31" (lo que ya manda el <input type="date">
// de la web y lo que espera el backend). `null` si está incompleta o si no es una fecha de
// calendario real.
export const fechaISO = (valor) => {
  const d = soloDigitos(valor);
  if (d.length !== 8) return null;

  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const anio = Number(d.slice(4, 8));

  const fecha = new Date(anio, mes - 1, dia);
  const esFechaReal =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  if (!esFechaReal) return null;

  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

// El camino de vuelta: lo que viene de la base ("2000-12-31", o una fecha ISO completa con hora)
// -> "31/12/2000", que es lo que muestra el campo. Cadena vacía si no hay fecha o no se entiende.
export const fechaVisible = (valor) => {
  if (!valor) return '';
  const [fecha] = String(valor).split('T');
  const [anio, mes, dia] = fecha.split('-');
  if (!anio || !mes || !dia) return '';
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
};
