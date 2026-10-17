import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Search, Mic, ShoppingBag, User } from 'lucide-react';
import MenuTienda from './MenuTienda';
import SelectorDireccion from './SelectorDireccion';
import CintaTemporada from './CintaTemporada';
import { useAuth } from '../../hooks/useAuth';
import { useIdioma } from '../../hooks/useIdioma';

// ENCABEZADO DE LA TIENDA — HeaderTienda.jsx
// La misma barra de arriba para TODAS las pantallas del cliente.

const BROWN = 'var(--marca-600)';

const Barra = styled.header`
  background: var(--papel);
  padding: 0 28px;
  border-bottom: 1px solid var(--linea);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 200;

  /* En teléfono el encabezado pasa a DOS renglones. Nombre, dirección, buscador, asistente, carrito
     y cuenta nunca cupieron en una fila de 375px: el buscador es el que cede (flex:1 con
     min-width:0) y terminaba midiendo catorce píxeles mientras los botones se salían de la pantalla. */
  @media (max-width: 700px) {
    height: auto;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 8px;
    padding: 8px 16px 10px;
  }
`;

const SearchBox = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  background: var(--papel);
  border: 1px solid var(--linea);
  border-radius: var(--radio-pill);
  padding: 0 6px;
  gap: 10px;
  height: 46px;
  transition: box-shadow var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out);

  &:focus-within {
    border-color: ${BROWN};
    /* El aro del foco es el mismo café pero al 12%. Va con color-mix y no
       pegándole "1F" al hex: ahora BROWN es una variable, y "var(--marca-600)1F"
       no es un color, es basura que el navegador descarta en silencio. */
    box-shadow: 0 0 0 3px color-mix(in srgb, ${BROWN} 12%, transparent);
  }

  /* El renglón de abajo, completo. La propiedad order lo manda después de los botones aunque en el
     código venga antes: en el marcado va en medio porque ahí se lee en pantalla grande, y no vale la
     pena mover el HTML —y con él el orden del tabulador— solo para acomodar el teléfono. */
  @media (max-width: 700px) {
    order: 3;
    flex-basis: 100%;
    max-width: none;
    margin: 0;
    height: 44px;
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: var(--tinta);
    &::placeholder { color: var(--tinta-tenue); }
  }
`;

const SearchIcon = styled.span`
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${BROWN};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Derecha = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 700px) {
    margin-left: auto;
    gap: 6px;
  }
