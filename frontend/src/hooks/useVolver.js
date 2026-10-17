import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

// VOLVER — useVolver.js
// El "atrás" de la app, que no es el del navegador. El requisito del proyecto pide navegación
// fluida "evitando tener que utilizar el retroceder por defecto del navegador".
export const useVolver = (destinoPorDefecto) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, esCliente } = useAuth();

  // Personal = tiene sesión pero no es cliente.
  const casa = destinoPorDefecto || (isAuthenticated && !esCliente ? '/dashboard' : '/');

  // `key === 'default'` significa que esta es la primera entrada del historial dentro de la app: no
  // hubo ninguna navegación previa que deshacer.
  const hayAtras = location.key !== 'default';

  const volver = useCallback(() => {
    if (hayAtras) {
      navigate(-1);
      return;
    }
    navigate(casa, { replace: true });
  }, [hayAtras, navigate, casa]);

  return { volver, hayAtras, casa };
};
