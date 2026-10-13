import { useState } from 'react';
import toast from 'react-hot-toast';
import { dashboardService } from '../../api/dashboardService';
import { useAjustesCtx } from '../../context/AjustesContext';
import { descargarArchivo } from '../../utils/descargar';
import { cargarLogo, hoyLocal } from '../../utils/reportesPdf';
import { construirReportePredictivo } from '../../utils/reportePredictivo';

/*
 * ============================================================
 * DESCARGAR EL REPORTE PREDICTIVO — DescargaPredictiva.jsx
 * ============================================================
 * El bloque del modal "Descargar" del tablero (solo el administrador): pide
 * el pronóstico al servidor —que lo calcula con el servicio de analítica— y
 * lo arma en PDF con los datos de la tienda en el encabezado (nombre,
 * dirección, teléfono, NIT y NRC de Personalización, y el logo si hay).
 *
 * El servicio de analítica duerme cuando nadie lo usa (Render gratis): la
 * primera vez del día puede tardar cerca de un minuto, y eso se dice
 * mientras espera, para que nadie crea que se trabó.
 * ============================================================
 */
const DescargaPredictiva = ({ alTerminar }) => {
  const { ajustes } = useAjustesCtx();
  const [calculando, setCalculando] = useState(false);

  const descargar = async () => {
    setCalculando(true);
    try {
      const datos = await dashboardService.getPronostico();
      if (datos?.vacio) {
        toast('Todavía no hay ventas de las que aprender: el reporte sale con la primera venta.');
        return;
      }
      const negocio = ajustes?.negocio || {};
      const tienda = {
        nombre: `${ajustes?.nombreLinea1 || ''} ${ajustes?.nombreLinea2 || ''}`.trim() || 'Tienda la 635',
        direccion: ajustes?.direccion,
        telefono: negocio.telefono,
        nit: negocio.nit,
        nrc: negocio.nrc,
        logo: await cargarLogo(ajustes?.logoUrl),
      };
      const doc = construirReportePredictivo(datos, tienda);
      // No doc.save(): dentro de la app del teléfono no descargaría nada (ver utils/descargar.js).
      await descargarArchivo(doc.output('blob'), `reporte-predictivo-la635-${hoyLocal()}.pdf`);
      alTerminar?.();
    } catch (error) {
      console.error('Error generando el reporte predictivo:', error);
      toast.error(error?.response?.data?.message || 'No se pudo generar el reporte predictivo. Intente de nuevo.');
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div className="border-t border-gray-100 pt-5">
      <p className="text-sm font-bold text-gray-700 mb-1">Reporte predictivo</p>
      <p className="text-xs text-gray-500 mb-3">
        Lo que se espera vender las próximas 4 semanas, qué productos se agotarían y qué conviene pedir a cada proveedor.
      </p>
      <button
        onClick={descargar}
        disabled={calculando}
        className="w-full bg-[#003049] hover:bg-[#00283D] disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-full"
      >
        {calculando ? 'Calculando el pronóstico…' : 'Descargar reporte predictivo'}
      </button>
      {calculando && (
        <p className="text-xs text-gray-500 mt-2" role="status">
          Si el servicio de análisis estaba en reposo, puede tardar hasta un minuto.
        </p>
      )}
    </div>
  );
};

export default DescargaPredictiva;
