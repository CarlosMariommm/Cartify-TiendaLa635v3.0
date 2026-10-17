import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import EncabezadoAcceso from '../components/Store/EncabezadoAcceso';
import { Mail, Phone, User, Hash, Lock, Calendar } from 'lucide-react';
import { EsperaMascota } from '../components/UI/Mascota';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { BotonOjo } from '../components/UI/CampoContrasena';
import SubidorArchivo from '../components/UI/SubidorArchivo';
import ModalTerminos from '../components/Store/ModalTerminos';
import { reglaDuiOpcional, reglaTelefono, bloquearNoDigitos } from '../utils/validaciones';
import { calcularEdad, esMayorDeEdad } from '../utils/edad';
import { formatearDui, formatearTelefono, LARGO_DUI, LARGO_TELEFONO } from '../utils/mascaras';
import { useRegistro } from '../hooks/useRegistro';
import { useModalTerminos } from '../hooks/useModalTerminos';
import { googleLoginDB } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { useIdioma } from '../hooks/useIdioma';

const BROWN = 'var(--marca-600)';
const BROWN_HOVER = 'var(--marca-700)';

const Container = styled.div`
  min-height: 100vh;
  background: var(--papel);
  display: flex;
  flex-direction: column;
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 500px;
`;

const SectionTitle = styled.h2`
  font-size: 26px;
  font-weight: 700;
  color: var(--tinta);
  margin: 0 0 20px 0;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--tinta);
  margin-bottom: 6px;
`;

const InputContainer = styled.div`
  margin-bottom: 16px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const IconWrapper = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--tinta-tenue);
  pointer-events: none;
  display: flex;
  align-items: center;
  z-index: 1;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px 12px 44px;
  border: 1.5px solid var(--linea-fuerte);
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  color: var(--tinta);
  transition: border-color 0.2s;
  background: var(--papel);

  &:focus {
    border-color: ${BROWN};
    box-shadow: 0 0 0 3px rgba(0,48,73,0.08);
  }

  &::placeholder {
    color: var(--tinta-tenue);
  }
`;

// Espacio para que el subidor no quede pegado al botón de continuar.
const BloqueFoto = styled.div`
  margin-bottom: 16px;
`;

const ErrorMsg = styled.span`
  color: var(--peligro);
  font-size: 12px;
  position: absolute;
  bottom: -18px;
  left: 0;
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
  margin-top: 10px;

  &:hover {
    background: ${BROWN_HOVER};
  }
  
  &:disabled {
    background: var(--deshabilitado);
    cursor: not-allowed;
  }
`;

const Divisor = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
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

const GoogleFila = styled.div`
  display: flex;
  justify-content: center;
`;

const FooterText = styled.div`
  text-align: center;
  margin-top: 18px;
  font-size: 13px;
  color: var(--tinta-tenue);
`;

// Botón con cara de enlace: el span de antes no se alcanzaba con Tab.
const FooterLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--marca-texto);
  font-weight: 600;
  cursor: pointer;
  &:hover { text-decoration: underline; }
`;

// El bloque del consentimiento. Va justo antes del botón y no perdido entre los campos: es lo
// último que se lee antes de decidir, que es donde tiene que estar.
const BloqueConsentimiento = styled.div`
  margin: 24px 0 4px;
  padding: 16px 18px;
  background: var(--papel-suave);
  border: 1px solid var(--linea);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Casilla = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 11px;

  input {
    width: 18px;
    height: 18px;
    margin: 1px 0 0;
    flex-shrink: 0;
    accent-color: ${BROWN};
    cursor: pointer;
  }

  label {
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--tinta-suave);
    cursor: pointer;
  }
`;

// El enlace a los términos, que es un BOTÓN y no un <a>. No navega: abre el documento encima (ver
// useModalTerminos). Se pinta como enlace porque eso es lo que la persona espera tocar ahí, pero
// por dentro no puede ser un enlace de verdad — el formulario lleno no se puede arriesgar.
const EnlaceTerminos = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: var(--marca-texto);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;

  &:hover { color: var(--marca-texto-fuerte); }
`;

