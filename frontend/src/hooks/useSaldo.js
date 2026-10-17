import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { tAhora } from '../utils/idioma';
import { giftCardService } from '../api/giftCardService';
import { useAuth } from './useAuth';

// useSaldo — el saldo digital del cliente y el canje de tarjetas. El saldo NUNCA se calcula acá:
// siempre viene del servidor. Si lo lleváramos en el navegador, cualquiera lo edita desde las
// herramientas del desarrollador y se regala dinero.
export const useSaldo = () => {
  // `esCliente` y no `user?.id`: en la tienda la sesión activa puede ser la del personal, y pedir el
  // saldo con el id de un administrador devuelve 404 "Cliente no encontrado" — que el interceptor
  // pinta como un toast rojo en la cara de alguien que solo abrió su carrito. Ver useAuth.
  const { user, esCliente } = useAuth();
  const [saldo, setSaldo] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [canjeando, setCanjeando] = useState(false);

  const cargar = useCallback(async () => {
    if (!esCliente) { setCargando(false); return; }
    try {
      const d = await giftCardService.getBalance(user.id);
      setSaldo(Number(d.balance) || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [user?.id, esCliente]);

  useEffect(() => { cargar(); }, [cargar]);

  const canjear = async (codigo) => {
    const limpio = String(codigo || '').trim().toUpperCase();
    if (!limpio) { toast.error(tAhora('Escribe el código de tu tarjeta')); return false; }
    if (!esCliente) { toast.error(tAhora('Inicia sesión con tu cuenta de cliente para canjear')); return false; }

    setCanjeando(true);
    try {
      const r = await giftCardService.redeem(limpio, user.id);
      // El saldo que devuelve el servidor manda sobre cualquier cuenta local.
      setSaldo(Number(r.balance) || 0);
      toast.success(tAhora(r.message));
      return true;
    } catch (e) {
      toast.error(tAhora(e?.response?.data?.message || 'No se pudo canjear la tarjeta'));
      return false;
    } finally {
      setCanjeando(false);
    }
  };

  return { saldo, cargando, canjeando, canjear, recargar: cargar };
};
