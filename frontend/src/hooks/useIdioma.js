import { createContext, useContext } from 'react';
import { traducir, localeDe } from '../utils/idioma';

// useIdioma — { idioma, setIdioma, t, locale } en cualquier pantalla de la tienda. El proveedor
// está en context/IdiomaContext.jsx; aquí solo el contexto y el gancho (así el archivo del
// proveedor exporta solo componentes).
export const IdiomaContexto = createContext(null);

const SIN_PROVEEDOR = {
  idioma: 'es',
  setIdioma: () => {},
  t: (texto, vars) => traducir('es', texto, vars),
  locale: localeDe('es'),
};

export const useIdioma = () => useContext(IdiomaContexto) || SIN_PROVEEDOR;
