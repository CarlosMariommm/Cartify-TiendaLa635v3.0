import { useState, useEffect, useRef, useCallback } from 'react';
import { dashboardService } from '../api/dashboardService';

// useDashboard — datos del resumen del admin. Importante: el resumen completo se pide UNA vez al
// entrar. Cambiar el periodo (Semana/Mes/Año) solo vuelve a pedir la GRÁFICA, porque es lo único
// que cambia — así el dashboard no se repinta entero por tocar un botón.
export const useDashboard = () => {
  const [data, setData] = useState(null);
  const [grafica, setGrafica] = useState([]);
  const [periodo, setPeriodo] = useState('mes');
  const [loading, setLoading] = useState(true);
  const [loadingGrafica, setLoadingGrafica] = useState(false);

  // Nos sirve para no pedir la gráfica dos veces en el primer render.
  const yaCargoResumen = useRef(false);

  // El periodo elegido, para "recargar". El resumen se arma una sola vez, así que su función no
  // depende del periodo; antes lo leía de cuando se abrió la pantalla y recargar con "Semana" puesta
  // traía la gráfica del mes.
  const periodoRef = useRef(periodo);
  useEffect(() => { periodoRef.current = periodo; }, [periodo]);

  const pedirResumen = useCallback(async () => {
    try {
      const res = await dashboardService.getSummary(periodoRef.current);
      setData(res);
      setGrafica(res.grafica || []);
      yaCargoResumen.current = true;
    } catch (error) {
      console.error('Error cargando el dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Al entrar ya arranca "cargando": no hace falta prenderlo aquí.
  useEffect(() => { pedirResumen(); }, [pedirResumen]);

  const recargar = useCallback(() => {
    setLoading(true);
    return pedirResumen();
  }, [pedirResumen]);

  // Cambio de periodo → solo la gráfica.
  useEffect(() => {
    if (!yaCargoResumen.current) return;
    let cancelado = false;
    const cargarGrafica = async () => {
      try {
        setLoadingGrafica(true);
        const res = await dashboardService.getChart(periodo);
        if (!cancelado) setGrafica(res.grafica || []);
      } catch (error) {
        console.error('Error cargando la gráfica:', error);
      } finally {
        if (!cancelado) setLoadingGrafica(false);
      }
    };
    cargarGrafica();
    return () => { cancelado = true; }; // si cambian de periodo rápido, ignoramos la respuesta vieja
  }, [periodo]);

  return { data, grafica, loading, loadingGrafica, periodo, setPeriodo, recargar };
};
