import styled from 'styled-components';
import { Lock, ArrowLeft, Store, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVolver } from '../hooks/useVolver';

// SIN PERMISO — SinPermiso.jsx
// Cuando alguien con sesión abre una pantalla que no le toca. El caso real: la misma persona
// administra la tienda Y es clienta de su propia tienda, con el mismo correo en las dos tablas.

const Fondo = styled.div`
  min-height: 100vh;
  background: var(--papel);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
`;

const Caja = styled.div`
  max-width: 440px;
  text-align: center;
`;

// El color de marca va puesto en el propio componente (escalaMarca) y no en :root, porque en las
// rutas del panel useTemporada() apaga esa variable.
const Icono = styled.div`
  width: 74px;
  height: 74px;
  margin: 0 auto 22px;
  border-radius: 50%;
  background: var(--marca-50);
  border: 1px solid var(--linea);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--marca-texto);
`;

const Titulo = styled.h1`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tinta);
  margin: 0 0 12px;
`;

const Texto = styled.p`
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--tinta-suave);
  margin: 0 0 26px;
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
  padding: 12px 20px;
  border-radius: var(--radio-pill);
  border: 1px solid ${(p) => (p.$principal ? 'transparent' : 'var(--linea)')};
  background: ${(p) => (p.$principal ? 'var(--marca-600)' : 'var(--papel)')};
  color: ${(p) => (p.$principal ? '#fff' : 'var(--tinta)')};
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--dur-press) var(--ease-out),
              border-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${(p) => (p.$principal ? 'var(--marca-700)' : 'var(--marca-50)')};
      border-color: ${(p) => (p.$principal ? 'transparent' : 'var(--marca-600)')};
    }
  }
  &:active { transform: scale(0.97); }
`;

const SinPermiso = () => {
  const { esCliente, haySesionDeCliente } = useAuth();
  const { volver, hayAtras, casa } = useVolver();
  // Sin escala derivada. Esta pantalla la calculaba del color que el dueño hubiera elegido y la
  // pintaba en línea, porque en las rutas del panel useTemporada() borra las variables de marca.

  // "Viene con cuenta de cliente" es la misma situación de las dos maneras de llegar aquí: con la
  // sesión de cliente puesta en esta pantalla, o sin sesión de personal pero con una de cliente
  // abierta en la tienda.
  const conCuentaDeCliente = esCliente || haySesionDeCliente;

  return (
    <Fondo>
      <Caja>
        <Icono><Lock size={30} strokeWidth={1.8} /></Icono>

        <Titulo>Esta pantalla no es para tu cuenta</Titulo>
        <Texto>
          {conCuentaDeCliente
            ? 'Estás entrando con tu cuenta de cliente, y esta parte es del personal de la tienda. Tu sesión está bien: solo que esta puerta no es la tuya.'
            : 'Su cuenta no tiene permiso para abrir esta pantalla. Si cree que debería tenerlo, pídaselo a quien administra la tienda.'}
        </Texto>

        <Botones>
          <Boton $principal onClick={() => { window.location.href = casa; }}>
            {conCuentaDeCliente
              ? <><Store size={16} strokeWidth={2.2} /> Ir a la tienda</>
              : <><LayoutDashboard size={16} strokeWidth={2.2} /> Ir al panel</>}
          </Boton>

          {/* La salida que de verdad sirve cuando quien mira ES del personal: entrar por su puerta. Las dos
             sesiones conviven, así que hacerlo no le cierra la de cliente que tiene abierta en la tienda. */}
          {conCuentaDeCliente && (
            <Boton onClick={() => { window.location.href = '/admin'; }}>
              <LayoutDashboard size={16} strokeWidth={2.2} /> Entrar como personal
            </Boton>
          )}

          {hayAtras && (
            <Boton onClick={volver}>
              <ArrowLeft size={16} strokeWidth={2.2} /> Volver atrás
            </Boton>
          )}
        </Botones>
      </Caja>
    </Fondo>
  );
};

export default SinPermiso;
