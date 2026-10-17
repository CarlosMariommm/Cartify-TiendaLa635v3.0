import { ChevronDown, HelpCircle, Menu, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { temaDeRuta } from '../../utils/ayudaPanel';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useDropdown } from '../../hooks/useDropdown';
import ThemeSwitcher from './ThemeSwitcher';

const TopBar = ({ onAlternarMenu, menuAbierto = false }) => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { user, logoutTodo } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isOpen, toggle, close, ref } = useDropdown();

  // El botón del PANEL cierra las dos sesiones (ver logoutTodo en AuthContext): quien toca "Cerrar
  // sesión" aquí espera salir del todo, no encontrarse conectado como cliente al volver a la tienda.
  const handleLogout = () => {
    close();
    logoutTodo();
    navigate('/admin');
  };

  // Mostramos al usuario realmente logueado (antes había un placeholder fijo).
  const displayName = user?.userName || user?.fullnName || 'Usuario';
  const roleLabel =
    user?.type === 'admin' ? 'Administrador' :
    user?.type === 'employee' ? 'Empleado' : 'Sesión activa';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <header
      className="h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 transition-colors duration-300"
      style={{ backgroundColor: c.topbarBg, borderBottom: `1px solid ${c.sidebarBorder}` }}
    >
      {/* La hamburguesa es la única puerta al menú en teléfono, así que se queda en la esquina donde el
         pulgar la busca. De 1024px para arriba el menú ya está a la vista y el botón sobra. */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onAlternarMenu}
          aria-label="Abrir el menú"
          aria-expanded={menuAbierto}
          aria-controls="menu-panel"
          className="lg:hidden -ml-2 p-2 rounded-lg press"
          style={{ color: c.textPrimary }}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* La ayuda de ESTA pantalla: abre /ayuda justo en el tema de donde se está parado (o en "Cómo se
           usa el panel" si la pantalla no tiene uno). */}
        <Link
          to={`/ayuda?tema=${temaDeRuta(pathname) || 'primeros-pasos'}`}
          aria-label="Ayuda de esta pantalla"
          title="¿Cómo funciona esta pantalla?"
          className="w-10 h-10 rounded-full border flex items-center justify-center flex-none press"
          style={{ borderColor: c.cardBorder, color: c.textSecondary, backgroundColor: c.cardBg }}
        >
          <HelpCircle className="w-5 h-5" />
        </Link>

        {/* Selector de accesibilidad: paletas a un clic desde cualquier pantalla */}
        <ThemeSwitcher />

        {/* Separador sutil */}
        <div className="w-px h-8 hidden sm:block" style={{ backgroundColor: c.sidebarBorder }} />

        {/* Bloque del usuario logueado, con su desplegable */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="true"
            aria-expanded={isOpen}
            className="flex items-center gap-2 sm:gap-3 min-w-0 press"
          >
            {/* El nombre se esconde en teléfono: entre la hamburguesa, el selector de paleta y la inicial no
               queda ancho, y un nombre largo empujaba la barra a lo ancho. La inicial y el rol se recuperan al
               tocar "Cuenta". */}
            <div className="text-right hidden sm:block min-w-0">
              <p className="text-sm font-semibold leading-tight truncate" style={{ color: c.textPrimary }}>{displayName}</p>
              <p className="text-xs truncate" style={{ color: c.textMuted }}>{roleLabel}</p>
            </div>
            <div
              className="h-10 w-10 flex-none rounded-full flex items-center justify-center text-sm font-bold shadow-sm overflow-hidden"
              style={{ backgroundColor: c.primary, color: c.buttonText }}
            >
              {/* Su foto de perfil si la tiene; si no, las iniciales de siempre. */}
              {user?.image ? (
                <img src={user.image} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <ChevronDown className="w-4 h-4 flex-none transition-transform" style={{ color: c.textMuted, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl overflow-hidden z-50"
                style={{ backgroundColor: c.cardBg, borderColor: c.cardBorder }}
              >
                <div className="px-4 py-3 border-b sm:hidden" style={{ borderColor: c.cardBorder }}>
                  <p className="text-sm font-semibold truncate" style={{ color: c.textPrimary }}>{displayName}</p>
                  <p className="text-xs truncate" style={{ color: c.textMuted }}>{roleLabel}</p>
                </div>
                <Link
                  to="/cuenta"
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: c.textPrimary }}
                >
                  <Settings className="w-4 h-4" style={{ color: c.textMuted }} />
                  Cuenta
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors hover:opacity-80"
                  style={{ color: '#EF4444' }}
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

