/*
 * ============================================================
 * ROOT NAVIGATOR — todo lo que antes decidía `Raiz` en App.js
 * ============================================================
 * Cada pantalla suelta sigue exactamente igual por dentro (`Carrito.js`,
 * `Checkout.js`, etc.): lo único que cambia es CÓMO llegan sus props de
 * navegación. Antes eran funciones que hacían `setPantalla('x')`; ahora son
 * funciones que hacen `navigation.navigate('X')`. El resto del archivo de cada
 * pantalla no se tocó.
 *
 * ── Por qué `Splash` navega con un efecto y no con el `initialRouteName` ──
 *
 * Porque a dónde ir (Login o Tabs) depende de si había sesión guardada, y eso
 * no se sabe hasta que `AuthProvider` termina de leer el almacén. `Splash` se
 * queda montada ese tiempo (más el mínimo de `useSplashTimer`) y solo entonces
 * decide.
 *
 * ── `AuthWatcher` es el login interactivo, `Splash` es el arranque ──
 *
 * Los dos miran `isAuthenticated`, pero no se pisan: `AuthWatcher` se apaga
 * hasta que `Splash` marca `arranqueResuelto`, así que un login con sesión ya
 * guardada solo lo mueve `Splash`, y un login hecho a mano en la pantalla de
 * entrar solo lo mueve `AuthWatcher`.
 */

import { useEffect, useMemo, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useModo } from '../context/ModoContext';
import { useTienda } from '../context/TiendaContext';
import { useSplashTimer } from '../hooks/useSplashTimer';
import { leer, guardar, llave } from '../utils/almacen';
import { abrirProducto, arranqueResuelto, destinoPendiente, irATabs, marcarArranqueResuelto, navegarA, navigationRef } from './navigationRef';
import PantallaCarga from '../pages/PantallaCarga';
import Onboarding from '../pages/Onboarding';
import LoginClient from '../pages/LoginClient';
import LoginPersonal from '../pages/personal/LoginPersonal';
import Register from '../pages/Register';
import Verification from '../pages/Verification';
import Carrito from '../pages/Carrito';
import Checkout from '../pages/Checkout';
import Confirmacion from '../pages/Confirmacion';
import Seccion from '../pages/Seccion';
import Impresiones from '../pages/Impresiones';
import ConoceATiqui, { LLAVE_TIQUI_PRESENTADO } from '../pages/ConoceATiqui';
import Producto from '../pages/Producto';
import Promo from '../pages/Promo';
import TabMenu from './TabMenu';

const Stack = createNativeStackNavigator();

// Misma llave para leer (aquí) y para grabar (OnboardingRoute, al terminar).
const LLAVE_ONBOARDING = llave('onboarding', 'visto');

const SplashRoute = ({ navigation }) => {
  const { isAuthenticated, cargando } = useAuth();

  // `null` mientras no se sabe todavía si ya se vio la introducción — un
  // tercer estado, no un `false` de arranque, porque un `false` inicial
  // mandaría a todo el mundo a Onboarding un instante antes de que
  // `leer()` conteste que sí la había visto.
  const [onboardingVisto, setOnboardingVisto] = useState(null);
  useEffect(() => {
    let vivo = true;
    leer(LLAVE_ONBOARDING).then((valor) => vivo && setOnboardingVisto(valor === '1'));
    return () => { vivo = false; };
  }, []);

  const mostrarSplash = useSplashTimer(cargando || onboardingVisto === null);

  useEffect(() => {
    if (mostrarSplash || onboardingVisto === null) return;

    marcarArranqueResuelto();

    if (!onboardingVisto) {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      return;
    }

    if (isAuthenticated) {
      irATabs(destinoPendiente.current);
      destinoPendiente.current = null;
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
    // Solo debe correr cuando el splash termina, no en cada cambio de sesión:
    // el login interactivo lo atiende AuthWatcher, no esta pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarSplash, onboardingVisto]);

  return <PantallaCarga />;
};

/*
 * Al terminar la introducción (o al saltarla) se graba la llave y se sigue
 * EXACTAMENTE por donde habría seguido Splash si nunca hubiera hecho falta
 * mostrarla — mismo criterio, para no mantenerlo escrito dos veces de forma
 * distinta.
 */
const OnboardingRoute = ({ navigation }) => {
  const { isAuthenticated } = useAuth();

  const terminar = () => {
    guardar(LLAVE_ONBOARDING, '1');
    marcarArranqueResuelto();

    if (isAuthenticated) {
      irATabs(destinoPendiente.current);
      destinoPendiente.current = null;
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  return <Onboarding alTerminar={terminar} />;
};

// Sin pantalla propia: solo escucha. Vive como hermano del Stack para que
// pueda navegar en cuanto `isAuthenticated` pasa a `true` después del arranque
// (login o registro+verificación hechos a mano).
const AuthWatcher = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!arranqueResuelto.current || !isAuthenticated) return;
    irATabs(destinoPendiente.current);
    destinoPendiente.current = null;
  }, [isAuthenticated]);

  return null;
};

const LoginRoute = ({ navigation }) => (
  <LoginClient
    irARegistro={() => navigation.navigate('Register')}
    irATienda={() => {
      destinoPendiente.current = null;
      irATabs(null);
    }}
    irAPersonal={(correo) => navigation.navigate('LoginPersonal', { correo })}
  />
);

/*
 * "¿Trabajas en la tienda?": la entrada del personal. Al terminar no navega:
 * PersonalContext guarda la sesión y App.js cambia la app entera al modo
 * personal (Tiqui y Reparto para el administrador; Reparto para el empleado).
 */
const LoginPersonalRoute = ({ navigation, route }) => (
  <LoginPersonal alVolver={() => navigation.goBack()} correoInicial={route.params?.correo || ''} />
);

const RegisterRoute = ({ navigation }) => (
  <Register
    irALogin={() => navigation.navigate('Login')}
    alPedirCodigo={(correo) => navigation.navigate('Verification', { correo })}
  />
);

const VerificationRoute = ({ route, navigation }) => (
  <Verification
    correo={route.params?.correo}
    // Cuenta creada: se entra por la puerta normal, con su correo y su clave.
    alVerificar={() => navigation.navigate('Login')}
    alVolver={() => navigation.navigate('Register')}
  />
);

const CarritoRoute = ({ navigation }) => {
  const { isAuthenticated } = useAuth();

  return (
    <Carrito
      irAInicio={() => navigation.navigate('Tabs', { screen: 'inicio' })}
      irAPagar={() => {
        // Pagar sin cuenta no se puede: se manda a entrar y se guarda que
        // venía del carrito, para volver ahí (no al checkout) y que confirme
        // "pagar" otra vez ya con sesión.
        if (!isAuthenticated) {
          destinoPendiente.current = 'Carrito';
          navegarA('Login');
          return;
        }
        navigation.navigate('Checkout');
      }}
    />
  );
};

const CheckoutRoute = ({ navigation }) => (
  <Checkout
    alVolver={() => navigation.goBack()}
    alConfirmar={(respuesta) => navigation.replace('Confirmacion', { respuesta })}
  />
);

const ConfirmacionRoute = ({ route, navigation }) => (
  <Confirmacion
    respuesta={route.params?.respuesta}
    alCerrar={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })}
  />
);

