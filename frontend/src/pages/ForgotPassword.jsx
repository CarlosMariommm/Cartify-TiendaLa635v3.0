import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import api from '../api/api';
import { useAjustesCtx } from '../context/AjustesContext';
import Mascota from '../components/UI/Mascota';
import { useIdioma } from '../hooks/useIdioma';

const ForgotPassword = () => {
  // El nombre de la tienda sale de los ajustes, no escrito a mano.
  const { ajustes } = useAjustesCtx();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { t } = useIdioma();
  const { register, handleSubmit, formState: { errors } } = useForm();

  // 1- Enviar la solicitud de recuperación
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // 2- Llamada al backend
      const response = await api.post('/recoveryPasswordClient/requestCode', {
        email: data.email
      });

      toast.success(t(response.data.message || 'Se enviará un código a tu correo si existe.'));
      
      // Guardar flujo para que Verification sepa
      localStorage.setItem('verificationFlow', 'recovery');
      
      // Simular delay y navegar
      setTimeout(() => {
        navigate('/verification');
      }, 1500);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--papel)]">
      {/* Left Column - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[var(--papel-gris)]">
        {/* Tiqui sobre el fondo de la marca. */}
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--marca-50)]" aria-hidden="true">
          <Mascota pose="perdida" alto={260} />
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12">
        <div className="w-full max-w-md flex flex-col items-center">
          
          {/* Logo / Header */}
          <div className="text-center mb-10">
            {/* El nombre sale de los ajustes, no del codigo. Ver MarcaTienda. */}
            <h1 className="text-4xl font-extrabold text-[var(--tinta)] leading-tight mb-4 tracking-tight">
              {ajustes.nombreLinea1}
              {ajustes.nombreLinea2 && <><br />{ajustes.nombreLinea2}</>}
            </h1>
            <p className="text-[var(--tinta-suave)] text-sm font-medium">{t('Recuperar contraseña')}</p>
            <p className="text-[var(--tinta-tenue)] text-xs mt-2 max-w-xs mx-auto">
              {t('Ingresa el correo asociado a tu cuenta y te enviaremos las instrucciones.')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5 relative">
            <div>
              <label htmlFor="campo-email" className="block text-sm font-semibold text-[var(--tinta-suave)] mb-1.5">{t('Correo')}</label>
              <input
                type="email"
                placeholder={t('Introduce tu correo electrónico')}
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.email ? 'border-[var(--peligro)]' : 'border-[var(--linea-fuerte)]'} focus:outline-none focus:border-[var(--marca-600)] focus:ring-1 focus:ring-[var(--marca-600)] transition-colors text-sm`}
                id="campo-email"
                {...register("email", { 
                  required: "El correo es obligatorio",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Formato de correo inválido"
                  }
                })}
              />
              {errors.email && (
                <span className="text-[var(--peligro)] text-xs mt-1 block absolute">
                  {t(errors.email.message)}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[var(--marca-600)] hover:bg-[var(--marca-700)] text-white rounded-lg text-sm font-semibold transition-colors mt-6 shadow-sm flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : t('Recuperar contraseña')}
            </button>
          </form>

          <div className="mt-8 text-center flex flex-col gap-2">
            <p className="text-xs text-[var(--tinta-suave)]">
              {t('¿Ya la recordaste?')}{' '}
              <Link to="/iniciar-sesion" className="text-[var(--marca-texto)] hover:text-[var(--marca-texto-fuerte)] font-semibold transition-colors">
                {t('Iniciar sesión')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
