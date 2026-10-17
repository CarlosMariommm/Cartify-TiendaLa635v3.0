import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { MailX, Loader2, Store as StoreIcon, Settings } from 'lucide-react';
import { useBajaNotificaciones } from '../hooks/useBajaNotificaciones';
import { useIdioma } from '../hooks/useIdioma';

// DEJAR DE RECIBIRLOS — BajaNotificaciones.jsx
// Donde cae el enlace del pie de los correos.

const Pantalla = styled.div`
  min-height: 100vh;
  background: var(--marca-50);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
`;

const Tarjeta = styled.div`
  width: 100%;
  max-width: 440px;
  background: var(--papel);
  border: 1px solid var(--linea);
  border-radius: var(--radio-panel);
  box-shadow: var(--sombra-flotante);
  padding: 36px 30px;
  text-align: center;

  @media (max-width: 560px) { padding: 28px 22px; }
`;

const Icono = styled.div`
  width: 58px;
  height: 58px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: var(--marca-100);
  color: var(--marca-texto);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Titulo = styled.h1`
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tinta);
  margin: 0 0 10px;
`;

const Texto = styled.p`
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--tinta-suave);
  margin: 0 0 26px;
`;

const Botones = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Boton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 20px;
  border-radius: var(--radio-tarjeta);
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  border: ${(p) => (p.$primario ? 'none' : '1px solid var(--linea)')};
  background: ${(p) => (p.$primario ? 'var(--marca-600)' : 'var(--papel)')};
  color: ${(p) => (p.$primario ? '#fff' : 'var(--tinta-suave)')};
  transition: background-color var(--dur-press) var(--ease-out),
              border-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { ${(p) => (p.$primario ? 'background: var(--marca-700);' : 'border-color: var(--marca-600); color: var(--marca-texto);')} }
  }
  &:active { transform: scale(0.985); }
`;

const BajaNotificaciones = () => {
  const { estado, mensaje, queSeApago } = useBajaNotificaciones();
  const navigate = useNavigate();
  const { t } = useIdioma();

  return (
    <Pantalla>
      <Tarjeta>
        <Icono>
          {estado === 'aplicando'
            ? <Loader2 size={26} className="animate-spin" />
            : <MailX size={26} strokeWidth={1.9} />}
        </Icono>

        {estado === 'aplicando' && (
          <>
            <Titulo>{t('Un momento')}</Titulo>
            <Texto>{t('Estamos apagando esos correos.')}</Texto>
          </>
        )}

        {estado === 'listo' && (
          <>
            <Titulo>{t('Listo, ya no te escribimos')}</Titulo>
            <Texto>
              {t('Dejarás de recibir {que} por correo. Los avisos de tus pedidos siguen llegando, porque esos no son publicidad.', { que: queSeApago })}
            </Texto>
          </>
        )}

        {estado === 'error' && (
          <>
            <Titulo>{t('No pudimos aplicarlo')}</Titulo>
            <Texto>{mensaje}</Texto>
          </>
        )}

        <Botones>
          <Boton type="button" $primario onClick={() => navigate('/')}>
            <StoreIcon size={16} strokeWidth={2.2} /> {t('Ir a la tienda')}
          </Boton>
          {/* La vuelta atrás, para quien llegó por error o cambió de opinión. Va DESPUÉS de haberlo aplicado
             y no antes: preguntar primero es cobrarle un peaje por irse. */}
          <Boton type="button" onClick={() => navigate('/mi-cuenta/notificaciones')}>
            <Settings size={16} strokeWidth={2.2} /> {t('Volver a encenderlos')}
          </Boton>
        </Botones>
      </Tarjeta>
    </Pantalla>
  );
};

export default BajaNotificaciones;
