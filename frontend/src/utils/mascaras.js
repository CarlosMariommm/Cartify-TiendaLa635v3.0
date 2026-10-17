// MÁSCARAS DE ENTRADA — mascaras.js
// Los campos con formato fijo (DUI, teléfono) se escriben solos: la persona teclea números y el
// guion aparece donde va. Con la máscara, todos entran igual.

const soloDigitos = (valor) => String(valor || '').replace(/\D/g, '');

/*
 * DUI salvadoreño: 8 dígitos, guion y el verificador. 01234567-8
 */
export const formatearDui = (valor) => {
  const d = soloDigitos(valor).slice(0, 9);
  if (d.length <= 8) return d;
  return `${d.slice(0, 8)}-${d.slice(8)}`;
};

/*
 * Teléfono de El Salvador: 8 dígitos partidos a la mitad. 7890-1234
 */
export const formatearTelefono = (valor) => {
  const d = soloDigitos(valor).slice(0, 8);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
};

// Tarjeta: grupos de cuatro. 4111 1111 1111 1111 (Va en el mismo lugar que las otras porque es el
// mismo problema.)
export const formatearTarjeta = (valor) => {
  const d = soloDigitos(valor).slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
};

// Vencimiento de tarjeta: MM/AA
export const formatearVencimiento = (valor) => {
  const d = soloDigitos(valor).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

// Está completo (no si está bien: para eso están las validaciones). Sirve para saber si el campo
// terminó de llenarse.
export const duiCompleto = (valor) => soloDigitos(valor).length === 9;
export const telefonoCompleto = (valor) => soloDigitos(valor).length === 8;

// Para usar directo en un onChange de react-hook-form o de useState: onChange={(e) =>
// e.target.value = formatearDui(e.target.value)} Envuelto para no repetir el patrón en cada
// formulario.
export const alEscribir = (formateador, alCambiar) => (e) => {
  const formateado = formateador(e.target.value);
  e.target.value = formateado;
  if (alCambiar) alCambiar(formateado);
  return formateado;
};

// Un id de Mongo suelto: 24 caracteres hexadecimales y nada más. Algunos clientes viejos guardaron
// en su lista de direcciones la REFERENCIA a otra colección en vez del texto, y esa colección hoy
// no la lee nadie.
const pareceIdDeMongo = (texto) => /^[a-f0-9]{24}$/i.test(texto);

// Una dirección de cliente en una línea, venga como texto (las viejas) o como objeto { nombre,
// direccion, referencia } (las nuevas). Sin esto, un join() sobre las nuevas imprime "[object
// Object]".
export const direccionEnTexto = (dir) => {
  if (!dir) return '';

  if (typeof dir === 'string') {
    const texto = dir.trim();
    return pareceIdDeMongo(texto) ? '' : texto;
  }

  if (typeof dir !== 'object') return '';

  const cuerpo = [dir.nombre, dir.direccion].filter(Boolean).join(': ');
  if (!cuerpo) return ''; // un objeto sin nombre ni dirección no tiene nada que mostrar
  return dir.referencia ? `${cuerpo} (${dir.referencia})` : cuerpo;
};

export const direccionesEnTexto = (lista) =>
  (Array.isArray(lista) ? lista : [lista]).map(direccionEnTexto).filter(Boolean).join(' · ');

// Cuántos caracteres puede tener el campo ya formateado (para maxLength).
export const LARGO_DUI = 10;        // 8 + guion + 1
export const LARGO_TELEFONO = 9;    // 4 + guion + 4
