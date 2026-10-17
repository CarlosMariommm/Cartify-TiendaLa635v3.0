import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useIdioma } from '../../hooks/useIdioma';

// CampoContrasena — input de contraseña con el ojo para verla.
// `BotonOjo` es solo el ojo, para las pantallas que ya arman su propio input.
export const BotonOjo = ({ visible, onToggle, derecha = 14 }) => {
  const { t } = useIdioma();
  return (
  <button
    type="button"
    onClick={onToggle}
    tabIndex={-1}
    aria-label={visible ? t('Ocultar contraseña') : t('Mostrar contraseña')}
    title={visible ? t('Ocultar contraseña') : t('Mostrar contraseña')}
    style={{
      position: 'absolute',
      right: derecha,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      color: 'var(--tinta-tenue)',
      zIndex: 2,
    }}
  >
    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
  </button>
  );
};

const CampoContrasena = forwardRef(({ className = '', ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  const { t } = useIdioma();

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        // Espacio a la derecha para que el texto no pase por debajo del ojo.
        className={`${className} pr-11`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Fuera del recorrido del tabulador: quien navega con teclado va del campo al botón de entrar, no
        // a un interruptor visual.
        tabIndex={-1}
        aria-label={visible ? t('Ocultar contraseña') : t('Mostrar contraseña')}
        title={visible ? t('Ocultar contraseña') : t('Mostrar contraseña')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tinta-tenue)] hover:text-[var(--tinta-suave)] transition-colors"
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
});

CampoContrasena.displayName = 'CampoContrasena';

export default CampoContrasena;
