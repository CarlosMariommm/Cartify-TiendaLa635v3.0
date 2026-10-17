import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api';
import { VERSION_TERMINOS } from '../utils/terminos';
import { tAhora } from '../utils/idioma';

// useRegistro — crear una cuenta de cliente Todo lo que pasa al apretar "Continuar": armar el
// envío, subir la foto, pedirle al servidor el código de verificación y dejar el camino puesto
// para la pantalla que sigue. Vivía dentro de Register.jsx.

export const useRegistro = () => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [archivo, setArchivo] = useState(null);

  const registrar = async (datos) => {
    try {
      setCargando(true);

      const cuerpo = new FormData();
      cuerpo.append('fullName', datos.fullName);
      // El DUI solo viaja si la persona lo escribió. Mandar la cadena vacía dejaría a todos los que no
      // lo pusieron guardados con el mismo valor "", y el día que alguien busque por DUI o le ponga un
      // índice único al campo, eso se convierte en un problema.
      if (datos.dui?.trim()) cuerpo.append('dui', datos.dui.trim());
      // Fecha de nacimiento: para la edad de los productos +18. Solo si la dio.
      if (datos.fechaNacimiento) cuerpo.append('fechaNacimiento', datos.fechaNacimiento);
      cuerpo.append('phoneNumber', datos.phoneNumber);
      cuerpo.append('email', datos.email);
      cuerpo.append('userName', datos.userName);
      cuerpo.append('password', datos.password);

      // El consentimiento. Va como texto porque FormData no sabe de booleanos: todo lo que se le mete
      // sale del otro lado como cadena, así que se manda "true"/"false" a propósito y el servidor lo
      // interpreta igual.
      cuerpo.append('aceptaTerminos', String(!!datos.aceptaTerminos));
      cuerpo.append('terminosVersion', VERSION_TERMINOS);
      cuerpo.append('promociones', String(!!datos.promociones));

      if (archivo) cuerpo.append('image', archivo);

      await api.post('/registerClient', cuerpo, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(tAhora('¡Código enviado a {correo}! Revisa tu bandeja de entrada.', { correo: datos.email }), {
        duration: 5000,
      });

      // Qué flujo es y a qué correo, para que Verification sepa qué mostrar y
      // a qué endpoint llamar.
      localStorage.setItem('verificationFlow', 'register');
      localStorage.setItem('tempIdentifier', datos.email);
      navigate('/verification');
    } catch (error) {
      // El aviso de error lo pinta el interceptor de api.js; aquí solo se
      // deja rastro para depurar.
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  return {
    cargando,
    // La preview y las validaciones de la imagen las hace SubidorArchivo; aquí
    // solo se guarda el archivo tal cual, que es lo que se adjunta al envío.
    elegirArchivo: setArchivo,
    registrar,
    versionTerminos: VERSION_TERMINOS,
  };
};
