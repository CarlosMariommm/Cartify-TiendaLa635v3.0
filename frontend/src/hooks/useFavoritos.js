import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tAhora } from '../utils/idioma';
import { ICONOS } from '../utils/iconosAviso';
import { clientService } from '../api/clientService';
import { useAuth } from './useAuth';

// useFavoritos — el corazón de las tarjetas de producto. Ahora vive en la cuenta del cliente. Sin
// sesión no se guarda nada y se manda a iniciar sesión.
export const useFavoritos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Solo los clientes tienen favoritos: pedirlos con un id de admin daría 404.
  const esCliente = user?.type === 'client';

  const cargar = useCallback(async () => {
    if (!user?.id || user?.type !== 'client') { setCargando(false); return; }
    try {
      setCargando(true);
      const lista = await clientService.getFavorites(user.id);
      const favoritos = Array.isArray(lista) ? lista : [];
      setProductos(favoritos);
      setIds(favoritos.map((p) => String(p._id)));
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    } finally {
      setCargando(false);
    }
  }, [user?.id, user?.type]);

  useEffect(() => { cargar(); }, [cargar]);

  const esFavorito = useCallback((productoId) => ids.includes(String(productoId)), [ids]);

  const alternar = async (productoId, nombre = tAhora('El producto')) => {
    if (!esCliente) {
      toast(tAhora('Inicia sesión para guardar tus favoritos'));
      // Se le devuelve a la tienda después de entrar: estaba viendo un
      // producto, no buscando su cuenta.
      navigate('/iniciar-sesion?volver=/');
      return;
    }

    const id = String(productoId);
    const estaba = ids.includes(id);

    // Optimista: el corazón responde al instante.
    setIds((prev) => (estaba ? prev.filter((x) => x !== id) : [...prev, id]));

    try {
      await clientService.toggleFavorite(user.id, id);
      toast.success(estaba ? tAhora('{nombre} salió de favoritos', { nombre }) : tAhora('{nombre} guardado en favoritos', { nombre }), {
        id: 'favorito',
        icon: estaba ? ICONOS.sinFavorito : ICONOS.favorito,
      });
      // La lista completa solo se recarga si estamos mostrándola.
      if (productos.length || !estaba) cargar();
    } catch {
      // Se deshace: mejor un corazón que vuelve atrás que una mentira guardada.
      setIds((prev) => (estaba ? [...prev, id] : prev.filter((x) => x !== id)));
      toast.error(tAhora('No se pudo guardar el favorito'));
    }
  };

  return { ids, productos, cargando, esFavorito, alternar, recargar: cargar };
};
