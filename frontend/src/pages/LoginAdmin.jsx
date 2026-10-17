import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { loginAdminDB, verify2FAAdmin } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import CampoContrasena from '../components/UI/CampoContrasena';
import { useAjustesCtx } from '../context/AjustesContext';
import Mascota from '../components/UI/Mascota';

const LoginAdmin = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const { ajustes } = useAjustesCtx();
  const [loading, setLoading] = useState(false);
  // El color de marca real, inyectado localmente — /admin también está en la lista de rutas del
  // panel, así que useTemporada() apaga --marca-* ahí a propósito (ver SinPermiso.jsx). Con esto
  // puesto en el envoltorio, el login sigue el color de marca de verdad y no el café de fábrica.

  // El login es de DOS pasos por el 2FA: 'credenciales' → correo + contraseña. 'codigo' → el código
  // que llegó al correo.
  const [paso, setPaso] = useState('credenciales');
  const [correoEnm, setCorreoEnm] = useState(''); // correo enmascarado, para el aviso
  const [codigo, setCodigo] = useState('');

  // 1- Limpiar la sesión previa DEL PERSONAL al entrar a su login. El área va dicha a la letra y no
  // se deduce de la ruta: así queda claro que entrar por esta puerta no roza la sesión de cliente
  // que la misma persona tenga abierta en la tienda. Ver AuthContext.
  useEffect(() => {
    logout('personal');
  }, [logout]);

  // El correo que ya escribió en el login de la TIENDA, si llegó rebotado de ahí por ser del
  // personal (ver LoginClient). Viaja en el estado de la navegación, no en la URL, y se escribe
  // solo: le falta la contraseña.
  const { state } = useLocation();
  const correoTraido = typeof state?.correo === 'string' ? state.correo : '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: correoTraido,
      password: '',
      rememberMe: false,
    }
  });

  // Lo que pasa una vez que la sesión SÍ se abrió (tras verificar el código). De vuelta a donde iba,
  // no siempre al Dashboard: ProtectedRoute manda aquí con ?volver=/inventario. `replace` para que
  // el login no quede en el historial y el "atrás" no regrese a esta pantalla.
  const entrar = (res) => {
    // El rol lo decide el backend (en cuál de las dos cuentas encontró el
    // correo), no esta pantalla: por eso res.tipo y no 'admin' fijo. Con esto
    // un empleado entra por la misma puerta y el panel le muestra lo suyo.
    login(res.token, res.tipo || 'admin', res.admin);
    // Sin `style` propio: así hereda el diseño y el color de marca que ya
    // trae el Toaster global (AvisosConMarca en App.jsx). Un estilo fijo
    // aquí encima lo tapaba por completo, café incluido.
    toast.success('¡Bienvenido! Inicio de sesión exitoso');
    const volver = new URLSearchParams(window.location.search).get('volver');
    navigate(volver && volver.startsWith('/') ? volver : '/dashboard', { replace: true });
  };

  // PASO 1 — correo + contraseña. Si están bien, el backend manda el código y
  // se pasa al paso del código; la sesión todavía no se abre.
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await loginAdminDB({ email: data.email, password: data.password });
      if (res.needs2FA) {
        setCorreoEnm(res.email || '');
        setCodigo('');
        setPaso('codigo');
        toast.success('Le enviamos un código a su correo');
      } else if (res.token) {
        // Respaldo por si el backend algún día devuelve sesión directa.
        entrar(res);
      }
    } catch (err) {
      toast.error(err.message || 'Credenciales inválidas o cuenta bloqueada');
    } finally {
      setLoading(false);
    }
  };

  // PASO 2 — verificar el código. Si coincide, ahí sí se abre la sesión.
  const onVerificar = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    try {
      setLoading(true);
      const res = await verify2FAAdmin({ code: codigo.trim() });
      entrar(res);
    } catch (err) {
      toast.error(err.message || 'El código no es correcto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Columna izquierda - Imagen */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-100">
        {/* Tiqui sobre el fondo de la marca. */}
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--marca-50)]" aria-hidden="true">
          <Mascota pose="saludo" alto={260} />
        </div>
      </div>

      {/* Columna derecha - Formulario */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12">
        <div className="w-full max-w-md flex flex-col items-center">

          {/* Logo / Header */}
          <div className="text-center mb-10">
            {/* El nombre sale de los ajustes, no del codigo: estaba escrito a mano y se quedaba con el viejo
               cada vez que se renombraba la tienda en Personalizacion. */}
            <h1 className="text-4xl font-extrabold text-black leading-tight mb-4 tracking-tight">
              {ajustes.nombreLinea1}
              {ajustes.nombreLinea2 && <><br />{ajustes.nombreLinea2}</>}
            </h1>
            <p className="text-gray-500 text-sm font-medium">Panel del personal</p>
            <p className="text-gray-400 text-xs mt-2 max-w-xs mx-auto">
              {paso === 'credenciales'
                ? 'Ingresa tus credenciales para continuar.'
                : `Escribe el código que enviamos a ${correoEnm || 'tu correo'}.`}
            </p>
          </div>

          {paso === 'credenciales' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo</label>
              <input
                type="email"
                placeholder="Introduce tu correo electrónico"
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300 focus:border-[var(--marca-600)]'} focus:outline-none focus:ring-1 focus:ring-[var(--marca-600)] transition-colors text-sm`}
                {...register('email', {
                  required: 'El correo electrónico es requerido',
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                    message: 'Formato de correo inválido'
                  }
                })}
              />
              {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
              <CampoContrasena
                autoFocus={!!correoTraido}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.password ? 'border-red-500' : 'border-gray-300 focus:border-[var(--marca-600)]'} focus:outline-none focus:ring-1 focus:ring-[var(--marca-600)] transition-colors text-sm tracking-widest`}
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 6, message: 'La contraseña debe tener al menos 6 caracteres' }
                })}
              />
              {errors.password && <span className="text-red-500 text-xs mt-1 block">{errors.password.message}</span>}
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-[var(--marca-600)] focus:ring-[var(--marca-600)]"
                  {...register('rememberMe')}
                />
                <span className="text-xs text-gray-600">Recuerda durante 30 días</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[var(--marca-600)] hover:bg-[var(--marca-700)] text-white rounded-lg text-sm font-semibold transition-colors mt-6 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </button>
          </form>
          ) : (
          <form onSubmit={onVerificar} className="w-full space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Código del correo</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                placeholder="6 dígitos"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[var(--marca-600)] focus:outline-none focus:ring-1 focus:ring-[var(--marca-600)] transition-colors text-center text-lg tracking-[6px] font-bold"
              />
              <p className="text-xs text-gray-400 mt-2">El código vence en 10 minutos.</p>
            </div>

            <button
              type="submit"
              disabled={loading || codigo.length < 6}
              className="w-full py-3 px-4 bg-[var(--marca-600)] hover:bg-[var(--marca-700)] text-white rounded-lg text-sm font-semibold transition-colors mt-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Verificar y entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setPaso('credenciales'); setCodigo(''); }}
              className="w-full text-xs text-gray-500 hover:text-gray-700 font-semibold"
            >
              ← Volver e intentar con otra cuenta
            </button>
          </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              ¿Eres cliente?{' '}
              <a href="/" className="text-[var(--marca-600)] hover:text-[var(--marca-700)] font-semibold transition-colors">
                Ir a la tienda
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
