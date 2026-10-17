import api from '../api/api';
import { enLaApp } from './puenteApp';

// BAJAR UN ARCHIVO — descargar.js
// Los reportes del panel (el PDF del Dashboard, el inventario, el recordatorio del calendario) se
// arman aquí, en el navegador.

const bajarEnElNavegador = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Se libera un momento después, cuando ya arrancó la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const descargarArchivo = async (blob, nombre) => {
  if (!enLaApp()) {
    bajarEnElNavegador(blob, nombre);
    return;
  }
  const { data } = await api.post(`/descargas?nombre=${encodeURIComponent(nombre)}`, blob, {
    headers: { 'Content-Type': blob.type || 'application/pdf' },
  });
  window.location.assign(`${api.defaults.baseURL}/descargas/${data.clave}/${encodeURIComponent(nombre)}`);
};
