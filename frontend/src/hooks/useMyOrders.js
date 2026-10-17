import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../api/orderService';
import { useAuth } from './useAuth';

// useMyOrders — trae los pedidos del cliente logueado (su historial). La lógica de carga vive
// aquí; la página MisPedidos solo pinta la lista. Opcionalmente filtra por estado (ej. 'entregado'
// para la vista de Recibos).
export const useMyOrders = (statusFilter = null) => {
  // Los pedidos son de un CLIENTE. Con la sesión del personal —que en la
  // tienda puede ser la activa— se preguntaba por los pedidos de un id que no
  // es de nadie. Ver useAuth.
  const { user, esCliente } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!esCliente) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await orderService.getMyOrders(user.id);
      const lista = Array.isArray(data) ? data : [];
      // Si nos pidieron un estado específico, filtramos aquí.
      setOrders(statusFilter ? lista.filter((o) => o.status === statusFilter) : lista);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, esCliente, statusFilter]);

  useEffect(() => { cargar(); }, [cargar]);

  return { orders, loading, refrescar: cargar };
};
