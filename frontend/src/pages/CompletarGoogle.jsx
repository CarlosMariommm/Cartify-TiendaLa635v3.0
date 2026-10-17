import styled from 'styled-components';
import { Navigate } from 'react-router-dom';
import { Phone, Calendar, IdCard, Loader2, ArrowRight } from 'lucide-react';
import ModalTerminos from '../components/Store/ModalTerminos';
import { useModalTerminos } from '../hooks/useModalTerminos';
import { useCompletarGoogle } from '../hooks/useCompletarGoogle';
import { useIdioma } from '../hooks/useIdioma';

// TERMINAR DE ENTRAR CON GOOGLE — CompletarGoogle.jsx
// El último paso de quien entra por primera vez con Google.

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
  max-width: 480px;
  background: var(--papel);
  border: 1px solid var(--linea);
  border-radius: var(--radio-panel);
  box-shadow: var(--sombra-flotante);
  padding: 32px 30px;

  @media (max-width: 560px) { padding: 24px 20px; }
`;

const Titulo = styled.h1`
  font-size: 23px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tinta);
  margin: 0 0 6px;
  text-align: center;
`;

const Bajada = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: var(--tinta-suave);
  margin: 0 0 24px;
  text-align: center;
`;

// Lo que Google confirmó. Se enseña y no se pide: repetirle el correo a quien acaba de autorizarlo
// es desconfiar de la puerta por la que entró.
const Identidad = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 22px;
  background: var(--marca-50);
  border: 1px solid var(--linea);
  border-radius: var(--radio-tarjeta);
`;

const Foto = styled.img`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const SinFoto = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--marca-100);
  color: var(--marca-texto);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
`;

const Datos = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: 14.5px;
    font-weight: 700;
    color: var(--tinta);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    display: block;
    font-size: 13px;
    color: var(--tinta-suave);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Campo = styled.div`
  margin-bottom: 16px;
`;

const Etiqueta = styled.label`
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--tinta);
  margin-bottom: 7px;

  small {
    font-weight: 500;
    color: var(--tinta-tenue);
  }
`;

const Marco = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 13px;
    color: var(--tinta-tenue);
    pointer-events: none;
  }
`;

const Entrada = styled.input`
  width: 100%;
  padding: 12px 14px 12px 42px;
  border: 1.5px solid ${(p) => (p.$error ? 'var(--alerta)' : 'var(--linea)')};
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  color: var(--tinta);
  background: var(--papel);
  outline: none;
  transition: border-color var(--dur-press) var(--ease-out),
              box-shadow var(--dur-press) var(--ease-out);

  &:focus {
    border-color: var(--marca-600);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--marca-600) 12%, transparent);
  }
  &::placeholder { color: var(--tinta-tenue); }
`;

/* La pista de por qué se pide cada cosa. Un dato que se explica se entrega. */
const Porque = styled.p`
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--tinta-tenue);
  margin: 6px 0 0;
`;

const Error = styled.span`
  display: block;
  font-size: 12.5px;
  color: var(--alerta);
  margin-top: 5px;
`;

const BloqueConsentimiento = styled.div`
  margin: 22px 0 20px;
  padding-top: 20px;
  border-top: 1px solid var(--linea);
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Casilla = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--tinta);

  input {
    margin-top: 2px;
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    accent-color: var(--marca-600);
    cursor: pointer;
  }
  label { cursor: pointer; }
`;

const EnlaceTerminos = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--marca-texto);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
`;

const Aclaracion = styled.span`
  display: block;
  font-size: 12.5px;
  color: var(--tinta-tenue);
  margin-top: 2px;
`;

const Boton = styled.button`
  width: 100%;
  padding: 14px;
  background: var(--marca-600);
  color: #fff;
  border: none;
  border-radius: var(--radio-tarjeta);
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  transition: background-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) { background: var(--marca-700); }
  }
  &:active:not(:disabled) { transform: scale(0.985); }
  &:disabled {
    background: var(--banda);
    color: var(--tinta-tenue);
    cursor: not-allowed;
  }
`;

const Cancelar = styled.button`
  width: 100%;
  margin-top: 12px;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--tinta-suave);
  cursor: pointer;

  &:hover { text-decoration: underline; }
