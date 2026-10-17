import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import EncabezadoAcceso from '../components/Store/EncabezadoAcceso';
import { BotonOjo } from '../components/UI/CampoContrasena';
import { useAuth } from '../hooks/useAuth';

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

  &:hover { color: var(--marca-texto); }
`;

const SectionTitle = styled.h2`
  font-size: 26px;
  font-weight: 700;
  color: var(--tinta);
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: var(--tinta-tenue);
  margin: 0 0 28px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--tinta);
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid var(--linea-fuerte);
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  color: var(--tinta);
  box-sizing: border-box;
  transition: border-color 0.2s;
  margin-bottom: 20px;

  &:focus { border-color: ${BROWN}; }
`;

const Button = styled.button`
  width: 100%;
  padding: 14px;
  background: ${BROWN};
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 16px;
  transition: background 0.2s;

  &:hover { background: var(--marca-700); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.div`
  color: var(--peligro);
  font-size: 13px;
  margin-bottom: 14px;
  padding: 10px 14px;
  background: var(--peligro-fondo);
  border-radius: 8px;
`;

// Botón con cara de enlace: el div de antes no se alcanzaba con Tab.
const ForgotLink = styled.button`
  display: block;
  margin: 0 auto;
  background: none;
  border: none;
  padding: 4px 0;
  font-family: inherit;
  text-align: center;
  font-size: 13px;
  color: var(--marca-texto);
  cursor: pointer;
  font-weight: 600;

  &:hover { text-decoration: underline; }
`;

const LoginPassword = () => {
  const navigate = useNavigate();
  // La sesión se guarda por el contexto, nunca escribiendo localStorage a mano.
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const identifier = localStorage.getItem('tempIdentifier') || '';

  const handleLogin = () => {
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.identifier === identifier);

      if (!user) {
        setError('Usuario no encontrado');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError('Contraseña incorrecta');
        setLoading(false);
        return;
      }

      // Guardar la sesión y saludar con el mapa de bienvenida. Va por el contexto y marcada como
      // CLIENTE.
      login('authenticated', 'client', user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      // `replace`: el login queda fuera del historial, para que el "atrás" del
      // navegador no regrese a pedir la contraseña otra vez.
      navigate('/bienvenida', { replace: true });
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <Container>
      {/* La misma barra que el login. Ver EncabezadoAcceso. */}
      <EncabezadoAcceso />

      <Body>
        <Card>
          <BackButton type="button" aria-label="Volver" onClick={() => navigate('/iniciar-sesion')}>←</BackButton>

          <SectionTitle>Qué bueno verte de nuevo</SectionTitle>
          <Subtitle>Ingresa tu contraseña para continuar</Subtitle>

          <Label htmlFor="campo-password">Contraseña</Label>
          <div style={{ position: 'relative' }}>
            <Input
              id="campo-password"
              autoComplete="current-password"
              type={verPass ? 'text' : 'password'}
              placeholder="Tu contraseña"
              style={{ paddingRight: 44 }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <BotonOjo visible={verPass} onToggle={() => setVerPass((v) => !v)} />
          </div>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Button onClick={handleLogin} disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar sesión'}
          </Button>

          <ForgotLink type="button" onClick={() => alert('Función de recuperación próximamente')}>
            ¿Olvidaste tu contraseña?
          </ForgotLink>
        </Card>
      </Body>
    </Container>
  );
};

export default LoginPassword;