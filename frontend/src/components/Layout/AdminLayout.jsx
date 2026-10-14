import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import TiquiPanel from '../Admin/TiquiPanel';
import InvitacionProveedores from '../Admin/InvitacionProveedores';
import TutorialApartado from '../Admin/TutorialApartado';
import { useMenuPanel } from '../../hooks/useMenuPanel';
import { overlayTransition } from '../../utils/motion';

/*
 * AdminLayout — el armazón del panel: menú a la izquierda, barra arriba y el
 * contenido de cada pantalla en el medio.
 *
 * El estado del menú vive acá y no dentro del Sidebar porque son dos los que
 * lo necesitan: el menú para saber si está adentro o afuera, y la barra de
 * arriba para pintar la hamburguesa que lo llama.
 */
const AdminLayout = () => {
  const { abierto, oculto, cerrar, alternar, alTocarNavegacion } = useMenuPanel();
  const { lectura } = useTheme();

  return (
    /*
     * "Menos animaciones" (Cuenta o el botón de la paleta): las animaciones de
     * framer-motion no las alcanza el CSS, así que se apagan aquí. Sin la
     * opción, se respeta lo que diga el sistema del equipo.
     */
    <MotionConfig reducedMotion={lectura?.movimiento ? 'always' : 'user'}>
    <div className="admin-theme flex min-h-screen" style={{ backgroundColor: 'var(--theme-main-bg)' }}>

      <Sidebar
        abierto={abierto}
        oculto={oculto}
        onCerrar={cerrar}
        onTocarNavegacion={alTocarNavegacion}
      />

      {/*
        El velo: apaga el contenido de atrás y, sobre todo, da dónde tocar para
        salir. Un cajón sin velo obliga a buscar la equis. Solo opacidad, que es
        lo que un fondo tiene que hacer, y nunca en pantalla ancha.
      */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={cerrar}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/*
        El margen que le abre paso al menú solo existe cuando el menú ocupa
        lugar. En teléfono el contenido usa el ancho completo.

        El min-w-0 no es decorativo: un hijo de flex se niega a encogerse por
        debajo de su contenido, así que una tabla ancha o la gráfica estiraban
        toda la columna y la página entera terminaba corriéndose de lado.
      */}
      <div className="flex-1 min-w-0 lg:ml-64 flex flex-col">
        <TopBar onAlternarMenu={alternar} menuAbierto={abierto} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/*
        Tiqui, la asistente del equipo: flota en la esquina de abajo en todas
        las pantallas del panel, y la charla sigue al cambiar de pantalla.
        Es otra asistente que la de la tienda. Ver TiquiPanel.
      */}
      <TiquiPanel />

      {/* Al administrador, la primera vez en cada apartado: un recorrido corto. */}
      <TutorialApartado />

      {/* Al administrador: que diga por dónde se le pide a cada proveedor. */}
      <InvitacionProveedores />
    </div>
    </MotionConfig>
  );
};

export default AdminLayout;
