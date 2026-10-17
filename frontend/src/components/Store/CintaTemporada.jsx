import styled from 'styled-components';
import { useTemaCalculado } from '../../hooks/useTemporada';

// CINTA DE TEMPORADA — CintaTemporada.jsx
// La franja con el saludo de la fecha, justo debajo del encabezado. Es la mitad seria de la
// decoración: las figuras que caen ponen el ambiente, pero esto DICE algo.

const Banda = styled.div`
  background: var(--marca-600);
  color: #fff;
  text-align: center;
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  position: relative;
  overflow: hidden;

  /* El festón de las orillas: triangulitos como los de una guirnalda de papel. Dibujado con un
     degradado repetido en vez de una imagen — pesa cero y se pinta del color del tema porque sale de
     la misma variable. */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 64px;
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.16) 0 6px,
      transparent 6px 12px
    );
  }
  &::before { left: 0; }
  &::after  { right: 0; }

  /* En teléfono el texto ya ocupa todo el ancho: el festón lo apretaría. */
  @media (max-width: 700px) {
    font-size: 12.5px;
    padding: 8px 12px;
    &::before, &::after { display: none; }
  }
`;

const CintaTemporada = () => {
  const { tema, activo, conDecoracion, saludoNormal, enPanel } = useTemaCalculado();

  // Hay temporada: su saludo, si la decoración está encendida.
  if (activo) {
    if (!conDecoracion || !tema?.decoracion?.saludo) return null;
    return <Banda role="status">{tema.decoracion.saludo}</Banda>;
  }

  // Día normal: el saludo que el dueño haya escrito para el resto del año, del color de la casa. En
  // blanco no se pinta nada — ni un div vacío: un contenedor invisible sigue empujando el contenido
  // de abajo.
  if (!enPanel && saludoNormal) return <Banda role="status">{saludoNormal}</Banda>;
  return null;
};

export default CintaTemporada;
