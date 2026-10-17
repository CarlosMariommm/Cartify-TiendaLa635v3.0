import { createContext, useContext } from 'react';
import { useDireccionActiva } from '../hooks/useDireccionActiva';

// DireccionContext — una sola dirección de entrega para toda la tienda. El encabezado la muestra y
// el carrito la usa al pagar.
const DireccionContext = createContext(null);

export const DireccionProvider = ({ children }) => {
  const direccion = useDireccionActiva();
  return (
    <DireccionContext.Provider value={direccion}>
      {children}
    </DireccionContext.Provider>
  );
};

// Valores neutros para que un componente fuera del árbol de la tienda (o de
// alguien sin sesión) no reviente al preguntar por la dirección.
const SIN_PROVEEDOR = {
  direcciones: [], activa: null, indice: 0, etiqueta: '',
  cargando: false, guardando: false,
  elegir: () => {}, agregar: () => {}, eliminar: () => {},
};

export const useDireccionCtx = () => useContext(DireccionContext) || SIN_PROVEEDOR;
