// MODO — claro u oscuro, para toda la app
// Lo que en la web hace `ModoContext` + el `data-modo` del <html>. Lo elige la persona en Mi
// cuenta → Preferencias y se guarda en el teléfono (ver utils/modo.js).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { COLORES_CLARO, COLORES_OSCURO } from '../theme/colores';
import { MODOS, esOscuro, guardarModo, leerModoGuardado } from '../utils/modo';

const ModoContext = createContext(null);

const ESQUEMA_NATIVO = { claro: 'light', oscuro: 'dark', sistema: 'unspecified' };

export const ModoProvider = ({ children }) => {
  // null mientras se lee el almacén: un 'claro' de arranque pintaría la app
  // blanca un instante a quien eligió oscuro.
  const [modo, setModoEstado] = useState(null);
  const esquema = useColorScheme();

  useEffect(() => {
    let vivo = true;
    leerModoGuardado().then((guardado) => vivo && setModoEstado(guardado));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!modo) return;
    try {
      Appearance.setColorScheme(ESQUEMA_NATIVO[modo]);
    } catch {
      // En web no hay a quién decirle: la app se pinta igual.
    }
  }, [modo]);

  const setModo = useCallback((nuevo) => {
    if (!MODOS.includes(nuevo)) return;
    guardarModo(nuevo);
    setModoEstado(nuevo);
  }, []);

  const oscuro = esOscuro(modo, esquema);

  const valor = useMemo(
    () => ({ modo, setModo, oscuro, colores: oscuro ? COLORES_OSCURO : COLORES_CLARO }),
    [modo, setModo, oscuro]
  );

  // Es una lectura del almacén del teléfono: milisegundos, no una pantalla de carga.
  if (!modo) return null;

  return <ModoContext.Provider value={valor}>{children}</ModoContext.Provider>;
};

const SIN_PROVEEDOR = { modo: 'claro', setModo: () => {}, oscuro: false, colores: COLORES_CLARO };

export const useModo = () => useContext(ModoContext) || SIN_PROVEEDOR;

// Otra paleta para un pedazo de la app: el modo del personal se pinta con la paleta que el
// administrador eligió en el panel (ver utils/paletaPanel.js). `paleta` es lo que devuelve
// paletaDesdePanel; sin ella, nada cambia.
export const ConPaleta = ({ paleta, children }) => {
  const base = useModo();
  const valor = useMemo(
    () => (paleta ? { ...base, oscuro: paleta.colores.oscuro, colores: paleta.colores, clave: paleta.clave } : base),
    [base, paleta]
  );
  return <ModoContext.Provider value={valor}>{children}</ModoContext.Provider>;
};

// La paleta neutra del modo que rige. La de marca (temporada) sigue en useTema().
export const useColores = () => useModo().colores;

// Una hoja por archivo y por modo, guardada con la función que la arma como llave. Las funciones
// `crearEstilos` viven fuera de los componentes, así que son siempre la misma y la hoja se reusa
// entre renders y entre pantallas.
const hojas = new WeakMap();

export const useEstilos = (crear) => {
  const { oscuro, colores, clave: claveDePaleta } = useModo();
  let par = hojas.get(crear);
  if (!par) {
    par = {};
    hojas.set(crear, par);
  }
  // Las paletas del panel tienen su propia hoja, aparte de la clara y la oscura.
  const clave = claveDePaleta || (oscuro ? 'oscuro' : 'claro');
  if (!par[clave]) par[clave] = crear(colores);
  return par[clave];
};
