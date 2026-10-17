import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Menu, Store as StoreIcon, Check } from 'lucide-react';
import { useDropdown } from '../../hooks/useDropdown';
import { useModulos } from '../../hooks/useModulos';
import MarcaTienda from './MarcaTienda';
import { iconoDeModulo, flujoDeModulo } from '../../utils/modulos';
import { useIdioma } from '../../hooks/useIdioma';

// MENÚ DE LA TIENDA — el nombre que abre los pasillos
// Tocar el nombre de la tienda despliega sus módulos. Ahora los pasillos se abren ahí mismo,
// encima de los productos, y se elige sin salir de ningún lado.

const BROWN = 'var(--marca-600)';

const Zona = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const Boton = styled.button`
  background: none;
  border: none;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 4px 4px;
  border-radius: 12px;
  transition: background-color var(--dur-press, 120ms) var(--ease-out, ease),
              transform var(--dur-press, 120ms) var(--ease-out, ease);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-50, #FAF5F0); }
  }
  &:active { transform: scale(0.97); }

  /* Menos aire entre el icono y el nombre: en el encabezado de dos renglones
     cada píxel de alto se lo quita a los productos. */
  @media (max-width: 700px) { gap: 7px; }
`;

const Hamburguesa = styled.span`
  color: var(--tinta-suave);
  display: flex;
  align-items: center;
`;

// Las dos lineas del nombre y el logo se mudaron a MarcaTienda.jsx, que ahora
// pinta la marca en TODAS las barras. Este archivo solo la coloca.

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: 268px;
  background: var(--papel);
  border: 1px solid var(--linea);
  border-radius: 16px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 300;

  /* El panel CRECE desde el botón que lo abrió, no aparece de la nada. Servía para que no apareciera
     de golpe, pero no contaba de DÓNDE venía. */
  transform-origin: top left;
  animation: panelIn var(--dur-popover, 180ms) var(--ease-out, ease);

  /* Con muchos pasillos la lista pasaba de largo del teléfono y los últimos quedaban fuera de
     alcance. Que se desplace el panel, nunca la página. */
  @media (max-width: 700px) {
    width: min(268px, calc(100vw - 32px));
    max-height: calc(100vh - 150px);
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
  align-items: center;
  gap: 11px;
  padding: 11px 10px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  color: var(--tinta);
  min-height: 44px;

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-50, #FAF5F0); }
  }
`;

const MenuTienda = ({ moduloSeleccionado, onElegirModulo }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isOpen, toggle, close, ref } = useDropdown();
  const { modulos } = useModulos();
  const { t } = useIdioma();
  // El nombre y el logo salen de la base, no del código. Ver AjustesContext.

  // A dónde lleva cada módulo. Los pasillos normales NO navegan: cambian el pasillo de esta misma
  // pantalla, que es más rápido y no pierde el carrito de vista. Solo los de flujo propio
  // (impresiones) abren otra pantalla.
  const abrir = (modulo) => {
    close();
    if (flujoDeModulo(modulo) === 'impresiones') {
      navigate('/impresiones');
      return;
    }
    onElegirModulo?.(modulo._id);
  };

  const verTodo = () => {
    close();
    // Desde Impresiones hay que VOLVER a la tienda: aquella es pantalla aparte, así que cambiarle el
    // pasillo por props no la saca de ahí.
    if (enPantallaPropia) { navigate('/'); return; }
    onElegirModulo?.(null);
  };

  // CUÁL PASILLO ESTÁ MARCADO.
  // Los pasillos normales se saben por `moduloSeleccionado`, que es estado de la tienda. Pero
  // Impresiones no es un pasillo de la tienda: es OTRA PANTALLA, y ahí ese estado no existe.
  const enPantallaPropia = pathname.startsWith('/impresiones');

  const estaActiva = (modulo) =>
    enPantallaPropia
      ? flujoDeModulo(modulo) === 'impresiones'
      : String(moduloSeleccionado) === String(modulo._id);

  // "Toda la tienda" solo está marcada si de verdad estamos en la tienda.
  const todaLaTienda = !enPantallaPropia && !moduloSeleccionado;

  return (
    <Zona ref={ref}>
      {/* Sin aria-label: el nombre del botón sale de lo que se VE ("Tienda la 635") más un texto oculto
         que solo oyen los lectores de pantalla. Con un aria-label propio el nombre no empezaba con lo
         escrito y quien maneja el teléfono por voz, que dice lo que lee, no le atinaba. */}
      <Boton
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Hamburguesa><Menu size={20} strokeWidth={2.2} /></Hamburguesa>
        {/* El logo de la tienda (MarcaTienda.jsx), en el tamaño de referencia que usan todas las barras. */}
        <MarcaTienda tamano={19} alto={38} />
        <span className="sr-only">{' — '}{t('Pasillos de la tienda')}</span>
      </Boton>

      {isOpen && (
        <Panel role="menu">
          <Titulo>{t('Pasillos de la tienda')}</Titulo>

          <Opcion role="menuitem" $activa={todaLaTienda} onClick={verTodo}>
            <StoreIcon size={17} strokeWidth={2.1} color={todaLaTienda ? BROWN : 'var(--tinta-tenue)'} />
            {t('Toda la tienda')}
            {todaLaTienda && <Check size={15} strokeWidth={2.6} color={BROWN} style={{ marginLeft: 'auto' }} />}
          </Opcion>

          {modulos.map((m) => {
            const Icono = iconoDeModulo(m);
            const activa = estaActiva(m);
            return (
              <Opcion key={m._id} role="menuitem" $activa={activa} onClick={() => abrir(m)}>
                <Icono size={17} strokeWidth={2.1} color={activa ? BROWN : 'var(--tinta-tenue)'} />
                {m.name}
                {activa && <Check size={15} strokeWidth={2.6} color={BROWN} style={{ marginLeft: 'auto' }} />}
              </Opcion>
            );
          })}
        </Panel>
      )}
    </Zona>
  );
};

export default MenuTienda;
