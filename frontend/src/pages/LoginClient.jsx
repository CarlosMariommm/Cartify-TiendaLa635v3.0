import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import styled from 'styled-components';
import { Mail, Lock, ArrowRight, Star, Bike, Heart } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { loginClientDB, googleLoginDB } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { BotonOjo } from '../components/UI/CampoContrasena';
import EncabezadoAcceso from '../components/Store/EncabezadoAcceso';
import { EsperaMascota } from '../components/UI/Mascota';
import MascotaColgada from '../components/UI/MascotaColgada';
import { consumirRecienRegistrado } from '../utils/primerIngreso';
import { ICONOS } from '../utils/iconosAviso';
import { useIdioma } from '../hooks/useIdioma';

const BROWN = 'var(--marca-600)';

// INICIAR SESIÓN — LoginClient.jsx
// Se llega aquí solo cuando hace falta una cuenta (al pagar, en Mi Cuenta, para favoritos): a la
// izquierda por qué vale la pena tener cuenta y a la derecha el formulario.

const Container = styled.div`
  min-height: 100vh;
  background: var(--papel);
  display: flex;
  flex-direction: column;
  position: relative;   /* de aquí cuelga la mascota (ver Percha) */
`;

// De dónde cuelga la mascota: la línea de abajo del encabezado (64px). Es parte del FONDO, como
// una ilustración ya pintada: va detrás del contenido (Body tiene z-index 1), así que el cordón
// pasa por detrás del titular y nada de la página se corre para hacerle lugar. No recibe toques.
const Percha = styled.div`
  position: absolute;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 0;
  pointer-events: none;

  > div {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 40px;
    display: grid;
    grid-template-columns: 1fr 460px;
    gap: 40px;
  }
  /* Corrida hacia el hueco entre columnas: el cordón pasa por detrás del final
     del titular y la etiqueta queda fuera del párrafo y de la lista. */
  .mascota-colgada { justify-self: end; margin-right: -26px; height: clamp(320px, 34vw, 430px); width: auto; }

  @media (max-width: 940px) {
    > div { grid-template-columns: 1fr; padding: 0 20px; }
    .mascota-colgada { justify-self: center; margin-right: 0; height: 230px; }
  }
`;

// La barra de arriba vive en EncabezadoAcceso: la comparten todas las pantallas de acceso (login,
// registro, verificación y contraseñas).

const Body = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 460px;
  gap: 40px;
  align-items: center;
  padding: 48px 40px 64px;
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  /* Por delante de la mascota, que es parte del fondo (ver Percha). */
  position: relative;
  z-index: 1;

  /* En pantalla chica el formulario manda y el saludo se va abajo. Arriba queda el aire donde cuelga
     la mascota: ahí el formulario la taparía. */
  @media (max-width: 940px) {
    grid-template-columns: 1fr;
    padding: 250px 20px 48px;
    gap: 28px;
  }
`;

// ── La mitad de la izquierda: quiénes somos ──
const Saludo = styled.div`
  /* El párrafo y la lista no llegan hasta donde cuelga la mascota. En pantalla ancha ya les sobra
     espacio (su máximo es 440px); esto solo actúa cuando la columna se angosta, para que no se le
     encimen. */
  @media (min-width: 941px) {
    > p, > ul { max-width: min(440px, calc(100% - 140px)); }
  }

  @media (max-width: 940px) { order: 2; text-align: center; }
