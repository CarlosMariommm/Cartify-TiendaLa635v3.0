import { useState } from 'react';
import styled from 'styled-components';
import { useAjustesCtx } from '../../context/AjustesContext';

// LA MARCA DE LA TIENDA — MarcaTienda.jsx
// El nombre (o el logo) de la tienda, UNA sola vez para toda la aplicación.

const Envoltura = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
`;

// El botón existe solo cuando la marca lleva a algún lado. Se declara aparte para no meterle
// apariencia de botón a un texto que no se puede tocar.
const Boton = styled.button`
  background: none;
  border: none;
  font-family: inherit;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
  transition: background-color var(--dur-press) var(--ease-out);

  &:hover { background-color: var(--realce); }
`;

const Linea = styled.span`
  display: block;
  font-size: ${(p) => p.$tamano}px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: ${(p) => p.$color};

  /* Igual que el menú: en pantallas chicas la marca cede sitio a lo demás. */
  @media (max-width: 700px) { font-size: ${(p) => p.$tamano * 0.82}px; }
`;

const Logo = styled.img`
  height: ${(p) => p.$alto}px;
  width: auto;
  max-width: 168px;
  object-fit: contain;
  display: block;

  @media (max-width: 700px) {
    height: ${(p) => p.$alto * 0.82}px;
    max-width: 124px;
  }
`;

// Recibe: tamano, alto, color, onClick.
const MarcaTienda = ({ tamano = 19, alto = 38, color = 'var(--tinta, #111)', onClick, titulo }) => {
  const { ajustes } = useAjustesCtx();
  // Si la imagen no carga —Cloudinary caído, el archivo borrado— se cae al nombre escrito. Sin esto
  // la tienda se quedaba sin nombre en ningún lado.
  const [logoFallo, setLogoFallo] = useState(false);

  const nombreCompleto = `${ajustes.nombreLinea1 || ''} ${ajustes.nombreLinea2 || ''}`.trim();

  const contenido = ajustes.logoUrl && !logoFallo ? (
    <Logo
      src={ajustes.logoUrl}
      /* El alt lleva el nombre escrito para que quien usa lector de pantalla
         oiga la tienda y no "imagen". */
      alt={nombreCompleto}
      $alto={alto}
      onError={() => setLogoFallo(true)}
    />
  ) : (
    <>
      <Linea $tamano={tamano} $color={color}>{ajustes.nombreLinea1}</Linea>
      {ajustes.nombreLinea2 && (
        <Linea $tamano={tamano} $color={color}>{ajustes.nombreLinea2}</Linea>
      )}
    </>
  );

  if (onClick) {
    return (
      <Boton type="button" onClick={onClick} title={titulo || nombreCompleto} aria-label={nombreCompleto}>
        {contenido}
      </Boton>
    );
  }

  return <Envoltura aria-label={nombreCompleto}>{contenido}</Envoltura>;
};

export default MarcaTienda;
