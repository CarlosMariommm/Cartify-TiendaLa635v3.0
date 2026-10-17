import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tAhora } from '../utils/idioma';
import { clientService } from '../api/clientService';
import { useAuth } from './useAuth';

// usePaymentMethods — gestiona los métodos de pago guardados del cliente. Guardamos SOLO datos no
// sensibles (tipo, alias, marca, últimos 4, titular y vencimiento). La lógica vive aquí; la página
// MetodoPago solo pinta la lista y el formulario.
export const usePaymentMethods = () => {
  const { user, esCliente } = useAuth();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      // Con sesión de personal esto daría 404: ver useAuth.
      if (!esCliente) { setLoading(false); return; }
      try {
        setLoading(true);
        const cliente = await clientService.getClientById(user.id);
        setMethods(Array.isArray(cliente?.paymentMethods) ? cliente.paymentMethods : []);
      } catch (error) {
        console.error('Error cargando métodos de pago:', error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user?.id, esCliente]);

  const guardar = async (nuevos) => {
    if (!esCliente) return false;
    try {
      setSaving(true);
      await clientService.updatePaymentMethods(user.id, nuevos);
      setMethods(nuevos);
      toast.success(tAhora('Métodos de pago actualizados'));
      return true;
    } catch (error) {
      console.error('Error guardando métodos de pago:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const agregar = (metodo) => guardar([...methods, metodo]);
  const eliminar = (indice) => guardar(methods.filter((_, i) => i !== indice));

  return { methods, loading, saving, agregar, eliminar };
};
