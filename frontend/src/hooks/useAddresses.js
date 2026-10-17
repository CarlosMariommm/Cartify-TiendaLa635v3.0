import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tAhora } from '../utils/idioma';
import { clientService } from '../api/clientService';
import { useAuth } from './useAuth';

// useAddresses — gestiona las direcciones de entrega del cliente logueado. Carga la lista, y
// expone agregar/eliminar (que guardan la lista completa en la base). La lógica vive aquí; la
// página Direcciones solo pinta.

// Una dirección es { nombre, direccion, referencia, lat, lng }, pero las de los clientes que ya
// existían son texto suelto. En vez de migrar la base, se normaliza al leer: lo viejo sigue
// funcionando y lo nuevo trae sus datos.
export const normalizarDireccion = (item) => {
  if (typeof item === 'string') return { nombre: '', direccion: item, referencia: '', lat: null, lng: null };
  return {
    nombre: item?.nombre || '',
    direccion: item?.direccion || '',
    referencia: item?.referencia || '',
    lat: item?.lat ?? null,
    lng: item?.lng ?? null,
  };
};

export const useAddresses = () => {
  const { user, esCliente } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      // Este hook cuelga del DireccionProvider, que envuelve TODA la app en App.jsx —incluido el panel—.
      if (!esCliente) { setLoading(false); return; }
      try {
        setLoading(true);
        const cliente = await clientService.getClientById(user.id);
        const lista = Array.isArray(cliente?.clientAddress) ? cliente.clientAddress : [];
        setAddresses(lista.map(normalizarDireccion));
      } catch (error) {
        console.error('Error cargando direcciones:', error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user?.id, esCliente]);

  // Guarda la lista completa en la base y actualiza el estado local.
  const guardar = async (nuevas) => {
    if (!esCliente) return;
    try {
      setSaving(true);
      await clientService.updateAddresses(user.id, nuevas);
      setAddresses(nuevas);
      toast.success(tAhora('Direcciones actualizadas'));
    } catch (error) {
      console.error('Error guardando direcciones:', error);
    } finally {
      setSaving(false);
    }
  };

  const agregar = (direccion) => {
    const dir = normalizarDireccion(direccion);
    if (!dir.direccion.trim()) return;
    guardar([...addresses, dir]);
  };

  const eliminar = (indice) => {
    guardar(addresses.filter((_, i) => i !== indice));
  };

  return { addresses, loading, saving, agregar, eliminar };
};
