import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { loyaltyService } from '../api/loyaltyService';

// useLoyaltyConfig — para el ADMIN: carga y guarda la config del programa de puntos (tasa por
// dólar, meses de vencimiento, activo/inactivo). La lógica vive aquí; la página Fidelidad solo
// pinta el formulario.
export const useLoyaltyConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const data = await loyaltyService.getConfig();
        setConfig(data);
      } catch (error) {
        console.error('Error cargando config de fidelidad:', error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const guardar = async (data) => {
    try {
      setSaving(true);
      const res = await loyaltyService.updateConfig(data);
      setConfig(res.config || data);
      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error guardando config de fidelidad:', error);
    } finally {
      setSaving(false);
    }
  };

  return { config, loading, saving, guardar };
};
