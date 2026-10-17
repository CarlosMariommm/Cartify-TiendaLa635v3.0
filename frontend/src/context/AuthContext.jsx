import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/api';
import { CAJON, areaDeRuta, LLAVE_MODO_TRABAJO } from '../utils/sesion';

// CONTEXTO DE AUTENTICACIÓN — AuthContext.jsx
// Dos cajones de sesión, uno por área: el panel y la tienda guardan cada uno la suya, así entrar
// en una no pisa la otra.
export const AuthContext = createContext();

// Dónde vive cada cajón y qué área manda en cada ruta: bajó a utils/sesion.js porque el
// interceptor de axios también lo necesita para saber a quién echar cuando el servidor contesta
// 401, y no puede importar este archivo sin armar un círculo.

// En qué cajón va una sesión según a quién pertenece. El backend responde 'client', 'admin' o
// 'employee'; solo el primero es del área de cliente.
const cajonDeTipo = (tipo) => (tipo === 'client' ? 'cliente' : 'personal');

const leerCajon = (area) => {
  try {
    const crudo = localStorage.getItem(CAJON[area]);
    const sesion = crudo ? JSON.parse(crudo) : null;
    // Un cajón sin token es un cajón vacío, aunque tenga datos sueltos.
    return sesion?.token ? sesion : null;
  } catch {
    // JSON corrupto: se trata como si no hubiera sesión en vez de reventar
    // la app entera antes de pintar la primera pantalla.
    return null;
  }
};

// Mudanza de las llaves viejas. Sin esto, la primera vez que alguien abre la app después de este
// cambio se encuentra la sesión cerrada sin haber tocado nada.
const mudarSesionVieja = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Sin tipo declarado se asume CLIENTE, no personal. Una sesión vieja de la que no sabemos nada no
  // puede heredar los permisos del panel por descuido: si acierta, no se gana nada; si se equivoca,
  // se regala una sesión de personal. Ante la duda, la de menos alcance.
  const tipo = localStorage.getItem('userType') || 'client';
  let datos;
  try {
    datos = JSON.parse(localStorage.getItem('userData') || '{}');
  } catch {
    datos = {};
  }

  const area = cajonDeTipo(tipo);
  // Si ya hay algo en ese cajón, lo nuevo manda: es lo que el usuario abrió
  // por última vez con el sistema anterior.
  localStorage.setItem(CAJON[area], JSON.stringify({ token, type: tipo, ...datos }));

  localStorage.removeItem('token');
  localStorage.removeItem('userType');
  localStorage.removeItem('userData');
};

// Los dos cajones, leídos al crear el estado: así la sesión ya está en el PRIMER pintado. La
// mudanza y la limpieza escriben en localStorage, así que van una sola vez por carga de la página
// (React puede llamar dos veces a esta función en desarrollo para comprobar que sea pura).
let yaSeAcomodo = false;
const levantarSesiones = () => {
  if (!yaSeAcomodo) {
    yaSeAcomodo = true;
    mudarSesionVieja();
    // El "Estoy trabajando" de antes ya no existe (ver ClienteLayout). Quien lo dejó encendido tenía
    // la bandera guardada: se borra, para que nadie quede atrapado en un modo que ya no tiene botón
    // para apagarse.
    try { localStorage.removeItem(LLAVE_MODO_TRABAJO); } catch { /* sin localStorage no hay nada que borrar */ }
  }
  return { personal: leerCajon('personal'), cliente: leerCajon('cliente') };
};

