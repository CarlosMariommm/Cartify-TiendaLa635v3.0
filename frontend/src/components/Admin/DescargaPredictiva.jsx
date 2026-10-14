import { useState } from 'react';
import toast from 'react-hot-toast';
import { dashboardService } from '../../api/dashboardService';
import { useAjustesCtx } from '../../context/AjustesContext';
import { descargarReportePredictivo } from '../../utils/descargarPredictivo';
import { pronosticoParaMostrar } from '../../utils/reportePredictivo';

/*
 * ============================================================
 * DESCARGAR EL REPORTE PREDICTIVO — DescargaPredictiva.jsx
 * ============================================================
 * El bloque del modal "Descargar" del tablero (solo el administrador): pide
 * el pronóstico al servidor —que lo calcula con el servicio de analítica— y
 * lo arma en PDF (ver utils/descargarPredictivo.js). La pantalla Pronóstico
 * tiene su propio botón con el mismo PDF.
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
      // Con la misma regla que la pantalla Pronóstico: si la tienda real todavía
      // no junta 4 semanas, sale el de la demostración (el PDF lo dice).
      const datos = await pronosticoParaMostrar(dashboardService.getPronostico);
      if (datos?.vacio) {
        toast('Todavía no hay ventas de las que aprender: el reporte sale con la primera venta.');
        return;
      }
      await descargarReportePredictivo(datos, ajustes);
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
          Si el servicio de análisis estaba en reposo, puede tardar un par de minutos.
        </p>
      )}
    </div>
  );
};

export default DescargaPredictiva;
