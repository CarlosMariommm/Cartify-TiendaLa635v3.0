// useAuth — atajo para leer el contexto de sesión. Vive aparte del contexto por la misma razón que
// en la web: así una pantalla importa `useAuth` y no tiene que saber que por debajo hay un
// createContext.

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const contexto = useContext(AuthContext);

  // Falla temprano y con nombre: sin esto, olvidar el AuthProvider se
  // manifiesta como "no se puede leer 'login' de null" tres pantallas adentro.
  if (!contexto) {
    throw new Error('useAuth se usó fuera de un AuthProvider');
  }

  return contexto;
};

export default useAuth;
