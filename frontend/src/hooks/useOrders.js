import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { orderService } from '../api/orderService';
import { alCambiarTiqui, TIPOS_PEDIDOS } from '../utils/cambiosDeTiqui';
import { sellosDeCancelacion } from '../utils/pasosPedido';

// Cada cuánto se vuelve a pedir la lista mientras la pantalla está a la vista.
const CADA_CUANTO_MS = 30 * 1000;

// useOrders — para el ADMIN/EMPLEADO: trae todos los pedidos y permite avanzar su estado (pagado →
// preparando → entregado) o cancelarlo con un motivo (extras.motivoCancelacion). La lógica vive
// aquí; la página Orders solo pinta las tarjetas y llama a cambiarEstado.
export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // `enSilencio`: sin el "Cargando…", para los refrescos que nadie pidió.
  const cargar = useCallback(async ({ enSilencio = false } = {}) => {
    try {
      if (!enSilencio) setLoading(true);
      const data = await orderService.getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      if (!enSilencio) setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  // Tiqui del panel movió un pedido: la lista se pone al día sola.
  useEffect(() => alCambiarTiqui(TIPOS_PEDIDOS, () => cargar({ enSilencio: true })), [cargar]);

  // La lista se pone al día sola cada medio minuto, y al volver a la pestaña. Con la pestaña
  // escondida no se pregunta nada.
  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === 'visible') cargar({ enSilencio: true });
    };
    const reloj = setInterval(refrescar, CADA_CUANTO_MS);
    document.addEventListener('visibilitychange', refrescar);
    return () => {
      clearInterval(reloj);
      document.removeEventListener('visibilitychange', refrescar);
    };
  }, [cargar]);

  // `extras` viaja tal cual al backend. Hoy lo usa la entrega para mandar el código que el cliente
  // dictó (o la omisión razonada); ver orderService.
  const cambiarEstado = async (id, status, extras = {}) => {
    try {
      const r = await orderService.updateStatus(id, status, undefined, extras);
      // Se refleja el cambio sin recargar todo. Ver sellosDeCancelacion.
      const sellos = sellosDeCancelacion(r?.order);
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, ...sellos, status } : o)));
      const etiquetas = { preparando: 'En preparación', en_camino: 'En camino', listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado' };
      toast.success(`Pedido: ${etiquetas[status] || status}`);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      // Casi siempre es que el pedido cambió por otro lado (el cliente lo canceló, otra persona lo
      // movió): se pone al día la lista para que la tarjeta diga lo que de verdad pasa.
      cargar({ enSilencio: true });
      // Se vuelve a lanzar. El aviso al usuario ya lo pintó el interceptor de api.js; esto solo devuelve
      // el "no se pudo" a la pantalla.
      throw error;
    }
  };

  return { orders, loading, cargar, cambiarEstado };
};
