import { createContext, useContext } from 'react';
import { useMyOrders } from '../hooks/useMyOrders';

// PedidoActivoContext — los pedidos del cliente, en un solo lugar para toda la sesión.
const PedidoActivoContext = createContext(null);

export const PedidoActivoProvider = ({ children }) => {
  const pedidos = useMyOrders();
  return (
    <PedidoActivoContext.Provider value={pedidos}>
      {children}
    </PedidoActivoContext.Provider>
  );
};

// Fuera del proveedor (o sin sesión) no hay pedidos que mostrar, no un error.
const SIN_PROVEEDOR = { orders: [], loading: false, refrescar: () => {} };

export const usePedidoActivoCtx = () => useContext(PedidoActivoContext) || SIN_PROVEEDOR;
