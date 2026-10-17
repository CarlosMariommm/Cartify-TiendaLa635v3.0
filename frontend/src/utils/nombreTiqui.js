// TIQUI Y EL NOMBRE DEL CLIENTE — nombreTiqui.js
// Con la sesión iniciada, Tiqui a veces llama a la persona por su nombre: "¡Listo, María!

// "MARÍA José Pérez" → "María". Vacío si no parece un nombre (un correo, un número).
export const primerNombre = (completo) => {
  const primero = String(completo || '').trim().split(/\s+/)[0] || '';
  if (!/^[\p{L}'-]{2,20}$/u.test(primero)) return '';
  return primero.charAt(0).toLocaleUpperCase('es') + primero.slice(1).toLocaleLowerCase('es');
};

// Dónde cabe el nombre sin forzar la frase. Si no hay un lugar natural, no se pone: mejor sin
// nombre que "María, 2 Coca-Cola agregadas". "¡Listo! Te agregué…" → "¡Listo, María!
export const ponerNombre = (texto, nombre) => {
  const t = String(texto || '');
  if (!nombre || !t || t.includes(nombre)) return null;
  const exclamacion = t.match(/^¡([^!¡?,]{1,24})!/);
  if (exclamacion) return t.replace(exclamacion[0], `¡${exclamacion[1]}, ${nombre}!`);
  if (/[\p{L}\d)]\?$/u.test(t)) return t.replace(/\?$/, `, ${nombre}?`);
  return null;
};

// Cuándo. La primera respuesta de la charla, algo más de la mitad de las veces (hace de saludo);
// después, más o menos una de cada tres, y nunca en dos respuestas seguidas ni en dos de tres.
export const conNombreAVeces = (texto, nombre, estado, azar = Math.random) => {
  estado.respuestas = (estado.respuestas || 0) + 1;
  if (!nombre) return texto;
  const n = estado.respuestas;
  const desdeLaUltima = n - (estado.ultimaConNombre ?? -Infinity);
  const toca = n === 1 ? azar() < 0.6 : desdeLaUltima >= 3 && azar() < 0.35;
  if (!toca) return texto;
  const conNombre = ponerNombre(texto, nombre);
  if (!conNombre) return texto;
  estado.ultimaConNombre = n;
  return conNombre;
};
