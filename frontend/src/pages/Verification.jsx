import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginStep2 } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import styled from 'styled-components';
import EncabezadoAcceso from '../components/Store/EncabezadoAcceso';
import toast from 'react-hot-toast';
import api from '../api/api';
import { marcarRecienRegistrado } from '../utils/primerIngreso';
import { useIdioma } from '../hooks/useIdioma';
import { traducir } from '../utils/idioma';

const BROWN = 'var(--marca-600)';

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

const BackButton = styled.button`
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--tinta);
  margin-bottom: 20px;
  padding: 0;
  display: block;

  &:hover {
    color: var(--marca-texto);
  }
`;

const SectionTitle = styled.h2`
  font-size: 26px;
  font-weight: 700;
  color: var(--tinta);
  margin: 0 0 16px 0;
`;

const InfoBox = styled.div`
  background: var(--papel-suave);
  border: 1px solid var(--linea);
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 24px;
`;

const InfoText = styled.p`
  font-size: 13px;
  color: var(--tinta-tenue);
  margin: 0 0 4px 0;
  line-height: 1.5;
`;

const CodeContainer = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  margin-top: 8px;
`;

const CodeInput = styled.input`
  width: 48px;
  height: 54px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  border: 1.5px solid var(--linea-fuerte);
  border-radius: 8px;
  outline: none;
  color: var(--tinta);
  transition: border-color 0.2s;
  text-transform: uppercase;

  &:focus {
    border-color: ${BROWN};
  }
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
  margin-bottom: 16px;
  transition: background 0.2s;

  &:hover {
    background: var(--marca-700);
  }
  
  &:disabled {
    background: var(--deshabilitado);
    cursor: not-allowed;
  }
`;

const ResendRow = styled.div`
  font-size: 13px;
  color: var(--tinta-tenue);
`;

// Botón con cara de enlace: el span de antes no se alcanzaba con Tab.
const ResendLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--marca-texto);
  font-weight: 600;
  cursor: pointer;
  &:hover { text-decoration: underline; }
`;

const ErrorMsg = styled.div`
  color: var(--peligro);
  font-size: 13px;
  margin-bottom: 12px;
`;

const Verification = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Dependiendo del flujo, necesitamos 4 (2FA empleado) o 6 (registro/recuperación hex) dígitos
  const flow = localStorage.getItem('verificationFlow') || '2fa'; 
  const codeLength = flow === '2fa' ? 4 : 6;
  
  const [code, setCode] = useState(Array(codeLength).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // El código de dos pasos del personal sigue en español, como todo el panel.
  const { t: tTienda } = useIdioma();
  const t = flow === '2fa' ? (s, v) => traducir('es', s, v) : tTienda;

  const identifier = localStorage.getItem('tempIdentifier') || t('tu correo');
  const pendingToken = localStorage.getItem('pendingToken');

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < codeLength - 1) {
      document.getElementById(`code-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`).focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== codeLength) {
      setError(t('Ingresa el código de {n} caracteres', { n: codeLength }));
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (flow === 'register') {
        // 1- Verificamos el código para Registro de Cliente
        await api.post('/registerClient/verifyCodeEmail', {
          verificationCodeRequest: fullCode
        });
        toast.success(t('¡Registro exitoso! Ya puedes iniciar sesión.'));
        localStorage.removeItem('verificationFlow');
        // Este es EL punto donde consta que la persona es nueva: acaba de verificar el código de su
        // registro. En ningún otro lugar del sistema se sabe con esta certeza. La marca hace que el mapa
        // de bienvenida le salga en el login que viene a continuación —y solo en ese—.
        marcarRecienRegistrado();
        navigate('/iniciar-sesion');
      } 
      else if (flow === 'recovery') {
        // 2- Verificamos el código para Recuperación de contraseña
        await api.post('/recoveryPasswordClient/verifyCode', {
          code: fullCode
        });
        toast.success(t('Código verificado correctamente.'));
        navigate('/create-password');
      } 
      else {
        // 3- Flujo 2FA de Empleado (Por defecto)
        if (!pendingToken) {
          setError(t('Sesión inválida, vuelve a iniciar sesión'));
          setTimeout(() => navigate('/iniciar-sesion'), 2000);
          return;
        }
        
        const res = await loginStep2({
          pendingToken,
          otpCode: fullCode
        });
        
        const userType = identifier.includes('admin') ? 'admin' : 'employee';
        login(res.token, userType);
        
        localStorage.removeItem('tempIdentifier');
        localStorage.removeItem('tempMethod');
        localStorage.removeItem('pendingToken');
        
        toast.success(t('¡Autenticación completada con éxito!'));
        navigate('/dashboard');
      }

    } catch {
      setError(t('Código incorrecto o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      {/* La misma barra que el login. Ver EncabezadoAcceso. */}
      <EncabezadoAcceso />

      <Body>
        <Card>
          <BackButton type="button" aria-label={t('Volver')} onClick={() => navigate(-1)}>←</BackButton>

          <SectionTitle>{t('Ingresa el código de verificación')}</SectionTitle>

          <InfoBox>
            <InfoText>{t('Se ha enviado un código a {correo}', { correo: identifier })}</InfoText>

            {/* Cada casilla dice cuál es ("Dígito 2 de 6"): sin eso el lector de pantalla anunciaba seis campos
               iguales sin nombre. Y el teclado numérico en el teléfono, con el código que llegó por mensaje
               ofrecido para pegar en la primera. */}
            <CodeContainer role="group" aria-label={t('Código de verificación')}>
              {code.map((digit, idx) => (
                <CodeInput
                  key={idx}
                  id={`code-${idx}`}
                  aria-label={t('Dígito {n} de {total}', { n: idx + 1, total: code.length })}
                  inputMode="numeric"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                />
              ))}
            </CodeContainer>
          </InfoBox>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Button onClick={handleVerify} disabled={loading}>
            {loading ? t('Verificando...') : t('Verificar')}
          </Button>

          <ResendRow>
            {t('¿No has recibido el código aún?')}{' '}
            <ResendLink type="button" onClick={() => alert(t('Solicita un nuevo código.'))}>
              {t('Solicitar código nuevo')}
            </ResendLink>
          </ResendRow>
        </Card>
      </Body>
    </Container>
  );
};

export default Verification;