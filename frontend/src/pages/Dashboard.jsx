import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import HeaderTienda from '../components/Store/HeaderTienda';
import { useModulos } from '../hooks/useModulos';
import { useAuth } from '../hooks/useAuth';
import { iconoDeModulo, flujoDeModulo } from '../utils/modulos';

const BROWN = '#003049';
const BROWN_DARK = '#00283D';

const Container = styled.div`
  min-height: 100vh;
  background: var(--papel);
  display: flex;
  flex-direction: column;
`;

const Body = styled.div`
  flex: 1;
  padding: 40px 32px;
  width: 100%;
  box-sizing: border-box;
  max-width: 800px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: var(--tinta);
  margin: 0 0 20px 0;
`;

const ServiceGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

// Cada servicio es un botón, no un div con clic: al div no se llega con Tab, y quien usa el panel
// con teclado no podía abrir ningún servicio.
const ServiceCard = styled.button`
  width: 100%;
  border: none;
  font: inherit;
  text-align: left;
  background: ${BROWN};
  border-radius: 14px;
  padding: 40px 28px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  gap: 20px;

  &:hover {
    transform: translateY(-2px);
    background: ${BROWN_DARK};
  }

  &:focus-visible {
    outline: 3px solid var(--tinta);
    outline-offset: 3px;
  }
`;

// Dentro de un botón solo cabe texto, por eso aquí todo es span.
const ServiceIcon = styled.span`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Vacio = styled.p`
  color: var(--tinta-tenue);
  font-size: 14px;
  text-align: center;
  padding: 40px 0;
`;

const ServiceTitle = styled.span`
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0 0 6px 0;
`;

const ServiceDesc = styled.span`
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
`;

const Footer = styled.div`
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: var(--tinta-apagada);
  margin-top: auto;
`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { modulos, cargando } = useModulos();

  // La sesión ya no se lee a mano de localStorage: vive en dos cajones, uno por área, y quién manda
  // depende de dónde está parada la persona. Leer la llave 'token' aquí dejaba esta pantalla
  // mandando al login para siempre, porque esa llave ya no existe. Ver AuthContext.
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/iniciar-sesion?volver=/tienda-dashboard');
    }
  }, [isAuthenticated, navigate]);

  // A dónde lleva cada módulo. Los pasillos normales van a la MISMA tienda, ya parada en su
  // estantería; solo los que tienen flujo propio abren otra pantalla. Por eso agregar la panadería
  // no necesita ruta nueva.
  const abrirModulo = (modulo) => {
    if (flujoDeModulo(modulo) === 'impresiones') {
      navigate('/impresiones');
      return;
    }
    navigate(`/store?modulo=${modulo._id}`);
  };

  return (
    <Container>
      {/* El MISMO encabezado de la tienda. Aquí había una barra propia con el nombre escrito a mano y
         centrado y un "Cerrar Sesión" en rojo: sin buscador, sin carrito y sin logo, parecía otro sitio.
         Salir de la cuenta sigue a un toque, en Mi Cuenta, como en el resto de la tienda. */}
      <HeaderTienda />

      <Body>
        <SectionTitle>Servicios</SectionTitle>

        {/* Los servicios salen de los módulos de la tienda. */}
        {cargando ? (
          <Vacio>Cargando los servicios…</Vacio>
        ) : modulos.length === 0 ? (
          <Vacio>Todavía no hay servicios disponibles.</Vacio>
        ) : (
          <ServiceGrid>
            {modulos.map((modulo) => {
              const Icono = iconoDeModulo(modulo);
              return (
                <ServiceCard key={modulo._id} type="button" onClick={() => abrirModulo(modulo)}>
                  <ServiceIcon aria-hidden="true"><Icono size={26} strokeWidth={1.8} /></ServiceIcon>
                  <span>
                    <ServiceTitle>{modulo.name}</ServiceTitle>
                    <ServiceDesc>{modulo.description || 'Ver los productos de esta sección'}</ServiceDesc>
                  </span>
                </ServiceCard>
              );
            })}
          </ServiceGrid>
        )}
      </Body>

      <Footer>Sobre Nosotros</Footer>
    </Container>
  );
};

export default Dashboard;