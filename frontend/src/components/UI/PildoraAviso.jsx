import { resolveValue } from 'react-hot-toast';
import { ICONOS, iconoConEmoji } from '../../utils/iconosAviso';

// LA PÍLDORA DE LOS AVISOS — PildoraAviso.jsx
// Todos los avisos de la web salen con la misma cara: la píldora oscura con un círculo de color a
// la izquierda, abajo al centro, la de la landing page.

const iconoDe = (t) => {
  if (typeof t.icon === 'string') return iconoConEmoji(t.icon);
  if (t.icon) return t.icon;
  if (t.type === 'success') return ICONOS.exito;
  if (t.type === 'error') return ICONOS.error;
  if (t.type === 'loading') return ICONOS.cargando;
  return ICONOS.info;
};

const PildoraAviso = ({ t }) => (
  <div
    {...t.ariaProps}
    className={t.visible ? 'aviso-entra' : 'aviso-sale'}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 18px 10px 10px',
      // 22 es la mitad de la píldora de una línea: con una línea es cápsula,
      // con dos (un mensaje largo) queda un rectángulo redondeado.
      borderRadius: 22,
      background: 'var(--aviso-fondo, #1C1614)',
      color: 'var(--aviso-texto, #fff)',
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.35,
      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
      maxWidth: 'min(92vw, 440px)',
    }}
  >
    {iconoDe(t)}
    <span style={{ minWidth: 0, overflowWrap: 'anywhere', textWrap: 'pretty' }}>{resolveValue(t.message, t)}</span>
  </div>
);

export default PildoraAviso;
