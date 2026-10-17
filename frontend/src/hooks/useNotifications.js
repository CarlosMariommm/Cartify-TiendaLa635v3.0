import { useState, useEffect } from 'react';
import { clientService } from '../api/clientService';
import { useAuth } from './useAuth';

// useNotifications — preferencias de notificación del cliente, por canal: `correo` →
// notificationPrefs (los correos) `app` → avisosApp (los avisos del teléfono) Apagar uno no toca
// al otro (ver backend/src/utils/preferenciasAvisos.js).
const DEFAULTS = {
  correo: { promociones: true, nuevosProductos: true, pedidoCerca: false },
  app: {
    promociones: true,
    favoritosEnOferta: true,
    nuevosProductos: true,
    pedidoPreparando: true,
    pedidoListo: true,
    pedidoEntregado: true,
    pedidoCancelado: true,
  },
};

const desdeCliente = (cliente) => ({
  correo: { ...DEFAULTS.correo, ...(cliente?.notificationPrefs || {}) },
  app: { ...DEFAULTS.app, ...(cliente?.avisosApp || {}) },
});

export const useNotifications = () => {
  const { user, esCliente } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      // Con sesión de personal esto daría 404: ver useAuth.
      if (!esCliente) { setLoading(false); return; }
      try {
        setLoading(true);
        const cliente = await clientService.getClientById(user.id);
        setPrefs(desdeCliente(cliente));
      } catch (error) {
        console.error('Error cargando notificaciones:', error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user?.id, esCliente]);

  // Cambia un interruptor ('app' o 'correo'): la UI al instante y la base después.
  const toggle = async (canal, clave) => {
    if (!esCliente) return;
    const valor = !prefs[canal][clave];
    const antes = prefs;
    setPrefs({ ...prefs, [canal]: { ...prefs[canal], [clave]: valor } }); // optimista
    try {
      await clientService.updateNotifications(user.id, { [canal]: { [clave]: valor } });
    } catch (error) {
      console.error('Error guardando notificación:', error);
      setPrefs(antes); // si falla, revertimos
    }
  };

  return { prefs, loading, toggle };
};