`;

const Titular = styled.h1`
  font-size: clamp(30px, 4.4vw, 46px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -1px;
  color: var(--tinta);
  margin: 0 0 16px;

  strong { color: var(--marca-texto); font-weight: 800; }
`;

const Bajada = styled.p`
  font-size: 15.5px;
  line-height: 1.6;
  color: var(--tinta-suave);
  margin: 0 0 26px;
  max-width: 440px;

  @media (max-width: 940px) { margin-left: auto; margin-right: auto; }
`;

const Ventajas = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 30px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 440px;

  @media (max-width: 940px) { margin-left: auto; margin-right: auto; text-align: left; }
`;

const Ventaja = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 11px;
  font-size: 14px;
  color: var(--tinta-suave);
  line-height: 1.45;

  strong { color: var(--tinta); font-weight: 700; }
`;

const IconoVentaja = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--marca-50);
  color: var(--marca-texto);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SinCuenta = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;

  @media (max-width: 940px) { justify-content: center; }
`;

const SinCuentaTexto = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: var(--tinta);
`;

const BotonRegistro = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: ${BROWN};
  color: #fff;
  text-decoration: none;
  padding: 12px 22px;
  border-radius: 999px;
  font-size: 14.5px;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(0, 48, 73, 0.28);
  transition: background 0.18s, transform 0.18s;

  &:hover { background: var(--marca-700); transform: translateY(-1px); }
`;

// ── La mitad de la derecha: el formulario ──
const Card = styled.div`
  width: 100%;
  background: var(--papel);
  border: 1px solid var(--linea);
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 48, 73, 0.10);
  padding: 32px 30px;

  @media (max-width: 940px) {
    order: 1;
    max-width: 460px;
    margin: 0 auto;
    padding: 26px 22px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 800;
  color: var(--tinta);
  margin: 0 0 6px 0;
  text-align: center;
`;

const SubTitle = styled.p`
  font-size: 13.5px;
  color: var(--tinta-tenue);
  margin: 0 0 24px 0;
  text-align: center;
`;

const FieldGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--tinta);
  margin-bottom: 8px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const IconWrapper = styled.div`
  position: absolute;
  left: 14px;
  color: var(--tinta-tenue);
  pointer-events: none;
  display: flex;
  align-items: center;
  z-index: 1;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px 12px 44px;
  border: 1.5px solid ${({ $error }) => ($error ? 'var(--peligro)' : 'var(--linea-fuerte)')};
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  color: var(--tinta);
  background: var(--papel);
  transition: border-color 0.2s;

  &:focus {
    border-color: ${BROWN};
    box-shadow: 0 0 0 3px rgba(0,48,73,0.08);
  }

  &::placeholder { color: var(--tinta-tenue); }
`;

const ErrorMsg = styled.span`
  color: var(--peligro);
  font-size: 12px;
  display: block;
  margin-top: 5px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const RememberLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tinta-suave);
  cursor: pointer;
`;

const ForgotLink = styled(Link)`
  font-size: 13px;
  color: var(--marca-texto);
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const Button = styled.button`
  width: 100%;
  padding: 13px;
  background: ${BROWN};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
  margin-bottom: 20px;

  &:hover { background: var(--marca-700); }
  &:disabled { background: var(--deshabilitado); cursor: not-allowed; }
`;

// Separador "o" entre el formulario y el botón de Google.
const Divisor = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 18px;
  color: var(--tinta-tenue);
  font-size: 12.5px;
  font-weight: 600;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--papel-gris);
  }
`;

// El botón de Google se centra en su fila.
const GoogleFila = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
`;

const FooterText = styled.div`
  text-align: center;
  font-size: 13px;
  color: var(--tinta-tenue);
`;

const FooterLink = styled(Link)`
  color: var(--marca-texto);
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

// La puerta del personal: más chica y al final, la pantalla es de los clientes.
const PiePersonal = styled(FooterText)`
  margin-top: 12px;
  font-size: 12.5px;
`;

