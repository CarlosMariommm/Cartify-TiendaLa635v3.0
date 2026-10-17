// AGREGAR AL CALENDARIO — calendario.js
// Genera un archivo .ics (iCalendar) y lo entrega para descargar.

import { descargarArchivo } from './descargar';

// Escapa comas, punto y coma, barras y saltos de línea, como pide el formato.
const escapar = (texto = '') =>
  String(texto)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// Fecha → 'AAAAMMDDTHHMMSS' en hora local (sin zona, "flotante": el calendario
// la interpreta en la hora del teléfono, que es justo lo que se quiere).
const aFechaLocal = (fecha, hora = 9, minuto = 0) => {
  const d = new Date(fecha);
  d.setHours(hora, minuto, 0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
};

// Sello de tiempo en UTC, requerido por el formato (DTSTAMP).
const selloUTC = (fecha) => {
  const d = new Date(fecha);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
};

// Fecha → 'AAAAMMDDTHHMMSSZ' en UTC, el formato que pide el enlace del calendario.
const aFechaUTC = (fecha, horaLocal = 9, minutoLocal = 0) => {
  const d = new Date(fecha);
  d.setHours(horaLocal, minutoLocal, 0, 0); // 9:00 en la hora del que lo genera
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
};

// Enlace "agregar al calendario": abre la página de crear evento con los datos ya puestos, para
// que en el teléfono solo se toque Guardar. Sirve para poner DENTRO de un QR: el dueño lo escanea
// desde la compu y el evento cae en el calendario de su teléfono.
export const urlAgregarCalendario = ({ titulo, descripcion = '', fecha }) => {
  const inicio = aFechaUTC(fecha, 9, 0);
  const fin = aFechaUTC(fecha, 9, 30);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo || 'Recordatorio',
    dates: `${inicio}/${fin}`,
    details: descripcion || '',
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
};

// Arma y descarga un evento. titulo, descripcion: texto del evento. fecha: cuándo (Date o ISO). Se
// pone a las 9:00 de ese día. diasAntes: cuántos días antes recuerda (por defecto 1). uid, ahora:
// se pasan desde afuera para no usar Date.now()/random aquí.
export const descargarEventoIcs = ({ titulo, descripcion = '', fecha, diasAntes = 1, uid, ahora }) => {
  const inicio = aFechaLocal(fecha, 9, 0);
  // Fin media hora después (mismo día, 9:30). Un evento con duración se ve mejor
  // que uno de cero minutos en algunos calendarios.
  const fin = aFechaLocal(fecha, 9, 30);
  const stamp = selloUTC(ahora || fecha);
  const idEvento = (uid || `${inicio}-${Math.abs((titulo || '').length)}`) + '@tienda635';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tienda la 635//Panel//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${idEvento}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${inicio}`,
    `DTEND:${fin}`,
    `SUMMARY:${escapar(titulo)}`,
    descripcion ? `DESCRIPTION:${escapar(descripcion)}` : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(titulo)}`,
    // Recordatorio N días antes de las 9:00 del día del vencimiento.
    `TRIGGER:-P${Math.max(0, Math.round(diasAntes))}D`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  // Se entrega como descarga; el teléfono lo abre con su calendario. Dentro
  // de la app va por el servidor (ver utils/descargar.js).
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  return descargarArchivo(blob, `recordatorio-${(titulo || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.ics`);
};
