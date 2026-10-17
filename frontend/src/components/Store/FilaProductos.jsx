import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import styled from 'styled-components';
import ProductCard from './ProductCard';
import { useFilaDeslizable } from '../../hooks/useFilaDeslizable';
import { useIdioma } from '../../hooks/useIdioma';

// FilaProductos — una sección de la portada: título, flechas y la fila que se corre de lado. Es un
// componente aparte porque cada fila necesita su propio useFilaDeslizable. Sin recuadro: va sobre el fondo.
const Seccion = styled.section`
  margin-bottom: 34px;
`;

const Encabezado = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
`;

const Titulo = styled.h2`
  font-size: 24px;
  @media (max-width: 560px) { font-size: 21px; }
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--tinta);
  margin: 0;
`;

// El título como botón: tocarlo abre la sección completa. Se hereda todo del <h2> (tamaño, peso,
// color) para que siga LEYÉNDOSE como un título y no como un enlace disfrazado; lo único que
// delata que se puede tocar es la flechita, que aparece al acercar el cursor y se corre un pelo.
const TituloBoton = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  cursor: pointer;
  color: var(--tinta);
  transition: color var(--dur-press) var(--ease-out);

  & > svg {
    opacity: 1;
    transform: none;
    color: var(--tinta-tenue);
    transition: opacity var(--dur-press) var(--ease-out),
                transform var(--dur-press) var(--ease-out),
                color var(--dur-press) var(--ease-out);
  }

  @media (hover: hover) and (pointer: fine) {
    & > svg { opacity: 0; transform: translateX(-5px); }
    &:hover { color: var(--marca-texto-fuerte); }
    &:hover > svg { opacity: 1; transform: translateX(0); color: var(--marca-texto); }
  }

  &:active { transform: scale(0.99); }
`;

// "Ver todos" con la cuenta adentro: decir cuántos hay convierte el botón en información. "Ver
// todos (28)" se toca; "Ver todos" a secas puede que solo lleve a los mismos seis que ya se están
// viendo.
const VerTodos = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 6px 2px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--tinta-suave);
  cursor: pointer;
  transition: color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto-fuerte); }
  }
  &:active { transform: scale(0.97); }

  /* En el teléfono no cabía junto al título: "Nuevos en la tienda" se partía en tres renglones. Ahí
     el título mismo, con su flechita siempre visible, ya es la puerta a la sección completa. */
  @media (max-width: 560px) { display: none; }
`;

const Acciones = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
`;

const Subtitulo = styled.p`
  font-size: 13px;
  color: var(--tinta-tenue);
  margin: 2px 0 0;
`;

const Flechas = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;

  /* En pantalla táctil la fila se desliza con el dedo: las flechas sobran. */
  @media (hover: none), (pointer: coarse) { display: none; }
`;

const Circulo = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--linea);
  background: var(--papel);
  color: var(--tinta);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-press) var(--ease-out),
              border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out);
  &:hover:not(:disabled) { border-color: var(--marca-600); color: var(--marca-texto); background: var(--marca-50); }
  &:disabled { opacity: 0.35; cursor: default; }
`;

/* scroll-snap para que nunca quede una tarjeta cortada por la mitad. */
const Fila = styled.div`
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x proximity;

  /* Aire arriba y abajo, comido con márgenes negativos. Un contenedor con overflow-x recorta también
     por ARRIBA y por ABAJO (el navegador no deja tener un eje recortado y el otro suelto). */
  padding: 24px 16px 44px;
  margin: -24px -16px -40px;

  /* Fundido en las orillas: el aire lateral se desplaza con el contenido, así que al hacer scroll la
     tarjeta que sale se cortaba a filo. Con el degradado se desvanece. Mide lo mismo que el padding,
     para que en reposo caiga sobre espacio vacío y no toque la primera tarjeta. */
  mask-image: linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%);

  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;

  > * {
    flex: 0 0 clamp(160px, 21%, 214px);
    scroll-snap-align: start;
  }
`;

const FilaProductos = ({
  titulo,
  subtitulo,
  subtituloVars,
  productos,
  onVerDetalle,
  onAgregarAlCarrito,
  // Cuántos hay en total, contando los que no caben en la fila.
  total,
  // Si no viene, la sección no es navegable y el título se queda quieto: así
  // este componente sigue sirviendo donde no haya a dónde ir.
  onVerTodos,
}) => {
  const { fila, puedeIzq, puedeDer, izquierda, derecha } = useFilaDeslizable();
  const { t } = useIdioma();

  if (!productos?.length) return null;

  const cuantos = total ?? productos.length;
  // Ofrecer "ver todos" cuando ya se está viendo todo es una promesa vacía.
  const hayMas = cuantos > productos.length;

  return (
    <Seccion>
      <Encabezado>
        <div>
          {onVerTodos ? (
            <TituloBoton onClick={onVerTodos} aria-label={t('Ver todo en {seccion}', { seccion: t(titulo) })}>
              <Titulo as="span">{t(titulo)}</Titulo>
              <ArrowRight size={19} strokeWidth={2.4} />
            </TituloBoton>
          ) : (
            <Titulo>{t(titulo)}</Titulo>
          )}
          {subtitulo && <Subtitulo>{t(subtitulo, subtituloVars)}</Subtitulo>}
        </div>

        <Acciones>
          {onVerTodos && hayMas && (
            <VerTodos onClick={onVerTodos}>{t('Ver todos ({n})', { n: cuantos })}</VerTodos>
          )}
          {/* Con pocos productos no hay para dónde correr: no ponemos flechas. */}
          {(puedeIzq || puedeDer) && (
            <Flechas>
              <Circulo onClick={izquierda} disabled={!puedeIzq} aria-label={t('Ver anteriores de {seccion}', { seccion: t(titulo) })}>
                <ChevronLeft size={19} strokeWidth={2.2} />
              </Circulo>
              <Circulo onClick={derecha} disabled={!puedeDer} aria-label={t('Ver siguientes de {seccion}', { seccion: t(titulo) })}>
                <ChevronRight size={19} strokeWidth={2.2} />
              </Circulo>
            </Flechas>
          )}
        </Acciones>
      </Encabezado>

      <Fila ref={fila}>
        {productos.map((producto) => (
          <ProductCard
            key={producto.id}
            producto={producto}
            onVerDetalle={onVerDetalle}
            onAgregarAlCarrito={onAgregarAlCarrito}
          />
        ))}
      </Fila>
    </Seccion>
  );
};

export default FilaProductos;