`;

// El texto de los botones. En pantalla angosta se esconde a la vista pero NO se borra: sigue
// disponible para el lector de pantalla, así el botón se sigue llamando "Carrito" para quien no lo
// ve. Con display:none quedaría mudo.
const Etiqueta = styled.span`
  @media (max-width: 900px) {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`;

const Pill = styled.button`
  background: ${(p) => (p.$solida ? BROWN : 'var(--papel)')};
  border: 1px solid ${(p) => (p.$solida ? BROWN : 'var(--linea)')};
  color: ${(p) => (p.$solida ? '#fff' : 'var(--tinta-suave)')};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 16px;
  height: 44px;
  border-radius: var(--radio-pill);
  font-size: 14px;
  font-weight: ${(p) => (p.$solida ? 600 : 500)};
  font-family: inherit;
  white-space: nowrap;
  position: relative;
  transition: background-color var(--dur-press) var(--ease-out),
              border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  /* El borde solo se pinta de marca en la pastilla SOLIDA (Asistente, que ya nace de ese color). */
  @media (hover: hover) and (pointer: fine) {
    &:hover { border-color: ${(p) => (p.$solida ? BROWN : 'var(--linea)')}; color: ${(p) => (p.$solida ? '#fff' : BROWN)}; }
  }
  &:active { transform: scale(0.97); }

  /* Con el texto escondido queda solo el icono: se cuadra para que no se
     achique a una pastilla flaca imposible de atinar. */
  @media (max-width: 900px) {
    padding: 0;
    width: 44px;
    justify-content: center;
  }
`;

const Globo = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: var(--radio-pill);
  background: var(--tinta);
  color: var(--sobre-tinta);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HeaderTienda = ({
  moduloSeleccionado,
  onElegirModulo,
  terminoBusqueda,
  onBuscar,
  cantidadItems = 0,
  onAbrirCarrito,
  onAbrirAsistente,
  // Qué hacer cuando le dan Enter al buscador en una pantalla que SÍ maneja la búsqueda. Normalmente
  // nada: la lista de abajo ya se filtró mientras escribía.
  onEnviarBusqueda,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useIdioma();

  // Cuando la pantalla no maneja la búsqueda (Impresiones), el buscador guarda lo escrito acá y al
  // enviarlo lleva a la tienda con el término puesto. Así teclear algo desde Impresiones hace lo que
  // uno espera —encontrarlo— en vez de no hacer nada.
  const [textoLocal, setTextoLocal] = useState('');
  const manejaBusqueda = typeof onBuscar === 'function';
  const texto = manejaBusqueda ? terminoBusqueda : textoLocal;

  const escribir = (valor) => (manejaBusqueda ? onBuscar(valor) : setTextoLocal(valor));

  const enviarBusqueda = (e) => {
    e.preventDefault();
    if (manejaBusqueda) { onEnviarBusqueda?.(); return; }
    if (!textoLocal.trim()) return;
    navigate(`/?q=${encodeURIComponent(textoLocal.trim())}`);
  };

  const elegirModulo = (id) => {
    if (onElegirModulo) { onElegirModulo(id); return; }
    // Sin manejador local, cambiar de pasillo es volver a la tienda en ese pasillo.
    navigate(id ? `/?modulo=${encodeURIComponent(id)}` : '/');
  };

  return (
    <>
    <Barra>
      {/* El nombre de la tienda abre sus pasillos en vez de mandar a otra
          pantalla: se elige el módulo sin perder de vista lo que se compraba. */}
      <MenuTienda moduloSeleccionado={moduloSeleccionado} onElegirModulo={elegirModulo} />

      {/* A dónde le llevamos el pedido, cambiable sin salir de comprar */}
      <SelectorDireccion />

      <SearchBox as="form" onSubmit={enviarBusqueda} role="search">
        <SearchIcon><Search size={17} strokeWidth={2.4} /></SearchIcon>
        <input
          type="text"
          placeholder={t('Buscar productos...')}
          aria-label={t('Buscar productos')}
          value={texto || ''}
          onChange={(e) => escribir(e.target.value)}
        />
        {texto && (
          <button
            type="button"
            onClick={() => escribir('')}
            aria-label={t('Borrar la búsqueda')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta-tenue)', fontSize: 16, width: 32, height: 32 }}
          >✕</button>
        )}
      </SearchBox>

      <Derecha>
        <Pill
          $solida
          onClick={() => (onAbrirAsistente ? onAbrirAsistente() : navigate('/'))}
          title={t('Asistente por voz')}
        >
          <Mic size={18} strokeWidth={2.2} /> <Etiqueta>{t('Asistente')}</Etiqueta>
        </Pill>

        {/* data-destino-carrito: a dónde vuela la foto al agregar (utils/volarAlCarrito.js). */}
        <Pill data-destino-carrito onClick={() => (onAbrirCarrito ? onAbrirCarrito() : navigate('/'))} title={t('Carrito')}>
          <ShoppingBag size={18} strokeWidth={2.2} /> <Etiqueta>{t('Carrito')}</Etiqueta>
          {/* El `key` con la cantidad es lo que hace que esto se vea. Una animación CSS corre al montar el
             elemento y nunca más; si el globo solo cambia su número, el rebote no vuelve a dispararse.
             Cambiando la key, React lo remonta en cada cambio de cuenta y la animación arranca de nuevo. */}
          {cantidadItems > 0 && (
            <Globo key={cantidadItems} className="globo-pop">{cantidadItems}</Globo>
          )}
        </Pill>

        {/* Sin sesión el botón invita a entrar; con sesión lleva a su cuenta. La tienda se ve sin cuenta,
           así que ofrecerle "Mi Cuenta" a alguien que no tiene ninguna sería una puerta a un cuarto que no
           existe. */}
        {isAuthenticated ? (
          <Pill onClick={() => navigate('/mi-cuenta')} title={t('Mi Cuenta')}>
            <User size={18} strokeWidth={2.2} /> <Etiqueta>{t('Mi Cuenta')}</Etiqueta>
          </Pill>
        ) : (
          <Pill onClick={() => navigate('/iniciar-sesion?volver=/')} title={t('Iniciar sesión')}>
            <User size={18} strokeWidth={2.2} /> <Etiqueta>{t('Ingresar')}</Etiqueta>
          </Pill>
        )}
      </Derecha>
    </Barra>

    {/* El saludo de la fecha. Va FUERA de la barra a propósito: la barra es
        pegajosa, y la cinta metida adentro se llevaría alto en todas las
        pantallas todo el año. Ver CintaTemporada. */}
    <CintaTemporada />
    </>
  );
};

export default HeaderTienda;
