import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { areaDeRuta } from '../../utils/sesion';
import Mascota from './Mascota';
import { useIdioma } from '../../hooks/useIdioma';

// AVISO SIN CONEXIÓN — AvisoSinConexion.jsx
// Si se cae el internet, sale Tiqui con el cordón desenchufado y se aclara que el carrito no se
// pierde; el aviso se va solo cuando vuelve la conexión.

const MS_DE_VUELTA = 2400;

const AvisoSinConexion = () => {
  const { t } = useIdioma();
  const { pathname } = useLocation();
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [deVuelta, setDeVuelta] = useState(false);

  useEffect(() => {
    let reloj = null;
    const alCaer = () => {
      clearTimeout(reloj);
      setDeVuelta(false);
      setEnLinea(false);
    };
    const alVolver = () => {
      setEnLinea(true);
      setDeVuelta(true);
      reloj = setTimeout(() => setDeVuelta(false), MS_DE_VUELTA);
    };
    window.addEventListener('offline', alCaer);
    window.addEventListener('online', alVolver);
    return () => {
      window.removeEventListener('offline', alCaer);
      window.removeEventListener('online', alVolver);
      clearTimeout(reloj);
    };
  }, []);

  if (areaDeRuta(pathname) === 'personal') return null;
  if (enLinea && !deVuelta) return null;

  return (
    <div className="aviso-conexion" role="status" aria-live="polite">
      <Mascota pose={enLinea ? 'saludo' : 'sin-conexion'} alto={58} />
      <div className="aviso-conexion-texto">
        <strong>{enLinea ? t('Volvió la conexión') : t('Sin conexión')}</strong>
        <span>{enLinea ? t('Ya puedes seguir comprando.') : t('Revisa tu internet. Tu carrito queda guardado.')}</span>
      </div>
    </div>
  );
};

export default AvisoSinConexion;
