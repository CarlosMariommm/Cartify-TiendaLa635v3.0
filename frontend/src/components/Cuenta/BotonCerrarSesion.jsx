import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../hooks/useClientTheme';
import { useAuth } from '../../hooks/useAuth';
import { useIdioma } from '../../hooks/useIdioma';

// BotonCerrarSesion — "Cerrar sesión" de Mi Cuenta, con su confirmación. Vive en Mis datos, al
// lado de "Guardar cambios". Pide confirmación porque es lo único de la cuenta que te saca de
// ella.
const BotonCerrarSesion = () => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { logout } = useAuth();
  const { t } = useIdioma();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [confirmar, setConfirmar] = useState(false);

  const salir = () => {
    // Solo la del cliente: la del panel, si la misma persona la tiene abierta, sigue.
    logout('cliente');
    navigate('/');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        className="press inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-colors"
        style={{ border: `1px solid ${c.cardBorder}`, color: c.textSecondary, background: 'transparent' }}
      >
        <LogOut className="w-4 h-4" aria-hidden="true" /> {t('Cerrar sesión')}
      </button>

      {/* Por un portal: ver el porqué en ModalCancelarMiPedido. */}
      {createPortal(
        <AnimatePresence>
          {confirmar && (
            <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-0 bg-black/45"
                onClick={() => setConfirmar(false)}
              />
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-xl"
                style={{ backgroundColor: c.cardBg || 'var(--papel)', color: c.textPrimary }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-cerrar-sesion"
              >
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: c.primaryLight, color: c.primary }}
                >
                  <LogOut className="h-5 w-5" />
                </div>
                <h2 id="titulo-cerrar-sesion" className="mb-1 text-center text-lg font-bold">{t('¿Cerrar sesión?')}</h2>
                <p className="mb-6 text-center text-sm" style={{ color: c.textSecondary }}>
                  {t('Tendrás que volver a ingresar tu correo y contraseña para entrar de nuevo.')}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmar(false)}
                    autoFocus
                    className="press flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{ backgroundColor: c.primaryLight, color: c.textPrimary }}
                  >
                    {t('Quedarme')}
                  </button>
                  <button
                    type="button"
                    onClick={salir}
                    className="press flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: c.primary }}
                  >
                    {t('Cerrar sesión')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default BotonCerrarSesion;
