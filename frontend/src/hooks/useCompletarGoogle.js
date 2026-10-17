import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { googleLoginDB } from '../api/authApi';
import { useAuth } from './useAuth';
import { marcarRecienRegistrado } from '../utils/primerIngreso';
import { tAhora } from '../utils/idioma';

// TERMINAR DE ENTRAR CON GOOGLE — useCompletarGoogle.js
// Google confirma QUIÉN es la persona. No confirma que haya aceptado nada, ni sabe su teléfono, ni
// su edad. Este hook cubre ese hueco. La mitad se cae ahí, y con razón.

export const useCompletarGoogle = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login } = useAuth();
  const [cargando, setCargando] = useState(false);

  // Lo que Google ya confirmó: nombre, correo y foto. Se muestra, no se pide.
  const sugerido = state?.sugerido || {};
  const credential = state?.credential || null;
  const volverA = state?.volverA || '/';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: 'onBlur',
    defaultValues: { phoneNumber: '', fechaNacimiento: '', dui: '', aceptaTerminos: false, promociones: false },
  });

  const enviar = async (datos) => {
    if (!credential) {
      toast.error(tAhora('La sesión de Google venció. Vuelve a intentarlo.'));
      navigate('/iniciar-sesion');
      return;
    }

    try {
      setCargando(true);
      // Es la MISMA llamada del login, ahora con el consentimiento puesto. El servidor vuelve a
      // verificar el token contra Google —no confía en que ya se validó una vez— y recién ahí crea la
      // cuenta. Ver googleAuthClient.
      const res = await googleLoginDB(credential, {
        aceptaTerminos: true,
        promociones: !!datos.promociones,
        phoneNumber: datos.phoneNumber,
        fechaNacimiento: datos.fechaNacimiento || undefined,
        dui: datos.dui || undefined,
      });

      login(res.token, res.userType || 'client', res.client);

      // Acaba de crear su cuenta, así que le toca el saludo con el mapa donde deja su dirección — lo
      // mismo que al registro normal. Sin esto, un cliente nuevo de Google caía en la portada sin
      // ninguna dirección guardada y descubría que le falta recién al ir a pagar.
      marcarRecienRegistrado();
      toast.success(tAhora('¡Listo! Tu cuenta quedó creada.'));

      // `replace` a propósito: esta pantalla ya cumplió. Sin él, el "atrás" del navegador devuelve a un
      // formulario cuyo token de Google ya se usó.
      navigate('/bienvenida', { replace: true, state: { volverA } });
    } catch (error) {
      // El caso feo: el token de Google vence a la hora. Si alguien deja esta pantalla abierta y vuelve
      // mañana, el servidor lo rechaza — y decirle "error 401" no le sirve de nada.
      toast.error(tAhora(error.message || 'No se pudo crear la cuenta. Vuelve a entrar con Google.'));
    } finally {
      setCargando(false);
    }
  };

  return {
    // Sin token no hay nada que completar: la pantalla lo usa para devolverse.
    hayToken: !!credential,
    sugerido,
    register,
    errors,
    cargando,
    aceptoTerminos: !!watch('aceptaTerminos'),
    onSubmit: handleSubmit(enviar),
    cancelar: () => navigate('/iniciar-sesion', { replace: true }),
  };
};
