import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SinPermiso from '../../pages/SinPermiso';

// COMPONENTE DE RUTA PROTEGIDA — ProtectedRoute.jsx
// Deja pasar solo con sesión activa: `soloPersonal` para el panel, `soloAdmin` para lo del dueño,
// y sin ninguno es una ruta de "Mi Cuenta" que pide la sesión del cliente.
const ProtectedRoute = ({ soloPersonal = false, soloAdmin = false }) => {
  const { isAuthenticated, esCliente, haySesionDeCliente, user } = useAuth();
  const { pathname, search } = useLocation();

  // 1- Sin sesión de esta área. Hay dos maneras muy distintas de llegar aquí y merecen respuestas
  // distintas: a) No ha entrado por ningún lado → al login, avisándole a dónde iba. Sin el `volver`,
  // la sesión lo suelta en la portada y le toca buscar otra vez lo que estaba haciendo.
  if (!isAuthenticated) {
    if (soloPersonal && haySesionDeCliente) {
      return <SinPermiso />;
    }
    // Al login que corresponde. Mandar al personal a la puerta de los clientes lo deja probando una
    // contraseña que ahí no sirve.
    const puerta = soloPersonal ? '/admin' : '/iniciar-sesion';
    return <Navigate to={`${puerta}?volver=${encodeURIComponent(pathname + search)}`} replace />;
  }

  // 2- Con sesión de esta área, pero de quien no es. Red de seguridad: con los cajones separados no
  // debería entrar aquí, pero si alguna vez una sesión de cliente termina en el cajón del personal,
  // mejor explicarlo que dejarla ver el panel a medias.
  if (soloPersonal && esCliente) {
    return <SinPermiso />;
  }

  // 2.5- Ruta de solo-dueño. Un empleado tiene sesión de personal perfecta — pasó los dos filtros de
  // arriba— pero esta puerta no es la suya: precios, proveedores, promociones, empleados, clientes,
  // ajustes de la tienda. No es un problema de sesión (por eso no se manda al login); es un permiso.
  if (soloAdmin && user?.type !== 'admin') {
    return <SinPermiso />;
  }

  // 3- Todo en orden: renderizamos la ruta hija (AdminLayout y sus páginas)
  return <Outlet />;
};

export default ProtectedRoute;
