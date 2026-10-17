import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { MapPin, ChevronDown, Check, Plus, Signpost, TriangleAlert } from 'lucide-react';
import { useDropdown } from '../../hooks/useDropdown';
import { useDireccionCtx } from '../../context/DireccionContext';
import { useAuth } from '../../hooks/useAuth';
import { useIdioma } from '../../hooks/useIdioma';

// SELECTOR DE DIRECCIÓN — el "entregar en" del encabezado
// A la par del nombre de la tienda, dice a dónde va el pedido y deja cambiarlo sin salir de
// comprar.

const BROWN = 'var(--marca-600)';

const Zona = styled.div`
  position: relative;
  flex-shrink: 0;
  /* Separado del nombre de la tienda con una línea: pegado se leía como si la dirección fuera parte
     del nombre del negocio. */
  padding-left: 18px;
  margin-left: 4px;
  border-left: 1px solid var(--linea, #ebebeb);

  /* En pantalla chica no cabe "Entregar en · Casa", pero tampoco se borra: queda el pin solo. Saber
     a dónde va el pedido —y poder cambiarlo— es de las pocas cosas que arruinan una entrega si se
     descubren tarde. */
  @media (max-width: 820px) {
    position: static;
    padding-left: 0;
    margin-left: 0;
    border-left: none;
  }
`;

/* El pin, que solo aparece cuando el texto ya no cabe. */
const Pin = styled.span`
  display: none;
  color: var(--tinta-suave);

  @media (max-width: 820px) { display: flex; }
`;

/* "Entregar en" + el nombre + la flechita: lo que se va cuando falta ancho. */
const Detalle = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;

  @media (max-width: 820px) { display: none; }
`;

const Boton = styled.button`
  background: none;
  border: none;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 8px;
  border-radius: 10px;
  max-width: 230px;
  transition: background-color var(--dur-press, 120ms) var(--ease-out, ease),
              transform var(--dur-press, 120ms) var(--ease-out, ease);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-50, #FAF5F0); }
  }
  &:active { transform: scale(0.97); }

  @media (max-width: 820px) {
    width: 44px;
    height: 44px;
    padding: 0;
    justify-content: center;
  }
`;

const Textos = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
`;

const Arriba = styled.span`
  font-size: 11px;
  color: var(--tinta-tenue);
  line-height: 1;
`;

