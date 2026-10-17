// REGISTRARSE — la versión móvil de Register.jsx
// Los mismos campos y en el mismo orden que la web: nombre y usuario, después DUI, teléfono y
// dirección, y al final el correo y la contraseña.

import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import BarraMarca from '../components/UI/BarraMarca';
import Boton from '../components/UI/Boton';
import BotonGoogle from '../components/UI/BotonGoogle';
import CampoTexto from '../components/UI/CampoTexto';
import Casilla from '../components/UI/Casilla';
import HojaTerminos from '../components/UI/HojaTerminos';
// Los mismos iconos que la web (lucide): nombre/usuario `User`, fecha de
// nacimiento `Calendar`, DUI `Hash`, teléfono `Phone`, correo `Mail`,
// contraseña `Lock`, foto `Camera`.
import { Calendar, Camera, Hash, Lock, Mail, Phone, User } from 'lucide-react-native';
import { Equis } from '../components/UI/Iconos';
import { googleLoginDB, registrarCliente } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { useTema } from '../context/TemaContext';
import { useColores, useEstilos } from '../context/ModoContext';
import { tAhora } from '../utils/idioma';
import { calcularEdad, esMayorDeEdad } from '../utils/edad';
import { useIdioma } from '../context/IdiomaContext';
import {
  fechaISO,
  formatearDui,
  formatearFecha,
  formatearTelefono,
  LARGO_DUI,
  LARGO_FECHA,
  LARGO_TELEFONO,
} from '../utils/mascaras';
import {
  requerido,
  sinErrores,
  validarContrasena,
  validarCorreo,
  validarDui,
  validarFormulario,
  validarTelefono,
} from '../utils/validaciones';
import { contenidoCentrado } from '../theme/pantalla';

const VALORES_INICIALES = {
  fullName: '',
  userName: '',
  fechaNacimiento: '',
  dui: '',
  phoneNumber: '',
  email: '',
  password: '',
};

// Fecha de nacimiento: igual que en la web, obligatoria y con el mismo rango (0 a 120 años) — ver
// el `validate` de `fechaNacimiento` en `frontend/src/pages/Register.jsx`.
const validarFechaNacimiento = (valor) => {
  const iso = fechaISO(valor);
  if (!iso) {
    return String(valor || '').replace(/\D/g, '').length
      ? tAhora('Esa fecha no es válida')
      : tAhora('La fecha de nacimiento es obligatoria');
  }
  const edad = calcularEdad(iso);
  if (edad < 0 || edad > 120) return tAhora('Revisa la fecha');
  return null;
};

const REGLAS = {
  fullName: (v) => requerido(v, tAhora('El nombre es obligatorio')),
  userName: (v) => requerido(v, tAhora('El nombre de usuario es obligatorio')),
  fechaNacimiento: validarFechaNacimiento,
  dui: validarDui,
  phoneNumber: validarTelefono,
  email: validarCorreo,
  password: validarContrasena,
};

