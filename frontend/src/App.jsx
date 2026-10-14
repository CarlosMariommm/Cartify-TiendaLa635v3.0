import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { EdadProvider } from './context/EdadContext';
import { FavoritosProvider } from './context/FavoritosContext';
import { DireccionProvider } from './context/DireccionContext';
import { PedidoActivoProvider } from './context/PedidoActivoContext';
import { AjustesProvider } from './context/AjustesContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModoProvider } from './context/ModoContext';
import { IdiomaProvider } from './context/IdiomaContext';
import { leerIdiomaGuardado } from './utils/idioma';
import { useTemporada } from './hooks/useTemporada';
import { useEstiloAvisos } from './hooks/useEstiloAvisos';
import PildoraAviso from './components/UI/PildoraAviso';
import DecoracionTemporada from './components/Store/DecoracionTemporada';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import LimiteDeError from './components/UI/LimiteDeError';
import AvisoCookies from './components/UI/AvisoCookies';
import AnaliticasTienda from './components/UI/AnaliticasTienda';
import BotonWhatsApp from './components/Store/BotonWhatsApp';
import BurbujaPedido from './components/Store/BurbujaPedido';
import AvisoSinConexion from './components/UI/AvisoSinConexion';
import { CargandoMascota } from './components/UI/Mascota';
const VincularKiosco = lazy(() => import('./pages/VincularKiosco'));

// La espera de una pantalla que todavía se está descargando (ver <Suspense>).
const PantallaCargando = () => (
  <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CargandoMascota />
  </div>
);

/*
 * ============================================================
 * IMPORTACIÓN DE PÁGINAS — App.jsx
 * ============================================================
 * Aquí se importan todos los componentes de página que el
 * enrutador (React Router) necesita para renderizar.
 *
 * Casi todas van con lazy(): se descargan recién cuando alguien entra a
 * ellas. Antes iban todas en un solo archivo de 2.2 MB, así que quien solo
 * quería comprar pan bajaba también el panel de administración entero, con
 * sus gráficas y su generador de PDF. Se cargan de una vez solo la tienda,
 * sus secciones y el 404: lo que se ve al llegar. Mientras baja otra pantalla, React Router deja la anterior a la
 * vista (navega con transiciones), así que no hay parpadeo.
 * ============================================================
 */

// --- Autenticación ---
const LoginClient = lazy(() => import('./pages/LoginClient'));    // Login de clientes ("/")
const LoginAdmin = lazy(() => import('./pages/LoginAdmin'));      // Login de administradores ("/admin")
const PanelDesdeApp = lazy(() => import('./pages/PanelDesdeApp')); // El panel abierto desde la app ("/admin/desde-app")
const Register = lazy(() => import('./pages/Register'));          // Registro de nuevos clientes
const Verification = lazy(() => import('./pages/Verification')); // Verificación de código (registro, 2FA, recuperación)
const CreatePassword = lazy(() => import('./pages/CreatePassword')); // Paso final de recuperación de contraseña
const LoginPassword = lazy(() => import('./pages/LoginPassword'));
const CompletarGoogle = lazy(() => import('./pages/CompletarGoogle')); // Último paso de quien entra por primera vez con Google
const BajaNotificaciones = lazy(() => import('./pages/BajaNotificaciones')); // Donde cae el "dejar de recibirlos" de los correos
const ForgotPassword = lazy(() => import('./pages/ForgotPassword')); // Solicitar recuperación de contraseña

// --- Tienda pública ---
const Dashboard = lazy(() => import('./pages/Dashboard'));        // Panel de la tienda para clientes
import Store from './pages/Store';
import Seccion from './pages/Seccion';       // Una sección de la portada, completa
import NoEncontrado from './pages/NoEncontrado'; // 404: cualquier dirección que no exista
const Impresiones = lazy(() => import('./pages/impresiones'));
const Legal = lazy(() => import('./pages/Legal'));               // Términos, privacidad, cookies y devoluciones
const JuegoTiqui = lazy(() => import('./pages/JuegoTiqui'));     // El reto de Tiqui: el juego del stand de la Expo

