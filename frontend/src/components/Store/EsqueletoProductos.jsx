import styled from 'styled-components';

// ESQUELETOS DE PRODUCTO — EsqueletoProductos.jsx
// Lo que se ve mientras el catálogo viene en camino. O sea que un arranque lento se leía como una
// tienda vacía — lo peor que puede decir un negocio de sí mismo.

const Tarjeta = styled.div`
  border: 1px solid var(--linea, #ECE7E1);
  border-radius: 14px;
  overflow: hidden;
  background: var(--papel, #fff);
`;

// Mismo alto que la foto de un producto, para que la fila no cambie de altura.
const Foto = styled.div`
  aspect-ratio: 1 / 1;
  width: 100%;
`;

const Cuerpo = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Linea = styled.div`
  height: 11px;
  border-radius: 6px;
  width: ${(p) => p.$ancho || '100%'};
`;

// `cuantos` por defecto en 8: llena la primera pantalla sin pasarse. Pintar treinta esqueletos
// para después reemplazarlos es trabajo tirado.
const EsqueletoProductos = ({ cuantos = 8 }) =>
  Array.from({ length: cuantos }).map((_, i) => (
    <Tarjeta key={i} aria-hidden="true">
      <Foto className="esqueleto" />
      <Cuerpo>
        <Linea className="esqueleto" />
        <Linea className="esqueleto" $ancho="60%" />
        <Linea className="esqueleto" $ancho="35%" />
      </Cuerpo>
    </Tarjeta>
  ));

export default EsqueletoProductos;