const Nombre = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: var(--tinta);
  line-height: 1.3;
  max-width: 165px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 8px;
  width: 290px;
  background: var(--papel);
  border: 1px solid var(--linea);
  border-radius: 16px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 300;
  animation: cardIn 180ms var(--ease-out, ease);

  /* De orilla a orilla y colgado del encabezado (ver la Zona de arriba). Anclado al botón se salía
     casi 50px por la derecha y arrastraba la página entera de lado. */
  @media (max-width: 820px) {
    left: 16px;
    right: 16px;
    width: auto;
    top: calc(100% + 8px);
    max-height: calc(100vh - 160px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
`;

const Titulo = styled.p`
  font-size: 11px;
  color: var(--tinta-tenue);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin: 8px 10px 6px;
`;

const Opcion = styled.button`
  width: 100%;
  background: ${(p) => (p.$activa ? 'var(--marca-50, #FAF5F0)' : 'none')};
  border: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 11px;

  &:hover { background: var(--marca-50, #FAF5F0); }
`;

const Agregar = styled(Opcion)`
  color: var(--marca-texto);
  font-weight: 700;
  font-size: 13px;
  align-items: center;
  border-top: 1px solid var(--linea);
  border-radius: 0 0 11px 11px;
  margin-top: 4px;
`;

// El aviso de dirección incompleta. Las direcciones viejas se guardaron como texto suelto, sin
// punto en el mapa. Se entregan igual —el repartidor lee la calle— pero no se puede seguir el
// pedido ni calcular cuánto falta.
const Aviso = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 2px 6px 6px;
  padding: 9px 10px;
  border-radius: 11px;
  background: var(--aviso-fondo);
  border: 1px solid var(--aviso-borde);
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--aviso-texto);
`;

const SinPunto = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--aviso-vivo);
  margin-top: 3px;
`;

const Vacio = styled.p`
  font-size: 12.5px;
  color: var(--tinta-tenue);
  line-height: 1.5;
  margin: 4px 10px 10px;
`;

const SelectorDireccion = () => {
  const navigate = useNavigate();
  const { isOpen, toggle, close, ref } = useDropdown();
  const { direcciones, indice, etiqueta, cargando, elegir, activa } = useDireccionCtx();
  const { user } = useAuth();
  const { t } = useIdioma();

  // Una dirección "completa" es la que trae punto en el mapa; sin eso no hay
  // seguimiento en vivo ni tiempo estimado, solo un texto para el repartidor.
  const sinPunto = (dir) => dir?.lat == null || dir?.lng == null;

  // El mapa es la única forma de dar de alta una dirección (así queda con coordenadas y el
  // repartidor la encuentra). Al guardar vuelve a la tienda, no a Mi Cuenta: quien estaba comprando
  // quiere seguir comprando.
  const abrirMapa = () => {
    close();
    navigate('/bienvenida?volver=/store');
  };

  // Sin cuenta no hay direcciones que mostrar. Quien entra de curioso no tiene por qué ver un
  // "Entregar en" vacío ni que le pidan una dirección antes de haber visto un solo precio.
  if (user?.type !== 'client') return null;

  // Mientras carga no se pinta nada: un "Sin dirección" que parpadea y
  // después cambia se siente roto aunque no lo esté.
  if (cargando) return null;

  return (
    <Zona ref={ref}>
      {/* Dos líneas, como el logo de al lado: la etiqueta chiquita arriba y el nombre de la dirección
         abajo. Sin icono — el pin solo repetía lo que ya dice "Entregar en", y en un encabezado cada
         elemento de más le quita aire al buscador. */}
      <Boton
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        /* Con el texto escondido el botón se quedaba sin nombre: en el teléfono
           esto es lo único que dice qué hace ese pin. */
        aria-label={t('Entregar en {lugar}', { lugar: etiqueta || t('elegir dirección') })}
      >
        <Pin><MapPin size={19} strokeWidth={2.2} /></Pin>
        <Detalle>
          <Textos>
            <Arriba>{t('Entregar en')}</Arriba>
            <Nombre>{etiqueta || t('Elegir dirección')}</Nombre>
          </Textos>
          <ChevronDown size={16} strokeWidth={2.4} color="var(--tinta-suave)" />
        </Detalle>
      </Boton>

      {isOpen && (
        <Panel role="listbox">
          <Titulo>{t('Tus direcciones')}</Titulo>

          {activa && sinPunto(activa) && (
            <Aviso>
              <TriangleAlert size={14} strokeWidth={2.3} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>{t('Completa los detalles de esta dirección.')}</strong>{' '}
                {t('No tiene un punto marcado en el mapa, así que no podrás seguir tu pedido en vivo.')}
              </span>
            </Aviso>
          )}

          {direcciones.length === 0 ? (
            <Vacio>{t('Todavía no tienes direcciones guardadas. Marca en el mapa dónde te dejamos tus pedidos.')}</Vacio>
          ) : (
            direcciones.map((dir, i) => (
              <Opcion
                key={i}
                $activa={i === indice}
                role="option"
                aria-selected={i === indice}
                onClick={() => { elegir(i); close(); }}
              >
                <MapPin
                  size={16}
                  strokeWidth={2.2}
                  color={i === indice ? BROWN : 'var(--tinta-apagada)'}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <span style={{ minWidth: 0, flex: 1 }}>
                  {dir.nombre && (
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--tinta)' }}>
                      {dir.nombre}
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--tinta-suave)', lineHeight: 1.4 }}>
                    {dir.direccion}
                  </span>
                  {dir.referencia && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--tinta-tenue)', marginTop: 2 }}>
                      <Signpost size={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                      {dir.referencia}
                    </span>
                  )}
                  {/* Se marca en la lista, no solo en la elegida: así se ve
                      cuál conviene usar antes de tocarla */}
                  {sinPunto(dir) && (
                    <SinPunto>
                      <TriangleAlert size={11} strokeWidth={2.4} /> {t('Completa los detalles')}
                    </SinPunto>
                  )}
                </span>
                {i === indice && <Check size={16} strokeWidth={2.6} color={BROWN} style={{ flexShrink: 0, marginTop: 2 }} />}
              </Opcion>
            ))
          )}

          <Agregar onClick={abrirMapa}>
            <Plus size={15} strokeWidth={2.6} /> {t('Agregar en el mapa')}
          </Agregar>
        </Panel>
      )}
    </Zona>
  );
};

export default SelectorDireccion;
