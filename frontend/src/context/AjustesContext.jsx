import { createContext, useContext } from 'react';
import { useAjustesTienda } from '../hooks/useAjustesTienda';
import { NOMBRE_TIENDA, DIRECCION_EN_UNA_LINEA } from '../utils/tienda';
import { resolverPortada } from '../utils/portada';

// AjustesContext — cómo se ve la tienda, pedido UNA sola vez. El nombre y el logo los pinta el
// encabezado, el pie y el login del panel; el orden de la portada lo usa la tienda.
const AjustesContext = createContext(null);

export const AjustesProvider = ({ children }) => {
  const ajustes = useAjustesTienda();
  return (
    <AjustesContext.Provider value={ajustes}>
      {children}
    </AjustesContext.Provider>
  );
};

// Valores neutros para quien pregunte desde fuera del árbol, para que preguntar de más nunca
// reviente nada.
const SIN_PROVEEDOR = {
  ajustes: {
    nombreLinea1: NOMBRE_TIENDA.arriba,
    nombreLinea2: NOMBRE_TIENDA.abajo,
    logoUrl: '',
    lema: '',
    direccion: DIRECCION_EN_UNA_LINEA,
    secciones: [],
    temporada: { modo: 'automatico', tema: '' },
  },
  portada: resolverPortada([]),
  portadaVisible: resolverPortada([]),
  cargando: false,
  guardando: false,
  guardar: () => {},
  mover: () => {},
  alternarVisible: () => {},
  subirLogo: () => {},
  quitarLogo: () => {},
  recargar: () => {},
};

export const useAjustesCtx = () => useContext(AjustesContext) || SIN_PROVEEDOR;
