import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { canjearPaseApp } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import Mascota, { CargandoMascota } from '../components/UI/Mascota';

// EL PANEL ABIERTO DESDE LA APP — PanelDesdeApp.jsx (/admin/desde-app)
// La app del teléfono abre el panel en un navegador dentro de ella y llega aquí con un pase de un
// solo uso (?pase=…).

const volverSeguro = (valor) =>
  valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/dashboard';

const PanelDesdeApp = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  // En desarrollo React monta dos veces, y el pase sirve una sola.
  const canjeado = useRef(false);

  useEffect(() => {
    if (canjeado.current) return;
    canjeado.current = true;

    const parametros = new URLSearchParams(window.location.search);
    const pase = parametros.get('pase') || '';
    const volver = volverSeguro(parametros.get('volver'));
    // Fuera de la dirección cuanto antes: el pase no tiene por qué quedar en el historial.
    window.history.replaceState(null, '', '/admin/desde-app');

    canjearPaseApp(pase)
      .then((res) => {
        login(res.token, res.tipo || 'admin', res.admin);
        navigate(volver, { replace: true });
      })
      .catch((err) => setError(err.message || 'No se pudo abrir el panel.'));
  }, [login, navigate]);

  if (!error) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <CargandoMascota texto="Abriendo el panel…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-white">
      <Mascota pose="perdida" alto={150} />
      <h1 className="text-xl font-extrabold" style={{ color: '#1C1614' }}>No se pudo abrir el panel</h1>
      <p className="text-sm max-w-xs" style={{ color: '#6B6560' }}>{error}</p>
      <Link to="/admin" replace className="text-sm font-bold underline" style={{ color: '#003049' }}>
        Entrar con su cuenta
      </Link>
    </div>
  );
};

export default PanelDesdeApp;