// El renglón de la casilla de términos. Existe porque ahí el texto y el enlace
// son dos elementos separados y tienen que fluir como una sola frase.
const TextoCasilla = styled.div`
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--tinta-suave);
`;

// La segunda línea de la casilla de promociones: qué significa decir que sí,
// en letra chica pero presente. "Puede cambiarlo cuando quiera" no es un
// adorno, es la mitad de la razón por la que alguien se anima a marcarla.
const Aclaracion = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--tinta-tenue);
`;

// El error de la casilla no puede ser el ErrorMsg de los campos: aquel va
// posicionado en absoluto dentro del InputWrapper y aquí no hay ninguno.
const ErrorCasilla = styled.span`
  display: block;
  margin: -6px 0 0 29px;
  color: var(--peligro);
  font-size: 12px;
`;

const Register = () => {
  const navigate = useNavigate();
  const [verPass, setVerPass] = useState(false);
  const { t, idioma } = useIdioma();

  // Armar el envío, subir la foto y llevar a la verificación: todo eso vive en
  // el hook. Aquí solo se pinta el formulario. Ver useRegistro.
  const { cargando, elegirArchivo, registrar } = useRegistro();

  // Los términos se leen ENCIMA del formulario, sin navegar. Ver useModalTerminos.
  const { abierto: terminosAbiertos, abrir: abrirTerminos, cerrar: cerrarTerminos, clave: documentoAbierto } =
    useModalTerminos();

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const { login } = useAuth();
  const [entrandoGoogle, setEntrandoGoogle] = useState(false);

  // Registrarse con Google. No pasa por el flujo de verificación por código: el correo ya viene
  // confirmado por Google, así que la cuenta queda lista y se entra directo a la tienda. Si el
  // correo ya existía, simplemente inicia esa sesión (el backend lo enlaza).
  const onGoogle = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      toast.error(t('No se recibió la respuesta de Google'));
      return;
    }
    // El consentimiento viaja TAMBIÉN por el camino de Google. Se revisa aquí antes de molestar al
    // servidor, y el servidor lo vuelve a exigir por su cuenta: la casilla del navegador no le prueba
    // nada a nadie.
    if (!watch('aceptaTerminos')) {
      toast.error(t('Marca primero que aceptas los términos y la política de privacidad'));
      return;
    }

    try {
      setEntrandoGoogle(true);
      const res = await googleLoginDB(credential, {
        aceptaTerminos: true,
        promociones: !!watch('promociones'),
        // Google no da teléfono. Si ya lo escribió arriba, se aprovecha; sin
        // él la cuenta queda sin a quién llamar cuando no encuentren la casa.
        phoneNumber: watch('phoneNumber') || '',
      });
      login(res.token, res.userType || 'client', res.client);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(t(err.message || 'No se pudo registrar con Google'));
    } finally {
      setEntrandoGoogle(false);
    }
  };

  // El DUI solo se pide cuando la fecha de nacimiento ya dice que es mayor: en
  // El Salvador el DUI se emite a los 18, así que antes no hay ninguno que dar.
  const puedeDui = esMayorDeEdad(watch('fechaNacimiento'));

  return (
    <Container>
      {/* La misma barra que el login. Ver EncabezadoAcceso. */}
      <EncabezadoAcceso />

      <Body>
        <Card>
          <SectionTitle>{t('Regístrate')}</SectionTitle>

          <form onSubmit={handleSubmit(registrar)}>
            
            <InputContainer>
              <Label htmlFor="campo-fullName">{t('Nombre Completo')}</Label>
              <InputWrapper>
                <IconWrapper><User size={18} /></IconWrapper>
                <Input
                  type="text"
                  placeholder={t('Juan Pérez')}
                  id="campo-fullName"
                  {...register("fullName", { required: "El nombre es obligatorio" })}
                />
                {errors.fullName && <ErrorMsg>{t(errors.fullName.message)}</ErrorMsg>}
              </InputWrapper>
            </InputContainer>

            <InputContainer>
              <Label htmlFor="campo-userName">{t('Nombre de Usuario')}</Label>
              <InputWrapper>
                <IconWrapper><User size={18} /></IconWrapper>
                <Input
                  type="text"
                  placeholder={t('juanperez99')}
                  id="campo-userName"
                  {...register("userName", { required: "El nombre de usuario es obligatorio" })}
                />
                {errors.userName && <ErrorMsg>{t(errors.userName.message)}</ErrorMsg>}
              </InputWrapper>
            </InputContainer>

            {/* Fecha de nacimiento: para calcular la edad de los productos +18. Es obligatoria, pero NO bloquea
               a los menores de tener cuenta — pueden comprar lo demás; solo no verán los productos
               restringidos. Va ANTES que el DUI porque es la que decide si el DUI se pide. */}
            <InputContainer>
              <Label htmlFor="campo-fechaNacimiento">{t('Fecha de nacimiento')}</Label>
              <InputWrapper>
                <IconWrapper><Calendar size={18} /></IconWrapper>
                <Input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  id="campo-fechaNacimiento"
                  {...register("fechaNacimiento", {
                    required: "La fecha de nacimiento es obligatoria",
                    validate: (v) => {
                      const edad = calcularEdad(v);
                      if (edad == null) return "Esa fecha no es válida";
                      if (edad < 0 || edad > 120) return "Revisa la fecha";
                      return true;
                    },
                  })}
                />
                {errors.fechaNacimiento && <ErrorMsg>{t(errors.fechaNacimiento.message)}</ErrorMsg>}
              </InputWrapper>
            </InputContainer>

            {/* El DUI solo aparece cuando la fecha ya dice que es mayor de edad: es opcional, y a un menor no
               tendría por qué pedírsele. Se revisa solo si escribió algo (ver reglaDuiOpcional). */}
            {puedeDui && (
              <InputContainer>
                <Label htmlFor="campo-dui">{t('DUI (opcional)')}</Label>
                <InputWrapper>
                  <IconWrapper><Hash size={18} /></IconWrapper>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={LARGO_DUI}
                    placeholder="00000000-0"
                    id="campo-dui"
                    {...register("dui", reglaDuiOpcional)}
                    onKeyDown={bloquearNoDigitos}
                    // El guion se pone solo: si cada quien lo escribe a su manera,
                    // el mismo DUI termina guardado de tres formas distintas.
                    onInput={(e) => { e.target.value = formatearDui(e.target.value); }}
                  />
                  {errors.dui && <ErrorMsg>{t(errors.dui.message)}</ErrorMsg>}
                </InputWrapper>
              </InputContainer>
            )}

            <InputContainer>
              <Label htmlFor="campo-phoneNumber">{t('Teléfono')}</Label>
              <InputWrapper>
                <IconWrapper><Phone size={18} /></IconWrapper>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={LARGO_TELEFONO}
                  placeholder="7000-0000"
                  id="campo-phoneNumber"
                  {...register("phoneNumber", reglaTelefono)}
                  onKeyDown={bloquearNoDigitos}
                  onInput={(e) => { e.target.value = formatearTelefono(e.target.value); }}
                />
                {errors.phoneNumber && <ErrorMsg>{t(errors.phoneNumber.message)}</ErrorMsg>}
              </InputWrapper>
            </InputContainer>

            {/* Aquí había un campo de "Dirección" en texto plano. Se quitó: lo que escribía la persona se
               guardaba aparte y NUNCA se usaba para entregar nada. */}

            <InputContainer>
              <Label htmlFor="campo-email">{t('Correo Electrónico')}</Label>
              <InputWrapper>
                <IconWrapper><Mail size={18} /></IconWrapper>
                <Input
                  type="email"
                  placeholder={t('juan@ejemplo.com')}
                  id="campo-email"
                  {...register("email", { 
                    required: "El correo es obligatorio",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Formato de correo inválido"
                    }
                  })}
                />
                {errors.email && <ErrorMsg>{t(errors.email.message)}</ErrorMsg>}
              </InputWrapper>
            </InputContainer>

            <InputContainer>
              <Label htmlFor="campo-password">{t('Contraseña')}</Label>
              <InputWrapper>
                <IconWrapper><Lock size={18} /></IconWrapper>
                <Input
                  type={verPass ? 'text' : 'password'}
                  placeholder="********"
                  style={{ paddingRight: 44 }}
                  id="campo-password"
                  {...register("password", {
                    required: "La contraseña es obligatoria",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" }
                  })}
                />
                <BotonOjo visible={verPass} onToggle={() => setVerPass((v) => !v)} />
                {errors.password && <ErrorMsg>{t(errors.password.message)}</ErrorMsg>}
              </InputWrapper>
            </InputContainer>

            <Label>{t('Foto de Perfil (Opcional)')}</Label>
            <BloqueFoto>
              {/* Recorte "cover": es una foto de perfil, se ve como se verá después. */}
              <SubidorArchivo
                accept="image/*"
                maxMB={8}
                onArchivo={elegirArchivo}
                ajuste="cover"
                alto={140}
                altoPreview={180}
                radio={8}
                titulo={t('Arrastra tu foto o haz clic para elegirla')}
                ayuda={t('JPG o PNG, hasta 8 MB')}
                etiquetaAria={t('Subir foto de perfil')}
              />
            </BloqueFoto>

            <BloqueConsentimiento>
              <Casilla>
                <input
                  type="checkbox"
                  id="aceptaTerminos"
                  // El nombre completo para quien no ve la pantalla. La etiqueta visible se corta en "los" porque la
                  // frase sigue en el botón, y un lector de pantalla anunciaría "acepto los" a secas — una casilla
                  // que no dice qué se está aceptando.
                  aria-label={t('He leído y acepto los términos y condiciones y la política de privacidad')}
                  {...register('aceptaTerminos', {
                    required: 'Hay que aceptar los términos para crear la cuenta',
                  })}
                />
                <TextoCasilla>
                  <label htmlFor="aceptaTerminos">{t('He leído y acepto los')} </label>
                  <EnlaceTerminos type="button" onClick={(e) => abrirTerminos(e, 'terminos')}>
                    {t('términos y condiciones')}
                  </EnlaceTerminos>
                  {` ${t('y la')} `}
                  <EnlaceTerminos type="button" onClick={(e) => abrirTerminos(e, 'privacidad')}>
                    {t('política de privacidad')}
                  </EnlaceTerminos>
                  .
                </TextoCasilla>
              </Casilla>
              {errors.aceptaTerminos && (
                <ErrorCasilla>{t(errors.aceptaTerminos.message)}</ErrorCasilla>
              )}

              {/* Desmarcada por defecto y sin `required`. Es opcional de verdad: se puede crear la cuenta sin
                 tocarla, y no se pierde nada de la tienda por no querer publicidad. */}
              <Casilla>
                <input type="checkbox" id="promociones" {...register('promociones')} />
                <label htmlFor="promociones">
                  {t('Quiero recibir promociones y novedades por correo.')}
                  <Aclaracion>
                    {t('Opcional. Puedes desactivarlo cuando quieras desde Mi cuenta.')}
                  </Aclaracion>
                </label>
              </Casilla>
            </BloqueConsentimiento>

            <Button type="submit" disabled={cargando}>
              {cargando ? <><EsperaMascota sobre="color" /> {t('Un momento…')}</> : t('Continuar')}
            </Button>

          </form>

          <Divisor>{t('o')}</Divisor>

          <GoogleFila>
            {entrandoGoogle ? (
              <EsperaMascota alto={30} />
            ) : (
              <GoogleLogin
                onSuccess={onGoogle}
                onError={() => toast.error(t('No se pudo registrar con Google'))}
                text="signup_with"
                shape="pill"
                locale={idioma}
                width="320"
              />
            )}
          </GoogleFila>

          <FooterText>
            {t('¿Ya tienes una cuenta?')}{' '}
            <FooterLink type="button" onClick={() => navigate('/iniciar-sesion')}>{t('Iniciar sesión')}</FooterLink>
          </FooterText>
        </Card>
      </Body>

      <ModalTerminos abierto={terminosAbiertos} onCerrar={cerrarTerminos} clave={documentoAbierto} />
    </Container>
  );
};

export default Register;