`;

const CompletarGoogle = () => {
  const {
    hayToken, sugerido, register, errors, cargando,
    aceptoTerminos, onSubmit, cancelar,
  } = useCompletarGoogle();

  const { abierto, abrir: abrirTerminos, cerrar: cerrarTerminos, clave: documentoAbierto } = useModalTerminos();
  const { t } = useIdioma();

  // Sin token no hay nada que completar. Pasa si alguien recarga la página o pega la dirección a
  // mano: el token vive en el estado de la navegación, no en la URL, y una recarga lo borra. Se
  // devuelve al login en vez de enseñar un formulario que no podría enviarse.
  if (!hayToken) return <Navigate to="/iniciar-sesion" replace />;

  const inicial = (sugerido.fullName || sugerido.email || '?').trim().charAt(0).toUpperCase();

  return (
    <Pantalla>
      <Tarjeta>
        <Titulo>{t('Ya casi')}</Titulo>
        <Bajada>
          {t('Google nos confirmó quién eres. Nos falta lo que Google no sabe.')}
        </Bajada>

        <Identidad>
          {sugerido.image
            ? <Foto src={sugerido.image} alt="" referrerPolicy="no-referrer" />
            : <SinFoto>{inicial}</SinFoto>}
          <Datos>
            <strong>{sugerido.fullName || t('Tu cuenta')}</strong>
            <span>{sugerido.email}</span>
          </Datos>
        </Identidad>

        <form onSubmit={onSubmit} noValidate>
          <Campo>
            <Etiqueta htmlFor="phoneNumber">{t('Teléfono')}</Etiqueta>
            <Marco>
              <Phone size={17} strokeWidth={2} />
              <Entrada
                id="phoneNumber"
                type="tel"
                inputMode="tel"
                placeholder="7777-7777"
                $error={!!errors.phoneNumber}
                {...register('phoneNumber', {
                  required: 'Necesitamos tu teléfono para poder entregarte',
                  pattern: {
                    value: /^[0-9\s-]{8,}$/,
                    message: 'Escribe un teléfono válido, con sus ocho dígitos',
                  },
                })}
              />
            </Marco>
            <Porque>{t('Solo para llamarte si quien lleva tu pedido no encuentra la casa.')}</Porque>
            {errors.phoneNumber && <Error>{t(errors.phoneNumber.message)}</Error>}
          </Campo>

          <Campo>
            <Etiqueta htmlFor="fechaNacimiento">
              {t('Fecha de nacimiento')} <small>· {t('opcional')}</small>
            </Etiqueta>
            <Marco>
              <Calendar size={17} strokeWidth={2} />
              <Entrada id="fechaNacimiento" type="date" {...register('fechaNacimiento')} />
            </Marco>
            <Porque>
              {t('Sin ella la tienda funciona igual, pero los productos para mayores de 18 quedan tapados.')}
            </Porque>
          </Campo>

          <Campo>
            <Etiqueta htmlFor="dui">
              DUI <small>· {t('opcional')}</small>
            </Etiqueta>
            <Marco>
              <IdCard size={17} strokeWidth={2} />
              <Entrada id="dui" type="text" placeholder="00000000-0" {...register('dui')} />
            </Marco>
            <Porque>{t('Puedes dejarlo en blanco: tu cuenta funciona igual.')}</Porque>
          </Campo>

          <BloqueConsentimiento>
            {/* Entrar con Google prueba quién es, no que haya aceptado nada. Sin esta casilla el servidor NO
               crea la cuenta — no es una cortesía del formulario, es la condición. Ver googleAuthClient. */}
            <Casilla>
              <input
                type="checkbox"
                id="aceptaTerminos"
                aria-label={t('He leído y acepto los términos y condiciones y la política de privacidad')}
                {...register('aceptaTerminos', { required: true })}
              />
              <div>
                <label htmlFor="aceptaTerminos">{t('He leído y acepto los')} </label>
                <EnlaceTerminos type="button" onClick={(e) => abrirTerminos(e, 'terminos')}>
                    {t('términos y condiciones')}
                  </EnlaceTerminos>
                  {` ${t('y la')} `}
                  <EnlaceTerminos type="button" onClick={(e) => abrirTerminos(e, 'privacidad')}>
                    {t('política de privacidad')}
                  </EnlaceTerminos>
                  .
              </div>
            </Casilla>

            {/* Desmarcada, y sin `required`. Es opcional de verdad: la cuenta se crea igual sin tocarla y no se
               pierde nada de la tienda por no querer publicidad. */}
            <Casilla>
              <input type="checkbox" id="promociones" {...register('promociones')} />
              <label htmlFor="promociones">
                {t('Quiero recibir promociones y novedades por correo.')}
                <Aclaracion>
                  {t('Opcional. Puedes apagarlo cuando quieras desde Mi Cuenta.')}
                </Aclaracion>
              </label>
            </Casilla>
          </BloqueConsentimiento>

          {/* El botón se apaga hasta que acepte. Es más honesto que dejarlo encendido y contestar con un
             error rojo después de hacerle llenar todo: la condición se ve desde el principio. */}
          <Boton type="submit" disabled={cargando || !aceptoTerminos}>
            {cargando
              ? <Loader2 size={18} className="animate-spin" />
              : <>{t('Crear mi cuenta')} <ArrowRight size={17} strokeWidth={2.4} /></>}
          </Boton>
        </form>

        <Cancelar type="button" onClick={cancelar}>
          {t('Mejor no, volver a iniciar sesión')}
        </Cancelar>
      </Tarjeta>

      <ModalTerminos abierto={abierto} onCerrar={cerrarTerminos} clave={documentoAbierto} />
    </Pantalla>
  );
};

export default CompletarGoogle;