const Register = ({ irALogin, alPedirCodigo }) => {
  const { t } = useIdioma();
  // La paleta de la temporada: el botón, los enlaces y la zona de foto se
  // pintan con ella, como la tienda. Fuera de temporada es el café de siempre.
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const [valores, setValores] = useState(VALORES_INICIALES);
  // Una ref por campo, para que "Siguiente" en el teclado lleve de uno al otro en orden (ver
  // CampoTexto). El nombre no la necesita: es el primero. En iOS el teclado numérico no trae esa
  // tecla, así que en la fecha, el DUI y el teléfono se sigue tocando el campo que viene.
  const campos = {
    userName: useRef(null),
    fechaNacimiento: useRef(null),
    dui: useRef(null),
    phoneNumber: useRef(null),
    email: useRef(null),
    password: useRef(null),
  };
  const [errores, setErrores] = useState({});
  const [avisoServidor, setAvisoServidor] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  // El consentimiento va aparte de `valores` porque no son campos de texto y no pasan por
  // `validarFormulario`.
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [promociones, setPromociones] = useState(false);
  const [errorTerminos, setErrorTerminos] = useState('');
  // Qué documento legal está abierto encima del formulario (o null).
  const [verTerminos, setVerTerminos] = useState(null);

  const [foto, setFoto] = useState(null);
  const [errorFoto, setErrorFoto] = useState('');

  // Mismo tope que `SubidorArchivo` en la web (8 MB) — y el mismo que de verdad hace cumplir multer
  // en el servidor (ver backend/src/utils/cloudinaryConfig.js), no un número puesto a ojo.
  const PESO_MAXIMO_FOTO = 8 * 1024 * 1024;

  const elegirFoto = async () => {
    setErrorFoto('');
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setErrorFoto(t('No diste permiso para abrir la galería.'));
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (resultado.canceled) return;

    const elegida = resultado.assets[0];
    if (elegida.fileSize && elegida.fileSize > PESO_MAXIMO_FOTO) {
      const pesoMB = (elegida.fileSize / (1024 * 1024)).toFixed(1);
      setErrorFoto(t('Esa foto pesa {peso} MB y el máximo son 8 MB.', { peso: pesoMB }));
      return;
    }
    setFoto(elegida);
  };

  // `formateador` es opcional: los campos normales guardan lo que se teclea y el DUI, el teléfono y
  // la fecha pasan primero por su máscara.
  const cambiar = (campo, formateador) => (texto) => {
    const valor = formateador ? formateador(texto) : texto;
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: null }));
    if (avisoServidor) setAvisoServidor('');
  };

  const enviar = async () => {
    const encontrados = validarFormulario(valores, REGLAS);
    setErrores(encontrados);

    // Los términos se revisan junto con lo demás y no antes: así quien no llenó nada ve TODO lo que le
    // falta de una vez, en vez de que el formulario le vaya sacando un problema por intento.
    const faltaAceptar = !aceptaTerminos;
    setErrorTerminos(faltaAceptar ? t('Hay que aceptar los términos para crear la cuenta') : '');

    if (!sinErrores(encontrados) || faltaAceptar) return;

    try {
      setCargando(true);
      setAvisoServidor('');

      await registrarCliente({
        ...valores,
        email: valores.email.trim(),
        // Lo que guarda el estado es "DD/MM/AAAA"; lo que espera el backend
        // (y lo que ya manda el <input type="date"> de la web) es ISO.
        fechaNacimiento: fechaISO(valores.fechaNacimiento),
        aceptaTerminos,
        promociones,
        foto,
      });

      // La cuenta todavía no existe: nace cuando vuelva el código del correo.
      alPedirCodigo(valores.email.trim());
    } catch (err) {
      setAvisoServidor(err.message || t('No se pudo completar el registro'));
    } finally {
      setCargando(false);
    }
  };

  // Registrarse con Google. El consentimiento viaja TAMBIÉN por este camino, igual que en la web:
  // sin la casilla de los términos no se molesta al servidor (y el servidor lo vuelve a exigir por
  // su cuenta).
  const conGoogle = async () => {
    if (!aceptaTerminos) {
      setErrorTerminos(t('Marca primero que aceptas los términos y la política de privacidad'));
      return;
    }

    const escritoYValido = (campo) => !!valores[campo] && !REGLAS[campo](valores[campo]);

    try {
      setAvisoServidor('');
      setCargandoGoogle(true);

      await GoogleSignin.hasPlayServices();
      const respuesta = await GoogleSignin.signIn();
      // Cerró el selector de cuenta sin elegir ninguna: no hay nada que avisar.
      if (respuesta.type === 'cancelled') return;

      const idToken = respuesta.data.idToken;
      if (!idToken) {
        setAvisoServidor(t('No se recibió la respuesta de Google'));
        return;
      }

      const res = await googleLoginDB(idToken, {
        aceptaTerminos: true,
        promociones,
        ...(escritoYValido('phoneNumber') ? { phoneNumber: valores.phoneNumber } : {}),
        ...(escritoYValido('fechaNacimiento') ? { fechaNacimiento: fechaISO(valores.fechaNacimiento) } : {}),
        ...(puedeDui && escritoYValido('dui') ? { dui: valores.dui } : {}),
      });
      // Con la sesión puesta, RootNavigator (AuthWatcher) lleva a la tienda.
      login(res.token, res.userType || 'client', res.client);
    } catch (err) {
      setAvisoServidor(err.message || t('No se pudo registrar con Google'));
    } finally {
      setCargandoGoogle(false);
    }
  };

  // El DUI solo se pide cuando la fecha de nacimiento ya dice que es mayor:
  // en El Salvador el DUI se emite a los 18, así que antes no hay ninguno que
  // dar. Mismo criterio que `frontend/src/pages/Register.jsx`.
  const puedeDui = esMayorDeEdad(fechaISO(valores.fechaNacimiento));

  return (
    <View style={estilos.pantalla}>
      <BarraMarca centrado />

      <KeyboardAvoidingView
        style={estilos.flexible}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.cuerpo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={estilos.titulo}>{t('Regístrate')}</Text>

          <CampoTexto
            etiqueta={t('Nombre Completo')}
            icono={User}
            marcador="Juan Pérez"
            valor={valores.fullName}
            alCambiar={cambiar('fullName')}
            error={errores.fullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            siguiente={campos.userName}
            redondo
          />

          <CampoTexto
            etiqueta={t('Nombre de Usuario')}
            icono={User}
            marcador="juanperez99"
            valor={valores.userName}
            alCambiar={cambiar('userName')}
            error={errores.userName}
            autoCapitalize="none"
            autoComplete="username-new"
            textContentType="username"
            ref={campos.userName}
            siguiente={campos.fechaNacimiento}
            redondo
          />

          <CampoTexto
            etiqueta={t('Fecha de Nacimiento')}
            icono={Calendar}
            marcador={t('DD/MM/AAAA')}
            valor={valores.fechaNacimiento}
            alCambiar={cambiar('fechaNacimiento', formatearFecha)}
            error={errores.fechaNacimiento}
            keyboardType="number-pad"
            maxLength={LARGO_FECHA}
            autoComplete="birthdate-full"
            ref={campos.fechaNacimiento}
            siguiente={puedeDui ? campos.dui : campos.phoneNumber}
            redondo
          />

          {/* Igual que en la web: opcional, y solo aparece cuando la fecha de nacimiento ya alcanza para ser
             mayor de edad. */}
          {puedeDui && (
            <CampoTexto
              etiqueta={t('DUI (opcional)')}
              icono={Hash}
              marcador="00000000-0"
              valor={valores.dui}
              alCambiar={cambiar('dui', formatearDui)}
              error={errores.dui}
              keyboardType="number-pad"
              maxLength={LARGO_DUI}
              ref={campos.dui}
              siguiente={campos.phoneNumber}
              redondo
            />
          )}

          <CampoTexto
            etiqueta={t('Teléfono')}
            icono={Phone}
            marcador="7000-0000"
            valor={valores.phoneNumber}
            alCambiar={cambiar('phoneNumber', formatearTelefono)}
            error={errores.phoneNumber}
            keyboardType="phone-pad"
            maxLength={LARGO_TELEFONO}
            autoComplete="tel"
            textContentType="telephoneNumber"
            ref={campos.phoneNumber}
            siguiente={campos.email}
            redondo
          />

          <CampoTexto
            etiqueta={t('Correo Electrónico')}
            icono={Mail}
            marcador="juan@ejemplo.com"
            valor={valores.email}
            alCambiar={cambiar('email')}
            error={errores.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            ref={campos.email}
            siguiente={campos.password}
            redondo
          />

          <CampoTexto
            etiqueta={t('Contraseña')}
            icono={Lock}
            marcador="********"
            valor={valores.password}
            alCambiar={cambiar('password')}
            error={errores.password}
            esContrasena
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            ref={campos.password}
            redondo
          />

          <Text style={estilos.etiquetaFoto}>{t('Foto de Perfil (Opcional)')}</Text>
          <Pressable
            onPress={elegirFoto}
            style={({ pressed }) => [
              estilos.zonaFoto,
              foto && estilos.zonaFotoConImagen,
              pressed && !foto && { borderColor: colores.marca, backgroundColor: colores.marcaSuave },
            ]}
            accessibilityRole="button"
            accessibilityLabel={foto ? t('Cambiar foto de perfil') : t('Subir foto de perfil')}
          >
            {foto ? (
              <>
                <Image source={{ uri: foto.uri }} style={estilos.previewFoto} contentFit="cover" />
                <Pressable
                  onPress={() => setFoto(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('Quitar la foto elegida')}
                  style={estilos.quitarFoto}
                >
                  <Equis size={14} color="#fff" />
                </Pressable>
              </>
            ) : (
              <>
                <Camera size={28} color={COLORES.iconoCampo} />
                <Text style={estilos.textoFoto}>{t('Toca para elegir tu foto')}</Text>
                <Text style={estilos.ayudaFoto}>{t('JPG o PNG, hasta 8 MB')}</Text>
              </>
            )}
          </Pressable>
          {errorFoto ? <Text style={estilos.errorFoto}>{errorFoto}</Text> : null}

          {/* El consentimiento. La casilla y el enlace van en la MISMA fila porque una casilla que no dice
             qué se está aceptando no es un consentimiento: es un trámite. Tocar "los términos" abre el
             documento encima, sin salir del formulario — ir a otra pantalla haría perder todo lo escrito. */}
          <View style={estilos.consentimiento}>
            <View style={estilos.filaTerminos}>
              <Casilla
                marcada={aceptaTerminos}
                alCambiar={(v) => {
                  setAceptaTerminos(v);
                  if (v) setErrorTerminos('');
                }}
                etiqueta={t('He leído y acepto')}
              />
              <Text
                style={[estilos.enlace, { color: colores.marcaTexto }]}
                accessibilityRole="link"
                onPress={() => setVerTerminos('terminos')}
              >
                {t('los términos')}
              </Text>
              <Text style={estilos.textoCasilla}>{t('y la')}</Text>
              <Text
                style={[estilos.enlace, { color: colores.marcaTexto }]}
                accessibilityRole="link"
                onPress={() => setVerTerminos('privacidad')}
              >
                {t('política de privacidad')}
              </Text>
            </View>

            {errorTerminos ? <Text style={estilos.errorTerminos}>{errorTerminos}</Text> : null}

            {/* Opcional de verdad: se puede tener cuenta sin marcarla, y se apaga después desde "Mi cuenta >
               Notificaciones". Los avisos de sus pedidos no dependen de esto, porque esos no son publicidad. */}
            <Casilla
              marcada={promociones}
              alCambiar={setPromociones}
              etiqueta={t('Quiero recibir ofertas y novedades por correo (opcional)')}
            />
          </View>

          {avisoServidor ? (
            <View style={estilos.aviso}>
              <Text style={estilos.avisoTexto}>{avisoServidor}</Text>
            </View>
          ) : null}

          <Boton
            texto={t('Continuar')}
            alPresionar={enviar}
            cargando={cargando}
            deshabilitado={cargandoGoogle}
            estilo={estilos.boton}
            color={colores.marca}
            colorPresionado={colores.marcaOscuro}
          />

          {/* Solo "o", como la web: lo que se hace lo dice el botón de abajo. */}
          <View style={estilos.divisor}>
            <View style={estilos.linea} />
            <Text style={estilos.divisorTexto}>{t('o')}</Text>
            <View style={estilos.linea} />
          </View>

          <BotonGoogle
            texto={t('Registrarse con Google')}
            cargando={cargandoGoogle}
            deshabilitado={cargando}
            alPresionar={conGoogle}
          />

          <Text style={estilos.pie}>
            {t('¿Ya tienes una cuenta?')}{' '}
            <Text style={[estilos.pieEnlace, { color: colores.marcaTexto }]} onPress={irALogin}>
              {t('Iniciar Sesión')}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Encima de todo el formulario, que sigue montado detrás con lo escrito. */}
      {verTerminos && <HojaTerminos clave={verTerminos} alCerrar={() => setVerTerminos(null)} />}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  flexible: {
    flex: 1,
  },
  cuerpo: {
    ...contenidoCentrado,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORES.texto,
    marginBottom: 20,
  },
  etiquetaFoto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.texto,
    marginBottom: 6,
  },
  zonaFoto: {
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  // Con foto, el recuadro deja de ser una zona vacía por rellenar: borde
  // sólido, sin el guionado que solo tiene sentido cuando no hay nada adentro.
  zonaFotoConImagen: {
    borderStyle: 'solid',
    borderColor: COLORES.lineaCard,
  },
  previewFoto: {
    ...StyleSheet.absoluteFillObject,
  },
  quitarFoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorFoto: {
    color: COLORES.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
  },
  textoFoto: {
    fontSize: 13.5,
    color: COLORES.tintaSuave,
    fontWeight: '600',
  },
  ayudaFoto: {
    fontSize: 12,
    color: COLORES.marcador,
  },
  consentimiento: {
    gap: 12,
    marginBottom: 16,
  },
  // La casilla y el enlace en la misma línea, con `flexWrap`: en un teléfono angosto "los términos y
  // el aviso de privacidad" no cabe al lado de "He leído y acepto", y sin el wrap el enlace se
  // cortaba a la mitad.
  filaTerminos: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  enlace: {
    fontSize: 13,
    color: COLORES.marcaTexto,
    fontWeight: '600',
    textDecorationLine: 'underline',
    // Más alto para atinarle con el dedo, sin mover el renglón.
    paddingVertical: 6,
  },
  textoCasilla: {
    fontSize: 13,
    color: COLORES.textoSuave,
  },
  errorTerminos: {
    color: COLORES.error,
    fontSize: 12,
    marginTop: -4,
  },
  aviso: {
    backgroundColor: COLORES.peligroFondo,
    borderWidth: 1,
    borderColor: COLORES.peligroBorde,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  avisoTexto: {
    color: COLORES.peligro,
    fontSize: 13,
    lineHeight: 19,
  },
  boton: {
    marginTop: 10,
    borderRadius: 28,
  },
  // ── Divisor "o", el mismo del inicio de sesión ──
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
    marginTop: 18,
    fontSize: 13,
    color: COLORES.textoTenue,
  },
  pieEnlace: {
    color: COLORES.marcaTexto,
    fontWeight: '600',
  },
});

export default Register;
