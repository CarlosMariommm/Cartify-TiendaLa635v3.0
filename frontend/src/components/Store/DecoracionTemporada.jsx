import { useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Snowflake, Heart, Star, Leaf } from 'lucide-react';

// DECORACIÓN DE TEMPORADA — DecoracionTemporada.jsx
// Las figuras que caen de fondo: copos en Navidad, corazones en San Valentín, confeti para la
// Independencia y murciélagos en Halloween.

/* Cae recto: la nieve. */
const caerRecto = keyframes`
  from { transform: translate3d(0, -10vh, 0) rotate(0deg); }
  to   { transform: translate3d(0, 110vh, 0) rotate(180deg); }
`;

/* Cae meciéndose: hojas, confeti, corazones. */
const caerMeciendo = keyframes`
  from   { transform: translate3d(0, -10vh, 0) rotate(0deg); }
  33%    { transform: translate3d(24px, 30vh, 0) rotate(90deg); }
  66%    { transform: translate3d(-20px, 70vh, 0) rotate(200deg); }
  to     { transform: translate3d(10px, 110vh, 0) rotate(320deg); }
`;

// La capa. `fixed` para que las figuras caigan sobre toda la pantalla y no se corten al hacer
// scroll, y `overflow: hidden` para que ninguna se salga de lado y saque una barra de
// desplazamiento horizontal.
const Capa = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  /* Debajo del encabezado (200) y de los modales, encima del fondo. Las figuras pasan por detrás de
     las tarjetas de producto, no por delante. */
  z-index: 1;

  /* Quien pidió menos movimiento no ve nada de esto. */
  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const Figura = styled.span`
  position: absolute;
  top: 0;
  left: ${(p) => p.$izquierda}%;
  color: ${(p) => p.$color};
  opacity: ${(p) => p.$opacidad};
  display: block;
  will-change: transform;

  animation: ${(p) => (p.$caida === 'lenta' ? caerRecto : caerMeciendo)}
    ${(p) => p.$duracion}s linear infinite;
  animation-delay: -${(p) => p.$retraso}s;

  /* En teléfono caen menos y más chicas: la pantalla es una cuarta parte de ancho, así que la misma
     cantidad se siente como una tormenta. */
  @media (max-width: 700px) {
    transform: scale(0.75);
    ${(p) => p.$indice % 2 === 1 && css`display: none;`}
  }
`;

/* El confeti no es un icono: son papelitos, y un rectángulo los dibuja mejor. */
const Papelito = styled(Figura)`
  width: ${(p) => p.$ancho}px;
  height: ${(p) => p.$alto}px;
  background: ${(p) => p.$color};
  border-radius: 1px;
`;

// El murciélago, dibujado con CSS. No hay icono de murciélago en la librería y no vale la pena
// traer una dependencia entera por Halloween: dos alas hechas con border-radius y un cuerpo en
// medio se leen igual de lejos, que es a la distancia que se ve esto.
const Murcielago = styled(Figura)`
  width: 16px;
  height: 9px;
  background: ${(p) => p.$color};
  border-radius: 50% 50% 45% 45% / 90% 90% 30% 30%;
  clip-path: polygon(0% 30%, 18% 0%, 34% 42%, 50% 18%, 66% 42%, 82% 0%, 100% 30%, 82% 100%, 50% 72%, 18% 100%);
`;

// Las posiciones, tamaños y tiempos de cada figura. Se calculan UNA vez y con una fórmula, no con
// Math.random(): así la nieve no salta a otro sitio cada vez que React vuelve a dibujar la
// pantalla —que es en cada clic al carrito—.
const repartir = (cantidad) =>
  Array.from({ length: cantidad }, (_, i) => ({
    indice: i,
    izquierda: ((i * 37) % 100),
    duracion: 11 + ((i * 7) % 9),      // entre 11 y 19 segundos
    retraso: (i * 13) % 17,            // arranca ya empezada, no todas juntas
    tamano: 11 + ((i * 5) % 9),        // entre 11 y 19 px
    opacidad: 0.16 + ((i % 4) * 0.05), // entre 0.16 y 0.31
  }));

// Las figuras que son iconos. Corazones y estrellas van rellenos (de contorno se ven como un
// dibujo a medio hacer); copos y hojas, de línea.
const ICONOS = { corazon: Heart, estrella: Star, hoja: Leaf, copo: Snowflake };

const DecoracionTemporada = ({ tema }) => {
  const decoracion = tema?.decoracion;

  // Se recalcula solo si cambia el tema, no en cada render de la tienda.
  const figuras = useMemo(
    () => repartir(decoracion?.cantidad || 0),
    [decoracion?.cantidad]
  );

  if (!decoracion || decoracion.figura === 'ninguna' || !figuras.length) return null;

  // Los colores salen del propio tema, no de una lista aparte: así el copo de Navidad es del mismo
  // verde que los botones, y si algún día se cambia la paleta del tema la decoración lo sigue sin
  // que nadie venga a ajustarla.
  const colores = [tema.colores['--marca-600'], tema.colores['--acento'], tema.colores['--marca-400']];

  return (
    <Capa aria-hidden="true">
      {figuras.map((f) => {
        const color = colores[f.indice % colores.length];
        // La `key` va suelta y NO dentro de lo que se hace spread: React 19
        // avisa —con razón— porque una key escondida en un objeto se pierde
        // de vista y deja de cumplir su función.
        const comunes = {
          $indice: f.indice,
          $izquierda: f.izquierda,
          $duracion: f.duracion,
          $retraso: f.retraso,
          $opacidad: f.opacidad,
          $color: color,
          $caida: decoracion.caida,
        };

        if (decoracion.figura === 'confeti') {
          return <Papelito key={f.indice} {...comunes} $ancho={f.tamano * 0.5} $alto={f.tamano} />;
        }
        if (decoracion.figura === 'murcielago') {
          return <Murcielago key={f.indice} {...comunes} />;
        }

        const Icono = ICONOS[decoracion.figura] || Snowflake;
        const relleno = decoracion.figura === 'corazon' || decoracion.figura === 'estrella';
        return (
          <Figura key={f.indice} {...comunes}>
            <Icono
              size={f.tamano}
              strokeWidth={relleno ? 0 : 1.8}
              fill={relleno ? color : 'none'}
            />
          </Figura>
        );
      })}
    </Capa>
  );
};

export default DecoracionTemporada;
