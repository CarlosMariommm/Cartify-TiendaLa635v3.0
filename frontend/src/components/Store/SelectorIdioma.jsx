import { Globe } from 'lucide-react';
import { useIdioma } from '../../hooks/useIdioma';
import { IDIOMAS } from '../../utils/idioma';

// El idioma, a la mano en el pie de la tienda: quien no lee español no va a encontrar
// "Preferencias" dentro de Mi Cuenta (ni tiene cuenta todavía). Cada opción se escribe en su
// propio idioma: "English", no "Inglés".
const SelectorIdioma = () => {
  const { idioma, setIdioma, t } = useIdioma();

  return (
    <div role="radiogroup" aria-label={t('Idioma')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Globe size={14} strokeWidth={2} aria-hidden="true" />
      {IDIOMAS.map((op, i) => {
        const activo = idioma === op.clave;
        return (
          <span key={op.clave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span aria-hidden="true">·</span>}
            <button
              type="button"
              role="radio"
              aria-checked={activo}
              lang={op.clave}
              onClick={() => setIdioma(op.clave)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 2px',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
                fontWeight: activo ? 700 : 400,
                textDecoration: activo ? 'underline' : 'none',
                textUnderlineOffset: 3,
              }}
            >
              {op.nombre}
            </button>
          </span>
        );
      })}
    </div>
  );
};

export default SelectorIdioma;
