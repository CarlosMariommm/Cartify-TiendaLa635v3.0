import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Store as StoreIcon } from 'lucide-react';
import MarcaTienda from './MarcaTienda';
import { useIdioma } from '../../hooks/useIdioma';

// ENCABEZADO DE LAS PANTALLAS DE ACCESO — EncabezadoAcceso.jsx
// La barra de arriba del login, el registro, la verificación y las contraseñas: SOLO el nombre y
// la salida a la tienda.

const Barra = styled.header`
  background: var(--papel);
  border-bottom: 1px solid var(--linea);
  padding: 0 28px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 700px) { padding: 0 16px; }
`;

/* La misma pastilla que los botones del encabezado de la tienda. */
const VolverTienda = styled.button`
  background: var(--papel);
  border: 1px solid var(--linea);
  color: var(--tinta-suave);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 16px;
  height: 44px;
  border-radius: var(--radio-pill);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto); }
  }
  &:active { transform: scale(0.97); }
`;

const EncabezadoAcceso = () => {
  const navigate = useNavigate();
  const { t } = useIdioma();

  return (
    <Barra>
      <MarcaTienda tamano={19} alto={38} onClick={() => navigate('/')} titulo={t('Ir a la tienda')} />
      <VolverTienda type="button" onClick={() => navigate('/')}>
        <StoreIcon size={16} strokeWidth={2.2} /> {t('Seguir viendo la tienda')}
      </VolverTienda>
    </Barra>
  );
};

export default EncabezadoAcceso;
