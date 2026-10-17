import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { RotateCcw, Store } from 'lucide-react';
import { areaDeRuta } from '../../utils/sesion';
import Mascota from './Mascota';
import { traducir, leerIdiomaGuardado } from '../../utils/idioma';

// LÍMITE DE ERROR — LimiteDeError.jsx
// La red debajo del trapecio. Cuando algo revienta durante el dibujado, React no deja la pantalla
// a medias: desmonta TODO el árbol.

// DOS PALETAS, SEGÚN DÓNDE REVENTÓ: los colores del panel o los de la tienda, según la pantalla
// donde ocurrió el error.
const colorPrincipal = (p) => (p.$panel ? 'var(--theme-primary, #003049)' : 'var(--marca-600, #003049)');
const colorTarjeta = (p) => (p.$panel ? 'var(--theme-card-bg, #fff)' : 'var(--papel, #fff)');

const Pantalla = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${(p) => (p.$panel ? "var(--theme-main-bg, #F1F6F9)" : "var(--papel, #fff)")};
`;

// Directo sobre el fondo, sin tarjeta: la mascota, el texto y los botones se separan con aire.
const Contenido = styled.div`
  width: 100%;
  max-width: 460px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// La mascota caída, con el cordón cortado.
const Ilustracion = styled.div`
  margin-bottom: 18px;
`;

const Titulo = styled.h1`
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 800;
  color: ${(p) => (p.$panel ? "var(--theme-text-primary, #1C1614)" : "var(--tinta, #1C1614)")};
`;

const Texto = styled.p`
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.55;
  color: ${(p) => (p.$panel ? "var(--theme-text-secondary, #6B6560)" : "var(--tinta-suave, #6B6560)")};
`;

const Botones = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Boton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  /* Dos decisiones en una: de qué paleta sale el color, y si el botón es el
     sólido o el de borde. Se resuelven juntas para no anidar interpolaciones. */
  border: ${(p) => (p.$primario ? 'none' : `1.5px solid ${colorPrincipal(p)}`)};
  background: ${(p) => (p.$primario ? colorPrincipal(p) : colorTarjeta(p))};
  color: ${(p) => (p.$primario ? '#fff' : colorPrincipal(p))};

  &:active { transform: scale(0.97); }

  @media (prefers-reduced-motion: reduce) {
    &:active { transform: none; }
  }
`;

/* Solo en desarrollo: el mensaje crudo, para no tener que abrir la consola. */
const Detalle = styled.pre`
  align-self: stretch;
  margin: 22px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #1C1614;
  color: #F2C9C0;
  font-size: 11.5px;
  line-height: 1.5;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow: auto;
`;

class LimiteDeError extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola con el árbol de componentes: es lo que de verdad
    // sirve para encontrar el archivo culpable.
    console.error('Error de render contenido por LimiteDeError:', error, info?.componentStack);
  }

  // Recargar y no un setState: si el árbol se cayó a la mitad, el estado que quedó vivo alrededor ya
  // no es de fiar. Volver a arrancar limpio es más honesto que fingir que no pasó nada.
  recargar = () => window.location.reload();

  irALaTienda = () => { window.location.href = '/'; };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // Dónde reventó decide con qué paleta se pinta la disculpa.
    const panel = !!this.props.enPanel;
    // Es una clase (sin ganchos): lee el idioma al pintarse. En el panel, español.
    const t = (texto) => traducir(panel ? 'es' : leerIdiomaGuardado(), texto);

    return (
      <Pantalla role="alert" $panel={panel}>
        <Contenido>
          <Ilustracion><Mascota pose="error" alto={180} /></Ilustracion>
          <Titulo $panel={panel}>{t('Algo se nos rompió acá')}</Titulo>
          <Texto $panel={panel}>
            {t('No fue tu culpa. Esta pantalla no cargó bien. Puedes volver a intentarlo o regresar a la tienda.')}
          </Texto>
          <Botones>
            <Boton type="button" $primario $panel={panel} onClick={this.recargar}>
              <RotateCcw size={15} strokeWidth={2.2} /> {t('Volver a intentar')}
            </Boton>
            <Boton type="button" $panel={panel} onClick={this.irALaTienda}>
              <Store size={15} strokeWidth={2.2} /> {t('Ir a la tienda')}
            </Boton>
          </Botones>

          {import.meta.env.DEV && (
            <Detalle>{error?.stack || String(error)}</Detalle>
          )}
        </Contenido>
      </Pantalla>
    );
  }
}

// El envoltorio que le dice al límite dónde está parada la persona. Va aparte porque
// componentDidCatch solo existe en clases y las clases no pueden usar hooks. Así el que se exporta
// sigue llamándose igual y App.jsx no se entera del cambio.
const LimiteDeErrorConArea = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <LimiteDeError enPanel={areaDeRuta(pathname) === 'personal'}>
      {children}
    </LimiteDeError>
  );
};

export default LimiteDeErrorConArea;
