import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { tAhora } from '../utils/idioma';
import { reviewService } from '../api/reviewService';
import { useAuth } from './useAuth';

// useReviews — las valoraciones reales de un producto. Sustituye al bloque de reseñas inventadas
// que traía la ficha: un 4.3 fijo, "5,961 reseñas" y dos comentarios de gente que no existe,
// idénticos en cada producto. Ahora, si nadie opinó, la ficha lo dice.
export const useReviews = (productoId) => {
  const { user } = useAuth();
  const [resumen, setResumen] = useState({ total: 0, promedio: 0, reparto: {}, reviews: [] });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!productoId) return;
    try {
      setCargando(true);
      const d = await reviewService.getByProduct(productoId);
      setResumen(d || { total: 0, promedio: 0, reparto: {}, reviews: [] });
    } catch (error) {
      console.error('Error cargando valoraciones:', error);
    } finally {
      setCargando(false);
    }
  }, [productoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const esCliente = user?.type === 'client' && !!user?.id;

  // La que ya escribió esta persona, si es que escribió alguna.
  const miValoracion = esCliente
    ? resumen.reviews.find((r) => String(r.clientId?._id || r.clientId) === String(user.id))
    : null;

  const guardar = async ({ rating, comment }) => {
    if (!esCliente) {
      toast(tAhora('Inicia sesión para dejar tu opinión'));
      return false;
    }

    setGuardando(true);
    try {
      const r = await reviewService.guardar({
        productId: productoId, clientId: user.id, rating, comment,
      });
      toast.success(tAhora(r.message));
      await cargar();
      return true;
    } catch {
      // El 403 de "no lo compró" ya lo muestra el interceptor de Axios.
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!esCliente) return;
    try {
      await reviewService.eliminar(productoId, user.id);
      toast.success(tAhora('Se quitó tu valoración'));
      await cargar();
    } catch (error) {
      console.error(error);
    }
  };

  return { ...resumen, cargando, guardando, miValoracion, puedeOpinar: esCliente, guardar, eliminar, recargar: cargar };
};
