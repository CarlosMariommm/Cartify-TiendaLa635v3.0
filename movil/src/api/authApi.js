// SERVICIOS DE SESIÓN — authApi.js
// Las tres llamadas que necesita la app para que alguien tenga cuenta y pueda entrar. Son
// exactamente los mismos endpoints que usa la web; el backend no se tocó ni hizo falta tocarlo.

import { peticion } from './api';

// Entrar. Devuelve { token, userType, client }. El `userType` importa: por esta misma puerta
// entran clientes y personal, y el servidor es quien lo dice.
export const loginClientDB = ({ email, password }) =>
  peticion('/loginClient/login', {
    metodo: 'POST',
    cuerpo: { email, password },
  });

// Registrarse. No crea la cuenta todavía: el backend guarda los datos en un token de 15 minutos,
// lo deja en la cookie `registrationCookie` y manda un código de 6 caracteres al correo. La cuenta
// nace en verificarCodigoCorreo.
export const registrarCliente = ({
  fullName,
  dui,
  // "YYYY-MM-DD", para la edad de los productos +18 (ver utils/edad.js).
  fechaNacimiento,
  phoneNumber,
  email,
  userName,
  password,
  aceptaTerminos,
  promociones,
  // El "asset" que entrega expo-image-picker: { uri, fileName, mimeType }.
  foto,
}) => {
  const cuerpo = new FormData();
  cuerpo.append('fullName', fullName);
  // El DUI solo viaja si se escribió: ver el mismo cuidado en useRegistro.js
  // de la web (una cadena vacía para todos los que no lo dieron es peor que
  // no mandar el campo).
  if (dui?.trim()) cuerpo.append('dui', dui.trim());
  if (fechaNacimiento) cuerpo.append('fechaNacimiento', fechaNacimiento);
  cuerpo.append('phoneNumber', phoneNumber);
  cuerpo.append('email', email);
  cuerpo.append('userName', userName);
  cuerpo.append('password', password);
  cuerpo.append('aceptaTerminos', String(!!aceptaTerminos));
  cuerpo.append('promociones', String(!!promociones));
  if (foto) {
    cuerpo.append('image', {
      uri: foto.uri,
      name: foto.fileName || 'foto.jpg',
      type: foto.mimeType || 'image/jpeg',
    });
  }

  return peticion('/registerClient', { metodo: 'POST', cuerpo });
};

// Confirmar el código del correo. Aquí sí se crea la cuenta. Esta llamada depende de la cookie
// `registrationCookie` que dejó el registro: el código por sí solo no le dice nada al servidor,
// los datos del cliente viven dentro de esa cookie.
export const verificarCodigoCorreo = (codigo) =>
  peticion('/registerClient/verifyCodeEmail', {
    metodo: 'POST',
    cuerpo: { verificationCodeRequest: codigo },
  });

// Entrar con Google. `credential` es el idToken que entrega
// @react-native-google-signin/google-signin; el backend lo verifica contra Google (misma
// GOOGLE_CLIENT_ID que ya usan frontend y backend) y busca o enlaza la cuenta.
export const googleLoginDB = (credential, extra = {}) =>
  peticion('/loginClient/google', {
    metodo: 'POST',
    cuerpo: { credential, ...extra },
  });
