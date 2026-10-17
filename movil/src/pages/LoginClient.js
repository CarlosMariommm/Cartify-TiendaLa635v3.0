// INICIAR SESIÓN — la puerta, ya no el portón
// La versión móvil de `frontend/src/pages/LoginClient.jsx`. ── Aquí solo va el formulario ──

import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TiquiColgada from '../components/Tiqui/TiquiColgada';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import BarraMarca from '../components/UI/BarraMarca';
import Boton from '../components/UI/Boton';
import CampoTexto from '../components/UI/CampoTexto';
import Casilla from '../components/UI/Casilla';
import BotonGoogle from '../components/UI/BotonGoogle';
// Los mismos iconos que la web (lucide): correo `Mail`, contraseña `Lock`.
import { Lock, Mail } from 'lucide-react-native';
import { googleLoginDB, loginClientDB } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { useTema } from '../context/TemaContext';
import { useEstilos } from '../context/ModoContext';
import { useIdioma } from '../context/IdiomaContext';
import { sinErrores, validarContrasena, validarCorreo, validarFormulario } from '../utils/validaciones';
import { URL_WEB_LEGAL } from '../utils/legales';
import SelectorIdioma from '../components/UI/SelectorIdioma';
import { contenidoCentrado } from '../theme/pantalla';

