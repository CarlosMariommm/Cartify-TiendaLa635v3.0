import { descargarArchivo } from './descargar';
import { cargarLogo, hoyLocal } from './reportesPdf';
import { construirReportePredictivo } from './reportePredictivo';

/*
 * Arma y descarga el reporte predictivo en PDF con los datos de la tienda en
 * el encabezado (Personalización: nombre, dirección, teléfono, NIT, NRC y el
 * logo si hay). Lo usan el modal "Descargar" del tablero y la pantalla
 * Pronóstico, que ya tiene el pronóstico en la mano y no lo vuelve a pedir.
 */
export const datosDeLaTienda = async (ajustes) => {
  const negocio = ajustes?.negocio || {};
  return {
    nombre: `${ajustes?.nombreLinea1 || ''} ${ajustes?.nombreLinea2 || ''}`.trim() || 'Tienda la 635',
    direccion: ajustes?.direccion,
    telefono: negocio.telefono,
    nit: negocio.nit,
    nrc: negocio.nrc,
    logo: await cargarLogo(ajustes?.logoUrl),
  };
};

export const descargarReportePredictivo = async (datos, ajustes) => {
  const doc = construirReportePredictivo(datos, await datosDeLaTienda(ajustes));
  // No doc.save(): dentro de la app del teléfono no descargaría nada (ver utils/descargar.js).
  await descargarArchivo(doc.output('blob'), `reporte-predictivo-la635-${hoyLocal()}.pdf`);
};
