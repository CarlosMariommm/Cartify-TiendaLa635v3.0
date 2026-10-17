// CONTEXTO DE AUTENTICACIÓN — AuthContext.js
// El mismo contrato que `frontend/src/context/AuthContext.jsx`: expone `user`, `token`, `login()`,
// `logout()` e `isAuthenticated`, para que quien venga de la web encuentre lo que espera.

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { borrar, guardar, leer, llave } from '../utils/almacen';
import { establecerToken } from '../api/api';

export const AuthContext = createContext(null);

const LLAVE_SESION = llave('cartify', 'sesion');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // Arranca en true: hasta no haber mirado el almacén no se sabe nada.
  const [cargando, setCargando] = useState(true);

  // Al abrir la app: recuperar la sesión de la vez pasada, si la hubo.
  useEffect(() => {
    let vivo = true;

    (async () => {
      const crudo = await leer(LLAVE_SESION);
      if (!vivo) return;

      try {
        const datos = JSON.parse(crudo || 'null');
        // Sin token no hay sesión que restaurar, por más que haya un `user`
        // guardado: es el token lo que el backend va a pedir.
        if (datos?.token) {
          setToken(datos.token);
          setUser(datos.user || null);
          establecerToken(datos.token);
        }
      } catch {
        // Guardado ilegible (una versión vieja de la app, un valor a medio escribir). Se entra sin sesión,
        // que es la salida segura: lo peor sería arrancar con media sesión y fallar en la primera
        // petición.
      }

      setCargando(false);
    })();

    return () => {
      vivo = false;
    };
  }, []);

  // Guarda el token y los datos que devolvió el servidor al entrar.
  const login = useCallback((nuevoToken, tipoUsuario = 'client', datosUsuario = null) => {
    const nuevoUsuario = { type: tipoUsuario, ...datosUsuario };
    setToken(nuevoToken);
    setUser(nuevoUsuario);
    establecerToken(nuevoToken);
    // Sin await: la pantalla no tiene por qué esperar al disco para dejar entrar. Si la escritura
    // falla —almacén lleno, dispositivo sin caja fuerte— la sesión igual funciona toda esta corrida;
    // lo único que se pierde es no tener que volver a entrar mañana.
    guardar(LLAVE_SESION, JSON.stringify({ token: nuevoToken, user: nuevoUsuario }));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    establecerToken(null);
    borrar(LLAVE_SESION);
  }, []);

  // Mete campos sueltos al usuario de la sesión sin pedirlo de nuevo al servidor — por ahora lo usa
  // solo el candado +18 (EdadContext), para que el DUI que se acaba de guardar en la cuenta cuente
  // YA MISMO y no haga falta cerrar sesión y volver a entrar para que dejen de preguntarle.
  const actualizarUsuario = useCallback((campos) => {
    setUser((actual) => {
      if (!actual) return actual;
      const nuevo = { ...actual, ...campos };
      guardar(LLAVE_SESION, JSON.stringify({ token, user: nuevo }));
      return nuevo;
    });
  }, [token]);

  const valor = useMemo(
    () => ({ user, token, login, logout, actualizarUsuario, isAuthenticated: !!token, cargando }),
    [user, token, login, logout, actualizarUsuario, cargando]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};