// Un producto de la sección abre su propia página encima (pages/Producto.js).
const SeccionRoute = ({ route, navigation }) => {
  const { agregarAlCarrito } = useTienda();

  return (
    <Seccion
      seccion={route.params?.seccion}
      alVolver={() => navigation.goBack()}
      alVerDetalle={abrirProducto}
      alAgregar={agregarAlCarrito}
    />
  );
};

// Su propia pantalla del stack, no un pasillo de la tienda: ver el
// comentario grande en MenuPasillos.js sobre por qué "Impresiones" navega
// en vez de filtrar.
const ImpresionesRoute = ({ navigation }) => (
  <Impresiones alVolver={() => navigation.goBack()} />
);

/*
 * La presentación de Tiqui. Al cerrarla (o terminarla) queda marcada como
 * vista, para que no se vuelva a abrir sola; desde el asistente se puede ver
 * otra vez cuando se quiera. Ver pages/Asistente.js.
 */
const ConoceATiquiRoute = ({ navigation }) => {
  const terminar = () => {
    guardar(LLAVE_TIQUI_PRESENTADO, '1');
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs', { screen: 'asistente' });
  };
  return <ConoceATiqui alTerminar={terminar} />;
};

const RootNavigator = () => {
  /*
   * El fondo que react-navigation pone detrás de cada pantalla mientras
   * entra o sale. Sin esto, en oscuro se ve un destello blanco en cada
   * transición: las pantallas son oscuras, pero lo que asoma entre una y
   * otra es el blanco de fábrica de la librería.
   */
  const { oscuro, colores } = useModo();
  const tema = useMemo(() => {
    const base = oscuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colores.fondo,
        card: colores.papelAlto,
        text: colores.tituloFuerte,
        border: colores.linea,
      },
    };
  }, [oscuro, colores]);

  return (
    <NavigationContainer ref={navigationRef} theme={tema}>
      <AuthWatcher />
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashRoute} />
        <Stack.Screen name="Onboarding" component={OnboardingRoute} />
        <Stack.Screen name="Login" component={LoginRoute} />
        <Stack.Screen name="LoginPersonal" component={LoginPersonalRoute} />
        <Stack.Screen name="Register" component={RegisterRoute} />
        <Stack.Screen name="Verification" component={VerificationRoute} />
        <Stack.Screen name="Tabs" component={TabMenu} />
        <Stack.Screen name="Carrito" component={CarritoRoute} />
        <Stack.Screen name="Checkout" component={CheckoutRoute} />
        <Stack.Screen name="Confirmacion" component={ConfirmacionRoute} />
        <Stack.Screen name="Seccion" component={SeccionRoute} />
        {/*
          Un producto y una promoción son páginas, como en la web: se apilan
          y se vuelve con "‹ Volver", el botón atrás o el gesto. `getId` las
          distingue por id: un recomendado abre SU página encima, y tocar
          dos veces el mismo no abre dos.
        */}
        <Stack.Screen name="Producto" component={Producto} getId={({ params }) => params?.id} />
        <Stack.Screen name="Promo" component={Promo} getId={({ params }) => params?.id} />
        <Stack.Screen name="Impresiones" component={ImpresionesRoute} />
        <Stack.Screen name="ConoceATiqui" component={ConoceATiquiRoute} options={{ animation: 'fade_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