export const AuthProvider = ({ children }) => {
  const { pathname } = useLocation();

  // 1- Al abrir la app se levantan los dos cajones de una vez, después de
  //    mudar lo que hubiera guardado el sistema anterior.
  const [sesiones, setSesiones] = useState(levantarSesiones);

  // 2- La sesión que manda AQUÍ, en la pantalla donde está parada la persona. En el panel es la del
  // personal y nada más: si ahí valiera la del cliente, una pantalla de administración terminaría
  // pidiendo datos con el id equivocado. Y en la tienda, la del cliente y nada más.
  const area = areaDeRuta(pathname);
  const activa = area === 'personal' ? sesiones.personal : sesiones.cliente;

  // El área, también en una referencia.
  const areaRef = useRef(area);
  useEffect(() => { areaRef.current = area; }, [area]);

  // Las otras pestañas también cuentan. Los cajones se leían una sola vez al montar, así que cerrar
  // sesión en una pestaña dejaba a las demás creyendo que seguía abierta —mostrando el nombre, el
  // carrito y el panel— hasta que alguien recargara.
  useEffect(() => {
    const alCambiarOtraPestana = (e) => {
      // e.key es null cuando alguien hizo localStorage.clear().
      const llaves = [CAJON.personal, CAJON.cliente];
      if (e.key !== null && !llaves.includes(e.key)) return;
      setSesiones({ personal: leerCajon('personal'), cliente: leerCajon('cliente') });
    };
    window.addEventListener('storage', alCambiarOtraPestana);
    return () => window.removeEventListener('storage', alCambiarOtraPestana);
  }, []);

  // 3- Guardar una sesión. El cajón lo elige el tipo de cuenta, no la pantalla:
  //    así una sesión nunca cae en el cajón que no es suyo, entre por donde entre.
  const login = useCallback((nuevoToken, tipoUsuario = 'employee', datosUsuario = null) => {
    const sesion = { token: nuevoToken, type: tipoUsuario, ...(datosUsuario || {}) };
    const cajon = cajonDeTipo(tipoUsuario);

    localStorage.setItem(CAJON[cajon], JSON.stringify(sesion));
    setSesiones((previas) => ({ ...previas, [cajon]: sesion }));
  }, []);

  // 3.5- Actualizar datos de la sesión que está abierta, sin volver a entrar.
  const actualizarUsuario = useCallback((cambios = {}) => {
    if (!activa) return;
    const cajon = cajonDeTipo(activa.type);
    setSesiones((previas) => {
      const actual = previas[cajon];
      if (!actual) return previas;
      const fusionada = { ...actual, ...cambios };
      localStorage.setItem(CAJON[cajon], JSON.stringify(fusionada));
      return { ...previas, [cajon]: fusionada };
    });
  }, [activa]);

  // 4- Cerrar sesión cierra la de ESTA área, no las dos. Salir del panel no tiene por qué sacar a la
  // persona de la tienda: son dos cuentas distintas aunque compartan el correo, y cerrar una no dice
  // nada sobre la otra.
  const logout = useCallback((areaAcerrar) => {
    const cajon = areaAcerrar || areaRef.current;

    // Avisarle al servidor para que borre SU cookie. El logout solo limpiaba el navegador, así que la
    // cookie httpOnly seguía puesta 30 días: cerrar sesión dejaba media sesión abierta.
    api.post(cajon === 'personal' ? '/logoutAdmin' : '/logoutClient').catch(() => {});

    localStorage.removeItem(CAJON[cajon]);
    setSesiones((previas) => ({ ...previas, [cajon]: null }));
  }, []);

  // 4.5- Cerrar TODO, a pedido — el botón "Cerrar sesión" del PANEL. `logout()` de arriba cierra un
  // solo cajón a propósito: son dos cuentas distintas aunque compartan el correo.
  const logoutTodo = useCallback(() => {
    api.post('/logoutAdmin').catch(() => {});
    api.post('/logoutClient').catch(() => {});

    localStorage.removeItem(CAJON.personal);
    localStorage.removeItem(CAJON.cliente);
    setSesiones({ personal: null, cliente: null });
  }, []);

  const valor = useMemo(
    () => ({
      user: activa ? { type: activa.type, ...activa } : null,
      token: activa?.token || null,
      login,
      logout,
      logoutTodo,
      actualizarUsuario,
      // Ya no hay espera: la sesión se lee antes del primer pintado.
      loading: false,
      isAuthenticated: !!activa?.token,
      // Para el guardia de rutas: le deja distinguir "no ha entrado" de "entró, pero por la otra
      // puerta", que son dos situaciones que se resuelven de forma muy distinta. Ver ProtectedRoute.
      haySesionDePersonal: !!sesiones.personal,
      haySesionDeCliente: !!sesiones.cliente,
    }),
    [activa, login, logout, logoutTodo, actualizarUsuario, sesiones.personal, sesiones.cliente]
  );

  // 5- La sesión ya se sabe desde el primer pintado (ver levantarSesiones):
  //    no hay parpadeo de "no ha entrado" seguido de la pantalla real.
  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
};