const LoginClient = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, haySesionDePersonal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const { t, idioma } = useIdioma();

  // A dónde iba antes de que le pidiéramos la cuenta. Lo pone ProtectedRoute y los botones que
  // exigen sesión. Ya no se hace logout al entrar aquí: con la tienda abierta, cualquiera puede caer
  // en esta pantalla de curioso, y cerrarle la sesión por pasar sería un castigo por explorar.
  const volver = params.get('volver');

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' }
  });

  // Lo que la mascota colgada necesita saber del formulario: en qué campo está la persona (para
  // mirar el correo o taparse los ojos en la contraseña), cuánto lleva escrito del correo (para
  // seguirlo con la vista) y si algo acaba de fallar (para negar con la cabeza).
  const [campo, setCampo] = useState(null);
  const correo = useWatch({ control, name: 'email' }) || '';
  // Cuenta los fallos; mientras no sea cero, la mascota niega. Se apaga sola.
  const [noCuadro, setNoCuadro] = useState(0);
  const negar = () => setNoCuadro((n) => n + 1);
  useEffect(() => {
    if (!noCuadro) return undefined;
    const reloj = setTimeout(() => setNoCuadro(0), 1300);
    return () => clearTimeout(reloj);
  }, [noCuadro]);

  const miradaMascota = campo === 'email' ? 'correo'
    : campo === 'password' ? (verPass ? 'espia' : 'tapada')
    : 'formulario';
  const estadoMascota = loading ? 'entrando' : noCuadro ? 'error' : 'reposo';

  // "¿Trabajas en la tienda?": la puerta del personal es la del panel, con su código de dos pasos.
  // Si ya tiene la sesión del panel abierta, directo adentro: /admin cierra la sesión al entrar y le
  // haría pedir otro código.
  const puertaDelPersonal = haySesionDePersonal ? '/dashboard' : '/admin';

  // Alguien del personal escribió su cuenta AQUÍ, en el login de la tienda. El servidor ya no le
  // abre sesión por esta puerta (se saltaba el código del panel), pero tampoco le dice "contraseña
  // incorrecta", que sería mentira: contesta `esPersonal`.
  const irAlPanel = (correo) => {
    toast(t('Tu cuenta es del personal: entra por aquí, con tu código.'), {
      id: 'a-su-puerta',
      icon: ICONOS.atencion,
      duration: 5000,
    });
    navigate('/admin', { state: { correo } });
  };

  // Lo que pasa DESPUÉS de que el backend confirmó la sesión, sea por contraseña o por Google: se
  // guarda en el contexto y se decide a dónde ir. Se comparte para que las dos puertas se comporten
  // igual.
  const alEntrar = (res, correo) => {
      // Un servidor sin actualizar todavía abre sesión del personal por aquí. No se guarda: la tienda es
      // de clientes y el personal tiene su puerta.
      if (res.userType && res.userType !== 'client') {
        irAlPanel(correo);
        return;
      }

      // 3- Guardamos el token y datos del cliente en el contexto
      login(res.token, 'client', res.client);

      // El saludo con el mapa es SOLO para quien acaba de crear su cuenta. La marca la deja el registro
      // al verificar el código; ver utils/primerIngreso.js. Se consume acá aunque después mande a otro
      // lado, para que no quede dando vueltas y aparezca días más tarde sin venir a cuento.
      const recienRegistrado = consumirRecienRegistrado();

      // Primero manda a dónde iba; si llegó aquí por su cuenta, al recién llegado lo espera el mapa
      // donde deja su dirección, y a todos los demás la tienda. El `volver` se revisa antes de seguirlo:
      // tiene que ser una ruta de la casa.
      const destino = volver?.startsWith('/') ? volver : null;

      // `replace` a propósito: el login se reemplaza en el historial en vez de apilarse. Sin esto, tras
      // entrar el historial quedaba [tienda, login, destino] y el "atrás" del navegador caía de vuelta
      // en el login —una pantalla que ya cumplió y a la que nadie quiere volver.
      if (destino) navigate(destino, { replace: true });
      else navigate(recienRegistrado ? '/bienvenida' : '/', { replace: true });
  };

  // 2- Enviar credenciales al backend de clientes (SELECT y VERIFY)
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await loginClientDB({ email: data.email, password: data.password });
      alEntrar(res, data.email);
    } catch (err) {
      if (err.esPersonal) {
        irAlPanel(data.email);
        return;
      }
      negar();
      toast.error(t(err.message || 'Credenciales inválidas'));
    } finally {
      setLoading(false);
    }
  };

  // Inicio de sesión con Google. El botón nos entrega el ID token; lo mandamos
  // al backend y, si todo cuadra, seguimos el mismo camino que el login normal.
  const onGoogle = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      toast.error(t('No se recibió la respuesta de Google'));
      return;
    }
    try {
      setLoading(true);
      const res = await googleLoginDB(credential);
      alEntrar(res);
    } catch (err) {
      // Esta pantalla es para ENTRAR, no para registrarse. Si Google trae un correo que no tiene cuenta,
      // el servidor se niega a crearla aquí: no hay dónde aceptar los términos ni dónde dejar un
      // teléfono, y una cuenta creada a la callada es justo lo que rompía el consentimiento.
      if (err.requiereConsentimiento) {
        // Y se va CON lo que Google ya dio. El token viaja en el estado de la navegación y no en la URL:
        // un token de Google en la barra de direcciones queda en el historial, en los registros del
        // servidor y en cualquier captura de pantalla.
        navigate('/completar-registro', {
          state: { credential, sugerido: err.sugerido || {}, volverA: volver || '/' },
        });
        return;
      }
      toast.error(t(err.message || 'No se pudo iniciar sesión con Google'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <EncabezadoAcceso />

      {/* La mascota colgando de la línea del encabezado, pendiente del formulario. */}
      <Percha>
        <div>
          <MascotaColgada
            mirada={miradaMascota}
            progreso={Math.min(correo.length / 28, 1)}
            estado={estadoMascota}
          />
        </div>
      </Percha>

      <Body>
        {/* La mitad de la izquierda no está de adorno: quien llegó hasta aquí merece saber qué gana con la
           cuenta antes de escribir su correo. */}
        <Saludo>
          <Titular>
            {t('El súper de la esquina,')} <strong>{t('a un toque')}</strong>
          </Titular>
          <Bajada>
            {t('Con tu cuenta guardamos tu dirección, tus puntos y lo que sueles llevar, para que pedir la próxima vez te tome menos que hacer la lista.')}
          </Bajada>

          <Ventajas>
            <Ventaja>
              <IconoVentaja><Bike size={16} strokeWidth={2.2} /></IconoVentaja>
              <span><strong>{t('Sigue tu pedido en el mapa.')}</strong> {t('Mira al repartidor acercarse y sabrás cuándo salir a la puerta.')}</span>
            </Ventaja>
            <Ventaja>
              <IconoVentaja><Star size={16} strokeWidth={2.2} /></IconoVentaja>
              <span><strong>{t('Junte puntos con cada compra.')}</strong> {t('Se convierten en descuento la próxima vez.')}</span>
            </Ventaja>
            <Ventaja>
              <IconoVentaja><Heart size={16} strokeWidth={2.2} /></IconoVentaja>
              <span><strong>{t('Guarda tus favoritos.')}</strong> {t('Lo de siempre, sin volver a buscarlo.')}</span>
            </Ventaja>
          </Ventajas>

          <SinCuenta>
            <SinCuentaTexto>{t('¿No tienes cuenta?')}</SinCuentaTexto>
            <BotonRegistro to="/register">
              {t('Regístrate aquí')} <ArrowRight size={16} strokeWidth={2.4} />
            </BotonRegistro>
          </SinCuenta>
        </Saludo>

        <Card>
          <SectionTitle>{t('Inicia sesión para comprar')}</SectionTitle>
          <SubTitle>{t('Puedes seguir viendo la tienda sin cuenta.')}</SubTitle>

          <form
            onSubmit={handleSubmit(onSubmit, negar)}
            onFocus={(e) => setCampo(e.target.name || e.target.closest('[data-campo]')?.dataset.campo || null)}
            onBlur={() => setCampo(null)}
          >

            <FieldGroup>
              <Label htmlFor="campo-email">{t('Correo Electrónico')}</Label>
              <InputWrapper>
                <IconWrapper><Mail size={18} /></IconWrapper>
                <Input
                  type="email"
                  placeholder={t('juan@ejemplo.com')}
                  $error={!!errors.email}
                  id="campo-email"
                  {...register('email', {
                    required: 'El correo es requerido',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Formato inválido' }
                  })}
                />
              </InputWrapper>
              {errors.email && <ErrorMsg>{t(errors.email.message)}</ErrorMsg>}
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="campo-password">{t('Contraseña')}</Label>
              {/* data-campo: el botón del ojo también cuenta como "en la contraseña". */}
              <InputWrapper data-campo="password">
                <IconWrapper><Lock size={18} /></IconWrapper>
                <Input
                  type={verPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                  $error={!!errors.password}
                  id="campo-password"
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                  })}
                />
                <BotonOjo visible={verPass} onToggle={() => setVerPass((v) => !v)} />
              </InputWrapper>
              {errors.password && <ErrorMsg>{t(errors.password.message)}</ErrorMsg>}
            </FieldGroup>

            <Row>
              <RememberLabel>
                <input type="checkbox" {...register('rememberMe')} />
                {t('Recordarme 30 días')}
              </RememberLabel>
              <ForgotLink to="/forgot-password">{t('¿Olvidaste tu contraseña?')}</ForgotLink>
            </Row>

            <Button type="submit" disabled={loading}>
              {loading ? <><EsperaMascota sobre="color" /> {t('Entrando…')}</> : t('Iniciar sesión')}
            </Button>

          </form>

          <Divisor>{t('o')}</Divisor>

          <GoogleFila>
            <GoogleLogin
              onSuccess={onGoogle}
              onError={() => toast.error(t('No se pudo iniciar sesión con Google'))}
              text="continue_with"
              shape="pill"
              locale={idioma}
              width="320"
            />
          </GoogleFila>

          <FooterText>
            {t('¿No tienes una cuenta?')}{' '}
            <FooterLink to="/register">{t('Regístrate')}</FooterLink>
          </FooterText>

          {/* La puerta del personal, igual que en la app. Aquí no abre Tiqui ni el Reparto (esos viven en la
             app): lleva al login del panel. */}
          <PiePersonal>
            {t('¿Trabajas en la tienda?')}{' '}
            <FooterLink to={puertaDelPersonal}>{t('Entra aquí')}</FooterLink>
          </PiePersonal>
        </Card>
      </Body>
    </Container>
  );
};

export default LoginClient;