// --- Panel Administrativo ---
const AdminLayout = lazy(() => import('./components/Layout/AdminLayout')); // Layout compartido del admin (sidebar + topbar)
const Inventory = lazy(() => import('./pages/Inventory'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const Modules = lazy(() => import('./pages/Modules'));
const Brands = lazy(() => import('./pages/Brands'));
const Employees = lazy(() => import('./pages/Employees'));
const Customers = lazy(() => import('./pages/Customers'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Categories = lazy(() => import('./pages/Categories'));
const Fidelidad = lazy(() => import('./pages/Fidelidad'));
const Promociones = lazy(() => import('./pages/Promociones'));
const Pronostico = lazy(() => import('./pages/Pronostico'));  // Lo que se va a vender y qué pedir (servicio de analítica)
const GiftCards = lazy(() => import('./pages/GiftCards'));
const ServiciosImpresion = lazy(() => import('./pages/ServiciosImpresion'));
const Personalizacion = lazy(() => import('./pages/Personalizacion'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const AyudaPanel = lazy(() => import('./pages/AyudaPanel'));     // Cómo funciona cada apartado del panel

// --- Área "Mi Cuenta" del cliente ---
const ClienteLayout = lazy(() => import('./components/Layout/ClienteLayout'));
const PuntosFidelidad = lazy(() => import('./pages/cliente/PuntosFidelidad'));
const MisPedidos = lazy(() => import('./pages/cliente/MisPedidos'));
const EstadoPedido = lazy(() => import('./pages/cliente/EstadoPedido'));
const Favoritos = lazy(() => import('./pages/cliente/Favoritos'));
const Bienvenida = lazy(() => import('./pages/Bienvenida'));
const Recibidos = lazy(() => import('./pages/cliente/Recibidos'));
const DetallesCuenta = lazy(() => import('./pages/cliente/DetallesCuenta'));
const Direcciones = lazy(() => import('./pages/cliente/Direcciones'));
const MetodoPago = lazy(() => import('./pages/cliente/MetodoPago'));
const Notificaciones = lazy(() => import('./pages/cliente/Notificaciones'));
const CentroAyuda = lazy(() => import('./pages/cliente/CentroAyuda'));
const Preferencias = lazy(() => import('./pages/cliente/Preferencias'));


/*
 * Pinta la tienda del color de la temporada (Navidad, Halloween...). No dibuja
 * nada: solo repinta las variables de marca sobre el documento. Vive como
 * componente y no como una llamada suelta porque necesita estar DENTRO de los
 * proveedores —lee los ajustes— y dentro del router —mira la ruta para no
 * tocar el panel—. Ver useTemporada.
 */
const PinturaDeTemporada = () => {
  const { tema, activo, conDecoracion } = useTemporada();
  // Las figuras cayendo van aquí arriba y no dentro de cada pantalla: es una
  // capa fija sobre toda la ventana, así que montarla una vez basta.
  return activo && conDecoracion ? <DecoracionTemporada tema={tema} /> : null;
};

/*
 * El Toaster es UNO SOLO para toda la app —panel y tienda por igual— y cada
 * aviso sale como la píldora de "agregado al carrito", abajo al centro (ver
 * components/UI/PildoraAviso.jsx). No se pinta igual en las dos mitades: la
 * tienda va con la tinta de la marca y el panel con la paleta de
 * accesibilidad que alguien eligió porque la necesita.
 *
 * Es un componente y no un <Toaster> suelto porque para saber en cuál de las
 * dos está parada la persona hay que mirar la ruta, y eso solo se puede hacer
 * DENTRO del router. Lo que decide el color vive en useEstiloAvisos; aquí solo
 * se monta.
 */
const Avisos = () => {
  const { colores, opciones } = useEstiloAvisos();
  return (
    <Toaster position="bottom-center" gutter={10} toastOptions={opciones} containerStyle={colores}>
      {(t) => <PildoraAviso t={t} />}
    </Toaster>
  );
};


/*
 * El router va POR FUERA de la sesión, al revés que antes.
 * AuthProvider ahora necesita saber en qué área está parada la persona —el
 * panel o la tienda— para decidir cuál de los dos cajones de sesión manda, y
 * eso solo lo sabe estando dentro del router. Ver AuthContext.
 */
/*
 * El clientId de Google sale de la variable de entorno del frontend
 * (VITE_GOOGLE_CLIENT_ID). Es el mismo id que el backend usa para verificar el
 * token. Si falta, el botón de Google simplemente no funciona, pero el resto de
 * la app sigue igual.
 */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/*
 * El `locale` de Google va en el PROVEEDOR y no en el botón, aunque el botón
 * también lo acepte. El de allá solo elige qué texto dibuja Google después; el
 * idioma real lo fija el script de Google al cargarse, y ese script lo pide el
 * proveedor. Con el locale solo en el botón, el script salía sin `hl=` y
 * Google caía en el idioma de la cuenta de quien mirara: el botón decía
 * "Continue with Google" en medio de una tienda entera en español.
 *
 * Por eso mismo sigue el idioma elegido en la tienda. El script se pide una
 * vez: si alguien cambia el idioma, el botón se pone al día al recargar.
 */
function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} locale={leerIdiomaGuardado()}>
    <BrowserRouter>
      <AuthProvider>
        {/*
          Cómo se ve la tienda —nombre, logo, orden de la portada, temporada—
          se pide una sola vez y lo lee quien lo necesite. Va bien arriba
          porque lo usan el encabezado, el pie y la portada por igual.
          Ver AjustesContext.
        */}
        <AjustesProvider>
        {/*
          Claro u oscuro (Mi Cuenta → Preferencias). Va antes de la pintura de
          temporada porque esa recalcula sus colores para el fondo oscuro.
          Ver ModoContext.
        */}
        <ModoProvider>
        {/*
          Español o inglés, para la tienda y Mi Cuenta (el panel queda en
          español). Ver utils/idioma.js.
        */}
        <IdiomaProvider>
        {/*
          ThemeProvider (paletas del PANEL, no de la tienda) va aquí adentro
          porque las pantallas de adentro leen los ajustes de la tienda. Ver
          ThemeContext.jsx — antes vivía en main.jsx, arriba de todo.
        */}
        <ThemeProvider>
        <PinturaDeTemporada />
        {/*
          El aviso de cookies y las analíticas (Vercel Web Analytics). Las
          analíticas solo se cargan si la persona las aceptó en el aviso; ni
          uno ni otro aparece en el panel. Ver utils/consentimiento.js.
        */}
        <AvisoCookies />
        <AnaliticasTienda />
        {/*
          El candado de los productos +18: vive alto para que la tarjeta, el
          detalle y el carrito compartan una sola confirmación de edad, y el
          modal se pinte sobre cualquier pantalla. Ver EdadContext.
        */}
        <EdadProvider>
        {/*
          Los favoritos se cargan una sola vez para toda la app: los mismos
          corazones aparecen en la tienda y en Mi Cuenta, que son ramas
          distintas del árbol de rutas. Va dentro del router porque el hook
          navega al login cuando alguien sin sesión toca un corazón.
        */}
        <FavoritosProvider>
        {/*
          La dirección de entrega también se comparte: el encabezado la
          muestra y el carrito la cobra. Ver DireccionContext.
        */}
        <DireccionProvider>
        {/*
          Los pedidos del cliente, en un solo lugar: la burbuja los lee y el
          carrito (adentro de <Routes>) avisa aquí cuando confirma uno nuevo.
          Va por fuera de la burbuja Y de las rutas para que ambos lo
          alcancen. Ver PedidoActivoContext.
        */}
        <PedidoActivoProvider>
        {/*
          Arriba a la derecha. Abajo también viven el botón de WhatsApp y la
          burbuja de seguimiento del pedido: con varios avisos apilados a la
          vez, la pila llegaba a taparlos (o quedaba ella tapada detrás, según
          el z-index del momento). Arriba no hay nada con quien pelear la
          esquina.

          Y sin emojis: un 🛒 gigante junto al texto no dice nada que el texto
          no diga ya, y hace que la tienda parezca un chat. Se quedan los
          iconos de la librería, que son marcas discretas de éxito o error.
        */}
        <Avisos />
        {/* Flotante de WhatsApp: se pinta solo en las pantallas del cliente. */}
        <BotonWhatsApp />
        {/* Seguimiento del pedido en curso; va a la izquierda para no chocar
            con el de WhatsApp, que ocupa la esquina derecha. */}
        <BurbujaPedido />
        {/* Si se cae el internet, la mascota desenchufada lo avisa (solo en
            la tienda y Mi Cuenta). */}
        <AvisoSinConexion />
        {/*
          La red debajo de TODAS las pantallas.

          Si algo revienta mientras se dibuja una página, React desmonta el
          árbol entero y queda una pantalla blanca absoluta, sin ninguna
          salida. Envolviendo aquí, un error en una pantalla se queda en esa
          pantalla: se explica y se ofrece cómo volver. Ver LimiteDeError.
        */}
        <LimiteDeError>
        {/*
          Lo que se ve la primera vez que se abre directo una pantalla que
          todavía no se descargó (un enlace a /mi-cuenta, el panel). Al
          navegar adentro de la tienda no aparece: se queda la pantalla
          anterior mientras baja la nueva.
        */}
        <Suspense fallback={<PantallaCargando />}>
        <Routes>

          {/* ── Rutas Públicas (sin autenticación) ─────────────────── */}
          {/*
           * La puerta de la tienda es la TIENDA, no el login.
           *
           * Antes lo primero que veía cualquiera era un formulario de inicio
           * de sesión, y eso es pedirle matrimonio a alguien que solo venía a
           * ver los precios. Ahora se entra, se mira y se llena el carrito
           * sin cuenta; la sesión se pide cuando de verdad hace falta (al
           * pagar, en Mi Cuenta, para guardar favoritos).
           */}
          <Route path="/"                element={<Store />} />
          <Route path="/iniciar-sesion"  element={<LoginClient />} />      {/* Login de clientes */}
          {/* Lo que abre el teléfono al escanear el QR del kiosco */}
          <Route path="/vincular/:codigo" element={<VincularKiosco />} />
          <Route path="/admin"           element={<LoginAdmin />} />       {/* Login de administradores */}
          <Route path="/admin/desde-app" element={<PanelDesdeApp />} />    {/* El panel dentro de la app del teléfono */}
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verification"    element={<Verification />} />     {/* Código de verificación */}
          <Route path="/create-password" element={<CreatePassword />} />
          <Route path="/login-password"  element={<LoginPassword />} />
          {/* Entrar con Google no basta para crear la cuenta: falta el teléfono
              y el consentimiento. Ver CompletarGoogle. */}
          <Route path="/completar-registro" element={<CompletarGoogle />} />
          {/*
            PÚBLICA a propósito: es el "dejar de recibirlos" del pie de los
            correos, y quien lo toca puede estar en un teléfono donde nunca
            inició sesión. Ver BajaNotificaciones.
          */}
          <Route path="/baja" element={<BajaNotificaciones />} />
          {/* Primera pantalla tras entrar: el saludo con el mapa */}
          <Route path="/bienvenida"      element={<Bienvenida />} />
          <Route path="/tienda-dashboard" element={<Dashboard />} />
          <Route path="/store"           element={<Store />} />
          {/*
            La ficha de un producto tiene dirección propia: se puede compartir,
            guardar y cerrar con el "atrás" del teléfono. Es la misma tienda
            (React no la vuelve a montar), con la ficha abierta encima. La
            vista previa de WhatsApp para estos enlaces la arma middleware.js.
          */}
          <Route path="/producto/:id"    element={<Store />} />
          {/* "Ver todos" de una fila de la portada: /seccion/familia-quesos */}
          <Route path="/seccion/:clave"  element={<Seccion />} />
          <Route path="/impresiones"     element={<Impresiones />} />
          {/*
            El juego del stand de la Expo, para la laptop. Pública porque no
            toca datos de nadie; los buscadores no la ven (robots.txt).
          */}
          <Route path="/juego"           element={<JuegoTiqui />} />
          {/*
           * Términos y privacidad. Es PÚBLICA a propósito: hay que poder leerla
           * ANTES de registrarse —que es justo cuando se decide si uno entrega
           * sus datos— y desde el enlace del pie sin tener cuenta.
           */}
          {/* Los documentos legales: una misma pantalla, cuatro textos. Ver utils/legales. */}
          <Route path="/terminos"        element={<Legal clave="terminos" />} />
          <Route path="/privacidad"      element={<Legal clave="privacidad" />} />
          <Route path="/cookies"         element={<Legal clave="cookies" />} />
          <Route path="/devoluciones"    element={<Legal clave="devoluciones" />} />

          {/*
           * ── Rutas Protegidas (requieren autenticación) ──────────────
           * <ProtectedRoute> verifica si hay sesión. Si no hay, redirige a "/".
           * <AdminLayout> envuelve las páginas del panel con el sidebar y el topbar.
           */}
          {/* soloPersonal: una sesión de cliente aquí ve la explicación, no el
              panel. Ver ProtectedRoute. */}
          <Route element={<ProtectedRoute soloPersonal />}>
            <Route element={<AdminLayout />}>
              {/* Lo que ve TODO el personal, admin o empleado */}
              <Route path="/dashboard"   element={<AdminDashboard />} />
              <Route path="/pedidos"     element={<Orders />} />
              <Route path="/cuenta"      element={<AccountSettings />} />
              {/* La ayuda: cada quien ve la de lo que puede usar. Ver AyudaPanel. */}
              <Route path="/ayuda"       element={<AyudaPanel />} />

              {/*
                soloAdmin: un empleado con sesión de personal válida no pasa de
                aquí — precios, proveedores, promociones, empleados, clientes y
                ajustes de la tienda son cosa del dueño. Ver ProtectedRoute.
              */}
              <Route element={<ProtectedRoute soloAdmin />}>
                <Route path="/inventario"  element={<Inventory />} />
                <Route path="/modulos"     element={<Modules />} />
                <Route path="/marcas"      element={<Brands />} />
                <Route path="/empleados"   element={<Employees />} />
                <Route path="/clientes"    element={<Customers />} />
                <Route path="/proveedores" element={<Suppliers />} />
                <Route path="/categorias"  element={<Categories />} />
                <Route path="/fidelidad"   element={<Fidelidad />} />
                <Route path="/promociones" element={<Promociones />} />
                <Route path="/pronostico"  element={<Pronostico />} />
                <Route path="/servicios-impresion" element={<ServiciosImpresion />} />
                <Route path="/tarjetas"    element={<GiftCards />} />
                {/* Nombre, logo y orden de la portada de la tienda */}
                <Route path="/personalizacion" element={<Personalizacion />} />
              </Route>
            </Route>
          </Route>

          {/*
           * ── Área "Mi Cuenta" del cliente (protegida) ──────────────
           * Mismo guard de sesión, pero con su propio layout (ClienteLayout).
           * Se van agregando rutas aquí conforme se cablea cada página.
           */}
          <Route element={<ProtectedRoute />}>
            <Route element={<ClienteLayout />}>
              <Route path="/mi-cuenta"           element={<DetallesCuenta />} />
              <Route path="/mi-cuenta/pedidos"   element={<MisPedidos />} />
              {/* Estado de UN pedido: línea de tiempo, envío y mapa en vivo */}
              <Route path="/mi-cuenta/pedido/:id" element={<EstadoPedido />} />
              <Route path="/mi-cuenta/favoritos" element={<Favoritos />} />
              {/* El Reparto del personal ya no vive aquí: está en la app. Ver ClienteLayout. */}

              <Route path="/mi-cuenta/recibidos"   element={<Recibidos />} />
              <Route path="/mi-cuenta/direcciones"    element={<Direcciones />} />
              <Route path="/mi-cuenta/pagos"          element={<MetodoPago />} />
              <Route path="/mi-cuenta/notificaciones" element={<Notificaciones />} />
              <Route path="/mi-cuenta/puntos"         element={<PuntosFidelidad />} />
              <Route path="/mi-cuenta/ayuda"       element={<CentroAyuda />} />
              {/* Claro u oscuro. Ver ModoContext. */}
              <Route path="/mi-cuenta/preferencias" element={<Preferencias />} />
            </Route>
          </Route>

          {/*
           * ── Cualquier otra cosa ────────────────────────────────────
           * Va de ÚLTIMA y a propósito: React Router elige la ruta más
           * específica, así que este comodín solo entra cuando ninguna de
           * arriba coincidió.
           *
           * Sin esta línea, una dirección mal escrita —o un enlace viejo que
           * alguien compartió por WhatsApp— renderizaba una pantalla en blanco
           * absoluto: ni encabezado, ni aviso, ni salida.
           */}
          <Route path="*" element={<NoEncontrado />} />

        </Routes>
        </Suspense>
        </LimiteDeError>
        </PedidoActivoProvider>
        </DireccionProvider>
        </FavoritosProvider>
        </EdadProvider>
        </ThemeProvider>
        </IdiomaProvider>
        </ModoProvider>
        </AjustesProvider>
      </AuthProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;