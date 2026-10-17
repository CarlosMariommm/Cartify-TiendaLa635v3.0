// GOOGLE SIGN-IN — configuración
// App.js importa este archivo una sola vez, solo por su efecto secundario: deja a GoogleSignin
// listo desde antes de que cualquier pantalla intente usarlo.
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const GOOGLE_WEB_CLIENT_ID =
  '148683224510-htubuika332kh2ck0f7fkc0fr06gjfjp.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});
