import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { RUTAS_DEL_PANEL } from '../../utils/sesion';
import { useIdioma } from '../../hooks/useIdioma';

// BotonWhatsApp — el botón flotante para escribirle a la tienda. Detalles que copiamos de los
// e-commerce que lo hacen bien: - Aparece después de bajar un poco, no de entrada. Saltar encima
// del cliente apenas abre la página es la forma más rápida de que lo ignore.

// El número va en el .env (VITE_WHATSAPP). Formato internacional sin signos:
// El Salvador es 503 + los 8 dígitos.
const NUMERO = (import.meta.env.VITE_WHATSAPP || '').replace(/\D/g, '');
const SALUDO = 'Hola, vengo de la tienda en linea y quisiera consultar sobre un producto.';
const CLAVE_GLOBO = 'la635_globo_whatsapp';

// Dónde NO va el botón de WhatsApp: el panel y los logins. Las rutas del panel salen de la lista
// oficial (utils/sesion.js), así cualquier pantalla nueva del cliente lo tiene sola.
const RUTAS_SIN_BOTON = [
  ...RUTAS_DEL_PANEL,
  '/register', '/forgot-password', '/verification', '/create-password', '/login-password',
];

const BotonWhatsApp = () => {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [globo, setGlobo] = useState(false);
  const { t } = useIdioma();

  useEffect(() => {
    // Aparece cuando ya se bajó una pantalla: para entonces el cliente está
    // buscando algo y el botón deja de ser una interrupción.
    const alScroll = () => setVisible(window.scrollY > 320);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  useEffect(() => {
    if (!visible || sessionStorage.getItem(CLAVE_GLOBO)) return undefined;
    // Un respiro antes del globito para que no salga junto con el botón.
    const t = setTimeout(() => setGlobo(true), 1200);
    return () => clearTimeout(t);
  }, [visible]);

  const cerrarGlobo = (e) => {
    e.stopPropagation();
    setGlobo(false);
    sessionStorage.setItem(CLAVE_GLOBO, '1');
  };

  // Sin número configurado no se muestra nada: mejor eso que un botón roto.
  if (!NUMERO) return null;
  // Login y panel del empleado se quedan sin él (el "/" exacto es el login).
  if (pathname === '/' || RUTAS_SIN_BOTON.some(r => pathname.startsWith(r))) return null;

  const enlace = `https://wa.me/${NUMERO}?text=${encodeURIComponent(t(SALUDO))}`;

  return (
    <div
      style={{
        position: 'fixed',
        right: 'max(20px, env(safe-area-inset-right))',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        zIndex: 900, // debajo de modales y del carrito, encima del contenido
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.9)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity var(--dur-modal) var(--ease-out), transform var(--dur-modal) var(--ease-out)',
      }}
    >
      {globo && (
        <div
          style={{
            position: 'relative',
            background: 'var(--papel)',
            color: 'var(--tinta)',
            borderRadius: 14,
            padding: '10px 34px 10px 14px',
            fontSize: 13,
            lineHeight: 1.35,
            maxWidth: 210,
            boxShadow: 'var(--sombra-flotante)',
            border: '1px solid var(--linea)',
          }}
        >
          {t('¿Necesitas ayuda? Escríbenos')}
          <button
            onClick={cerrarGlobo}
            aria-label={t('Cerrar mensaje')}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--tinta-tenue)', padding: 2, display: 'flex',
            }}
          >
            <X size={13} strokeWidth={2.4} />
          </button>
        </div>
      )}

      <a
        href={enlace}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('Escribir a la tienda por WhatsApp')}
        title={t('Escribir por WhatsApp')}
        className="hover-scale press"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#25D366', // el verde propio de WhatsApp, reconocible al instante
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 22px rgba(37, 211, 102, 0.42)',
          flexShrink: 0,
        }}
      >
        <MessageCircle size={27} strokeWidth={2} fill="currentColor" />
      </a>
    </div>
  );
};

export default BotonWhatsApp;
