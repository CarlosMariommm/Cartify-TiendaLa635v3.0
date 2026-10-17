// TAB MENU — los cuatro apartados, ahora con react-navigation
// Las pestañas de abajo, con la barra propia `BarraInferior` en vez de la que dibuja bottom-tabs.

import { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { destinoPendiente, navegarA } from './navigationRef';
import { avisarActividad } from '../utils/actividadUsuario';
import BarraInferior from '../components/UI/BarraInferior';
import Inicio from '../pages/Inicio';
import Asistente from '../pages/Asistente';
import Pedidos from '../pages/Pedidos';
import Perfil from '../pages/Perfil';

const Tab = createBottomTabNavigator();

const CON_SESION = ['pedidos', 'perfil'];

const BarraDeApartados = ({ state, navigation }) => {
  const { isAuthenticated } = useAuth();
  const apartado = state.routes[state.index].name;

  useEffect(() => {
    if (!isAuthenticated && CON_SESION.includes(apartado)) {
      navigation.navigate('inicio');
    }
  }, [isAuthenticated, apartado, navigation]);

  // Cambiar de apartado cuenta como "el usuario se movió", igual que scrollear — BurbujaPedido se
  // aparta sola. Se salta el primer render: eso no es un cambio de pestaña, es la app arrancando en
  // una.
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    avisarActividad();
  }, [apartado]);

  const cambiar = (clave) => {
    if (CON_SESION.includes(clave) && !isAuthenticated) {
      destinoPendiente.current = clave;
      navegarA('Login');
      return;
    }
    navigation.navigate(clave);
  };

  return <BarraInferior apartado={apartado} alCambiar={cambiar} />;
};

// Inicio necesita mandar al carrito y a una sección, dos pantallas que viven
// en el Stack de más arriba y no entre los apartados.
const InicioTab = ({ navigation }) => (
  <Inicio
    irACarrito={() => navigation.navigate('Carrito')}
    irASeccion={(seccion) => navigation.navigate('Seccion', { seccion })}
  />
);

const TabMenu = () => (
  <Tab.Navigator
    tabBar={(props) => <BarraDeApartados {...props} />}
    // `animation` es de bottom-tabs 7, no algo casero: solo se prende. Un cruce de opacidad entre
    // pantallas, no un slide — no hay un "orden" real entre Tienda/Asistente/Pedidos/Perfil que un
    // slide izq-der tenga que respetar.
    screenOptions={{ headerShown: false, animation: 'fade' }}
  >
    <Tab.Screen name="inicio" component={InicioTab} />
    <Tab.Screen name="asistente" component={Asistente} />
    <Tab.Screen name="pedidos" component={Pedidos} />
    <Tab.Screen name="perfil" component={Perfil} />
  </Tab.Navigator>
);

export default TabMenu;