const LoginClient = ({ irARegistro, irATienda, irAPersonal }) => {
  const { t } = useIdioma();
  const { login } = useAuth();
  // La paleta de la temporada: el botón y los enlaces se pintan con ella, igual
  // que la tienda. Fuera de temporada es el café de la marca de siempre.
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  const [valores, setValores] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [avisoServidor, setAvisoServidor] = useState('');
  const [recordarme, setRecordarme] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  // Con la contraseña en foco, Tiqui se tapa los ojos: no está mirando.
  const [enContrasena, setEnContrasena] = useState(false);
  // Del correo, "Siguiente" en el teclado salta aquí. Ver CampoTexto.
  const campoContrasena = useRef(null);

  const cambiar = (campo) => (texto) => {
    setValores((v) => ({ ...v, [campo]: texto }));
    // El error se borra al corregir, no al reenviar: nadie quiere seguir viendo
    // "formato inválido" en rojo mientras arregla el correo.
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: null }));
    if (avisoServidor) setAvisoServidor('');
  };

  const enviar = async () => {
    const encontrados = validarFormulario(valores, {
      email: validarCorreo,
      password: validarContrasena,
    });
    setErrores(encontrados);
    if (!sinErrores(encontrados)) return;

    try {
      setCargando(true);
      setAvisoServidor('');

      const res = await loginClientDB({
        email: valores.email.trim(),
        password: valores.password,
      });

      // Un servidor sin actualizar todavía abre sesión del personal por esta puerta. No se guarda como
      // si fuera de cliente: se le lleva a la suya.
      if (res.userType && res.userType !== 'client') {
        irAPersonal?.(valores.email.trim());
        return;
      }
      login(res.token, 'client', res.client);
    } catch (err) {
      // Escribió su cuenta del personal: el servidor ya no le abre sesión por aquí (se saltaba el código
      // del segundo paso) y contesta `esPersonal`. Se le lleva a "¿Trabajas en la tienda?" con el correo
      // ya puesto.
      if (err.esPersonal && irAPersonal) {
        irAPersonal(valores.email.trim());
        return;
      }
      // El error del servidor va dentro de la tarjeta y no en una alerta que hay que cerrar: "la
      // contraseña es incorrecta" se lee al lado del campo que hay que corregir, con la contraseña
      // todavía escrita.
      setAvisoServidor(err.message || t('No se pudo iniciar sesión'));
    } finally {
      setCargando(false);
    }
  };

  // Entrar con Google. El selector de cuenta nativo entrega un idToken; se manda al backend (misma
  // ruta y misma verificación que la web) y, si cuadra, se sigue el mismo camino que el login
  // normal.
  const conGoogle = async () => {
    try {
      setAvisoServidor('');
      setCargandoGoogle(true);

      await GoogleSignin.hasPlayServices();
      const respuesta = await GoogleSignin.signIn();
      // Cerró el selector de cuenta sin elegir ninguna: no es un error, no
      // hay nada que avisar.
      if (respuesta.type === 'cancelled') return;

      const idToken = respuesta.data.idToken;
      if (!idToken) {
        setAvisoServidor(t('No se recibió la respuesta de Google'));
        return;
      }

      const res = await googleLoginDB(idToken);
      login(res.token, res.userType || 'client', res.client);
    } catch (err) {
      // Esta pantalla es para ENTRAR, no para registrarse — igual que la web. Si el correo de Google no
      // tiene cuenta, el backend se niega a crearla aquí (no hay dónde aceptar los términos ni dejar el
      // teléfono) y contesta con `requiereConsentimiento`.
      if (err.requiereConsentimiento) {
        setAvisoServidor(t('No tienes una cuenta con ese correo de Google. Regístrate primero: también puedes hacerlo con Google.'));
        return;
      }
      setAvisoServidor(err.message || t('No se pudo iniciar sesión con Google'));
    } finally {
      setCargandoGoogle(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <BarraMarca
        alTocarMarca={irATienda}
        textoAccion={t('Seguir viendo la tienda')}
        alPresionarAccion={irATienda}
      />

      <KeyboardAvoidingView
        style={estilos.flexible}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.cuerpo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tiqui colgando arriba del formulario, como en el inicio de sesión de la web: se tapa los ojos en
             la contraseña, se pone contenta mientras entra y pensativa si algo no cuadró. */}
          <View style={estilos.tiqui} pointerEvents="none">
            <TiquiColgada
              cara={cargando || cargandoGoogle ? 'feliz' : avisoServidor ? 'piensa' : enContrasena ? 'tapada' : 'normal'}
              alto={170}
              largo={70}
            />
          </View>
          <Text style={estilos.titulo}>{t('Qué bueno verte de nuevo')}</Text>
          <Text style={estilos.subtitulo}>{t('Inicia sesión para seguir con tu compra.')}</Text>

          <CampoTexto
            icono={Mail}
            marcador={t('Correo electrónico')}
            valor={valores.email}
            alCambiar={cambiar('email')}
            error={errores.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            siguiente={campoContrasena}
            accessibilityLabel={t('Correo electrónico')}
            redondo
          />

          <CampoTexto
            icono={Lock}
            marcador={t('Contraseña')}
            valor={valores.password}
            alCambiar={cambiar('password')}
            error={errores.password}
            esContrasena
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            ref={campoContrasena}
            onFocus={() => setEnContrasena(true)}
            onBlur={() => setEnContrasena(false)}
            alEnviar={enviar}
            accessibilityLabel={t('Contraseña')}
            redondo
          />

          <View style={estilos.fila}>
            <Casilla marcada={recordarme} alCambiar={setRecordarme} etiqueta={t('Recordarme 30 días')} />
            {/* La recuperación todavía no existe en la app: se hace en la web, que ya la tiene completa. */}
            <Pressable
              hitSlop={8}
              accessibilityRole="link"
              onPress={() => Linking.openURL(`${URL_WEB_LEGAL}/forgot-password`)}
            >
              <Text style={[estilos.enlace, { color: colores.marcaTexto }]}>{t('¿Olvidaste tu contraseña?')}</Text>
            </Pressable>
          </View>

          {avisoServidor ? (
            <View style={estilos.aviso}>
              <Text style={estilos.avisoTexto}>{avisoServidor}</Text>
            </View>
          ) : null}

          <Boton
            texto={t('Iniciar sesión')}
            alPresionar={enviar}
            cargando={cargando}
            deshabilitado={cargandoGoogle}
            color={colores.marca}
            colorPresionado={colores.marcaOscuro}
            estilo={estilos.botonRedondo}
          />

          <View style={estilos.divisor}>
            <View style={estilos.linea} />
            {/* Solo "o", como la web: el "Continuar" ya lo dice el botón de abajo. */}
            <Text style={estilos.divisorTexto}>{t('o')}</Text>
            <View style={estilos.linea} />
          </View>

          <BotonGoogle
            texto={t('Continuar con Google')}
            textoCargando={t('Entrando…')}
            cargando={cargandoGoogle}
            deshabilitado={cargando}
            alPresionar={conGoogle}
          />

          {/* La única puerta al registro que queda, y va aquí porque es donde se busca: al final del
             formulario, después de comprobar que no se tiene con qué entrar. */}
          <Text style={estilos.pie}>
            {t('¿No tienes una cuenta?')}{' '}
            <Text style={[estilos.pieEnlace, { color: colores.marcaTexto }]} onPress={irARegistro}>
              {t('Regístrate')}
            </Text>
          </Text>

          {/* La puerta del personal: el administrador entra al Reparto y al panel web; el empleado, al
             Reparto (ver pages/personal). Discreta a propósito: la pantalla es de los clientes. */}
          {irAPersonal ? (
            <Text style={estilos.pieAdmin}>
              {t('¿Trabajas en la tienda?')}{' '}
              <Text style={[estilos.pieEnlace, { color: colores.marcaTexto }]} onPress={() => irAPersonal()} accessibilityRole="link">
                {t('Entra aquí')}
              </Text>
            </Text>
          ) : null}

          {/* Sin cuenta todavía no hay Preferencias: el idioma, a la mano aquí. */}
          <View style={estilos.idioma}>
            <SelectorIdioma />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  idioma: {
    marginTop: 22,
  },
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  flexible: {
    flex: 1,
  },
  cuerpo: {
    ...contenidoCentrado,
    padding: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },

  titulo: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: COLORES.subtitulo,
    marginBottom: 26,
    textAlign: 'center',
  },
  // Cuelga del borde de arriba, centrada: el margen negativo se come el
  // aire de arriba del cuerpo para que el broche quede pegado a la barra.
  tiqui: {
    alignItems: 'center',
    marginTop: -28,
    marginBottom: 10,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  enlace: {
    fontSize: 13,
    color: COLORES.marcaTexto,
    fontWeight: '600',
  },
  aviso: {
    backgroundColor: COLORES.peligroFondo,
    borderWidth: 1,
    borderColor: COLORES.peligroBorde,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  avisoTexto: {
    color: COLORES.peligro,
    fontSize: 13,
    lineHeight: 19,
  },
  botonRedondo: {
    borderRadius: 28,
  },

  // ── Divisor "o" ──
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 22,
  },
  linea: {
    flex: 1,
    height: 1,
    backgroundColor: COLORES.linea,
  },
  divisorTexto: {
    fontSize: 12.5,
    color: COLORES.textoTenue,
  },

  pie: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORES.textoTenue,
    marginTop: 22,
  },
  pieEnlace: {
    color: COLORES.marcaTexto,
    fontWeight: '600',
  },
  pieAdmin: {
    textAlign: 'center',
    fontSize: 12.5,
    color: COLORES.textoTenue,
    marginTop: 14,
  },
});

export default LoginClient;
