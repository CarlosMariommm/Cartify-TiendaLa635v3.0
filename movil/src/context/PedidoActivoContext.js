import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getPedidosDeCliente } from '../api/pedidosApi';
import { suscribirseASimulacion } from '../utils/simulacionPedido';

// PEDIDO ACTIVO — PedidoActivoContext.js
// Copia de `frontend/src/context/PedidoActivoContext.jsx`: los pedidos del cliente, en un solo
// lugar para toda la sesión.

const CADA_CUANTO_REFRESCAR_MS = 20000;

const PedidoActivoContext = createContext(null);

export const PedidoActivoProvider = ({ children }) => {
  const { user } = useAuth();
  const esCliente = user?.type === 'client' && !!user?.id;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pedidoAbierto, setPedidoAbierto] = useState(null);

  const cargar = useCallback(async () => {
    if (!esCliente) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getPedidosDeCliente(user.id);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // Un fallo aquí no debe tumbar la tienda: se queda sin burbuja, no sin tienda.
    } finally {
      setLoading(false);
    }
  }, [esCliente, user?.id]);

  useEffect(() => {
    cargar();
    if (!esCliente) return;
    const reloj = setInterval(cargar, CADA_CUANTO_REFRESCAR_MS);
    return () => clearInterval(reloj);
  }, [cargar, esCliente]);

  // En desarrollo, cada paso del pedido de prueba se ve al instante, sin
  // esperar los 20 segundos de la siguiente consulta.
  useEffect(() => (__DEV__ ? suscribirseASimulacion(cargar) : undefined), [cargar]);

  const cerrarPedidoAbierto = useCallback(() => setPedidoAbierto(null), []);

  // Un pedido cambió desde la app (hoy: el cliente lo canceló).
  const [ultimoCambio, setUltimoCambio] = useState(null);
  const actualizarPedido = useCallback((cambio) => {
    if (!cambio?._id) return;
    const mezclar = (p) => (p && String(p._id) === String(cambio._id) ? { ...p, ...cambio } : p);
    setOrders((lista) => lista.map(mezclar));
    setPedidoAbierto(mezclar);
    setUltimoCambio(cambio);
  }, []);

  // El pedido cuya burbuja hay que desplegar (con el mapa). Lo pide el aviso de "va en camino" al
  // tocarlo: ahí lo que se quiere ver es al repartidor, no la lista. BurbujaPedido lo lee y lo
  // suelta en cuanto se abre.
  const [pedidoASeguir, setPedidoASeguir] = useState(null);
  const seguirPedido = useCallback((id) => setPedidoASeguir(id ? String(id) : null), []);
  const dejarDeSeguir = useCallback(() => setPedidoASeguir(null), []);

  return (
    <PedidoActivoContext.Provider
      value={{
        orders,
        loading,
        refrescar: cargar,
        pedidoAbierto,
        abrirPedido: setPedidoAbierto,
        cerrarPedidoAbierto,
        actualizarPedido,
        ultimoCambio,
        pedidoASeguir,
        seguirPedido,
        dejarDeSeguir,
      }}
    >
      {children}
    </PedidoActivoContext.Provider>
  );
};

// Sin proveedor (no debería pasar, pero por las dudas) no hay pedidos que
// mostrar, no un error.
const SIN_PROVEEDOR = {
  orders: [],
  loading: false,
  refrescar: () => {},
  pedidoAbierto: null,
  abrirPedido: () => {},
  cerrarPedidoAbierto: () => {},
  actualizarPedido: () => {},
  ultimoCambio: null,
  pedidoASeguir: null,
  seguirPedido: () => {},
  dejarDeSeguir: () => {},
};

export const usePedidoActivoCtx = () => useContext(PedidoActivoContext) || SIN_PROVEEDOR;
