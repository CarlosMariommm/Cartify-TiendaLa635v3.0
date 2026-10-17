import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, Check, Store, Loader2, TriangleAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { kioscoService } from '../api/kioscoService';
import { useIdioma } from '../hooks/useIdioma';

// VINCULAR KIOSCO — lo que abre el teléfono al escanear el QR
// Es la mitad del cliente: el kiosco muestra el código, y esta pantalla —abierta en SU teléfono,
// donde ya inició sesión— lo reclama.
const VincularKiosco = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useIdioma();

  const [estado, setEstado] = useState('preguntando'); // preguntando | vinculando | listo | error
  const [mensaje, setMensaje] = useState('');

  const esCliente = user?.type === 'client';

  const vincular = async () => {
    setEstado('vinculando');
    try {
      await kioscoService.vincular(codigo, user.id);
      setEstado('listo');
    } catch (e) {
      setMensaje(e?.response?.data?.message || t('No se pudo vincular. Pide un código nuevo en el kiosco.'));
      setEstado('error');
    }
  };

  return (
    <div style={hoja}>
      <div style={tarjeta}>
        <div style={sello}>
          <QrCode size={26} strokeWidth={2.2} color="var(--marca-600)" />
        </div>

        {/* Sin sesión no hay a qué cuenta pegarle la compra */}
        {!esCliente ? (
          <>
            <h1 style={titulo}>{t('Inicia sesión para continuar')}</h1>
            <p style={bajada}>
              {t('Necesitamos saber a qué cuenta cargarle esta compra y sus puntos.')}
            </p>
            <button
              style={botonPrincipal}
              onClick={() => navigate(`/iniciar-sesion?volver=/vincular/${codigo}`)}
            >
              {t('Iniciar sesión')}
            </button>
          </>
        ) : estado === 'listo' ? (
          <>
            <div style={{ ...sello, background: 'var(--exito-fondo)' }}>
              <Check size={26} strokeWidth={2.6} color="var(--exito-texto)" />
            </div>
            <h1 style={titulo}>{t('¡Listo, {nombre}!', { nombre: user.userName || user.fullName })}</h1>
            <p style={bajada}>
              {t('Tu compra quedará a tu nombre y los puntos te caen solos al pagar. Ya puedes volver a la pantalla de la tienda.')}
            </p>
            <button style={botonSuave} onClick={() => navigate('/')}>
              <Store size={16} /> {t('Ir a la tienda')}
            </button>
          </>
        ) : estado === 'error' ? (
          <>
            <div style={{ ...sello, background: 'var(--aviso-fondo)' }}>
              <TriangleAlert size={24} strokeWidth={2.3} color="var(--aviso-vivo)" />
            </div>
            <h1 style={titulo}>{t('No se pudo vincular')}</h1>
            <p style={bajada}>{mensaje}</p>
            <button style={botonSuave} onClick={() => navigate('/')}>{t('Volver a la tienda')}</button>
          </>
        ) : (
          <>
            <h1 style={titulo}>{t('¿Es tuya esta compra?')}</h1>
            <p style={bajada}>
              {t('La compra del kiosco quedará a nombre de')} <strong>{user.userName || user.fullName}</strong>{t(', con sus puntos de fidelidad.')}
            </p>
            <p style={codigoChip}>{codigo}</p>

            <button style={botonPrincipal} onClick={vincular} disabled={estado === 'vinculando'}>
              {estado === 'vinculando'
                ? <><Loader2 size={17} className="animate-spin" /> {t('Vinculando…')}</>
                : t('Sí, es mía')}
            </button>
            <button style={botonTexto} onClick={() => navigate('/')}>
              {t('No fui yo')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Estilos: pensados para leerse de pie y con una mano ──
const hoja = {
  minHeight: '100vh',
  background: 'var(--papel)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const tarjeta = {
  width: '100%',
  maxWidth: 380,
  textAlign: 'center',
  border: '1px solid var(--linea)',
  borderRadius: 22,
  padding: '32px 24px',
  boxShadow: '0 18px 44px rgba(60,40,20,0.10)',
};

const sello = {
  width: 54, height: 54, borderRadius: 16,
  background: 'var(--marca-50)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 16px',
};

const titulo = { fontSize: 22, fontWeight: 800, color: 'var(--tinta)', margin: '0 0 8px' };
const bajada = { fontSize: 14.5, lineHeight: 1.55, color: 'var(--tinta-suave)', margin: '0 0 20px' };

const codigoChip = {
  display: 'inline-block',
  fontSize: 20, fontWeight: 800, letterSpacing: 4,
  color: 'var(--marca-texto)', background: 'var(--marca-50)',
  padding: '8px 18px', borderRadius: 12, margin: '0 0 22px',
};

const botonPrincipal = {
  width: '100%', padding: '15px 0', borderRadius: 999, border: 'none',
  background: 'var(--marca-600)', color: '#fff', fontSize: 16, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  cursor: 'pointer',
};

const botonSuave = {
  width: '100%', padding: '13px 0', borderRadius: 999,
  border: '1px solid var(--linea)', background: 'var(--papel)', color: 'var(--marca-texto)',
  fontSize: 14.5, fontWeight: 700, marginTop: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  cursor: 'pointer',
};

const botonTexto = {
  width: '100%', padding: '12px 0', border: 'none', background: 'none',
  color: 'var(--tinta-tenue)', fontSize: 13.5, fontWeight: 600, marginTop: 6, cursor: 'pointer',
};

export default VincularKiosco;
