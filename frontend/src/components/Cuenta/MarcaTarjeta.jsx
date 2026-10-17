import { CreditCard } from 'lucide-react';
import { useIdioma } from '../../hooks/useIdioma';

// El logo de la red de la tarjeta, dibujado aquí mismo (sin imágenes que descargar). `sobreColor`
// es para ponerlo encima de la tarjeta de colores de la vista previa: ahí va en blanco.
const MarcaTarjeta = ({ marca = 'otra', sobreColor = false, alto = 30 }) => {
  const { t } = useIdioma();
  const ancho = Math.round(alto * 1.5);
  const caja = {
    width: ancho,
    height: alto,
    borderRadius: 6,
    display: 'grid',
    placeItems: 'center',
    flex: 'none',
    overflow: 'hidden',
  };

  if (marca === 'visa') {
    return (
      <span
        aria-label="Visa"
        style={{ ...caja, background: sobreColor ? 'transparent' : '#1A1F71' }}
      >
        <span style={{ color: '#fff', fontWeight: 900, fontStyle: 'italic', fontSize: alto * 0.46, letterSpacing: '-0.02em' }}>
          VISA
        </span>
      </span>
    );
  }

  if (marca === 'mastercard') {
    return (
      <span aria-label="Mastercard" style={{ ...caja, background: sobreColor ? 'transparent' : '#1C1C1C' }}>
        <svg width={ancho * 0.72} height={alto * 0.62} viewBox="0 0 38 24" aria-hidden="true">
          <circle cx="13" cy="12" r="11" fill="#EB001B" />
          <circle cx="25" cy="12" r="11" fill="#F79E1B" />
          <path d="M19 3.3a11 11 0 0 1 0 17.4 11 11 0 0 1 0-17.4Z" fill="#FF5F00" />
        </svg>
      </span>
    );
  }

  if (marca === 'amex') {
    return (
      <span aria-label="American Express" style={{ ...caja, background: sobreColor ? 'transparent' : '#2E77BC' }}>
        <span
          style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: alto * 0.34,
            letterSpacing: '0.02em',
            border: sobreColor ? '1.5px solid #fff' : 'none',
            padding: sobreColor ? '1px 3px' : 0,
            borderRadius: 3,
          }}
        >
          AMEX
        </span>
      </span>
    );
  }

  if (marca === 'discover') {
    return (
      <span aria-label="Discover" style={{ ...caja, background: sobreColor ? 'transparent' : '#fff', border: sobreColor ? 'none' : '1px solid #e5e5e5' }}>
        <span style={{ color: sobreColor ? '#fff' : '#231F20', fontWeight: 800, fontSize: alto * 0.24, display: 'flex', alignItems: 'center', gap: 1 }}>
          DISC<span style={{ width: alto * 0.24, height: alto * 0.24, borderRadius: '50%', background: '#F58220', display: 'inline-block' }} />VER
        </span>
      </span>
    );
  }

  return (
    <span aria-label={t('Tarjeta')} style={{ ...caja, background: sobreColor ? 'transparent' : 'var(--marca-50)' }}>
      <CreditCard size={alto * 0.6} color={sobreColor ? '#fff' : 'var(--marca-600)'} />
    </span>
  );
};

export default MarcaTarjeta;
