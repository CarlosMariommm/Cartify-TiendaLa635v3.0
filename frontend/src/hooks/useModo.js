import { createContext, useContext } from 'react';

// El contexto del modo claro/oscuro y el hook para leerlo. El proveedor vive en
// context/ModoContext.jsx; están separados para que la recarga en caliente de Vite siga
// funcionando (un archivo de componentes no exporta hooks).
export const ModoContexto = createContext(null);

const SIN_PROVEEDOR = { modo: 'claro', setModo: () => {}, oscuro: false };

export const useModo = () => useContext(ModoContexto) || SIN_PROVEEDOR;
