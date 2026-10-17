// VERIFICACIÓN — el código que llega al correo
// La versión móvil de `Verification.jsx`, recortada al único flujo que la app tiene hoy: terminar
// un registro.

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import BarraMarca from '../components/UI/BarraMarca';
import Boton from '../components/UI/Boton';
import { useTema } from '../context/TemaContext';
import { useColores, useEstilos } from '../context/ModoContext';
import { verificarCodigoCorreo } from '../api/authApi';
import { useIdioma } from '../context/IdiomaContext';
import { contenidoCentrado } from '../theme/pantalla';

const LARGO = 6;

// ── Por qué UN input y no seis ──
// Lo natural es poner seis campos de un caracter y mover el foco solo.
const Verification = ({ correo, alVerificar, alVolver }) => {
  const { t } = useIdioma();
  // La paleta de la temporada, para que las casillas del código y el botón
  // sigan el mismo color que la tienda. Fuera de temporada es el café de siempre.
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const campo = useRef(null);

  const escribir = (texto) => {
    setCodigo(texto.replace(/\s/g, '').slice(0, LARGO));
    setError('');
  };

  const verificar = async () => {
    if (codigo.length !== LARGO) {
      setError(t('Ingresa el código de {n} caracteres', { n: LARGO }));
      return;
    }

    try {
      setCargando(true);
      setError('');
      await verificarCodigoCorreo(codigo);
      alVerificar();
    } catch (err) {
      setError(err.message || t('El código no es válido o ya venció.'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <BarraMarca centrado />

      <View style={estilos.cuerpo}>
        <Pressable onPress={alVolver} hitSlop={12} style={estilos.volver} accessibilityRole="button" accessibilityLabel={t('Volver')}>
          <Text style={estilos.flechaVolver}>←</Text>
        </Pressable>

        <Text style={estilos.titulo}>{t('Ingresa el código de verificación')}</Text>

        <View style={estilos.caja}>
          <Text style={estilos.info}>
            {t('Te enviamos un código a')}{' '}
            <Text style={estilos.correo}>{correo || t('tu correo')}</Text>
          </Text>

          {/* Tocar cualquier casilla abre el teclado sobre el campo de verdad. Para el lector de pantalla las
             casillas no existen (son dibujo): el que se anuncia es el campo escondido, con su nombre y lo
             que va escrito. Por eso el Pressable no se agrupa como un solo elemento. */}
          <Pressable style={estilos.casillas} onPress={() => campo.current?.focus()} accessible={false}>
            {Array.from({ length: LARGO }, (_, indice) => (
              <View
                key={indice}
                style={[
                  estilos.casilla,
                  codigo[indice] && [estilos.casillaLlena, { borderColor: colores.marca }],
                  // La casilla que sigue se marca, para saber dónde va uno.
                  indice === codigo.length && [
                    estilos.casillaActiva,
                    { borderColor: colores.marca, backgroundColor: colores.marcaSuave },
                  ],
                ]}
              >
                <Text style={estilos.caracter}>{codigo[indice] || ''}</Text>
              </View>
            ))}

            <TextInput
              ref={campo}
              style={estilos.campoOculto}
              value={codigo}
              onChangeText={escribir}
              maxLength={LARGO}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              caretHidden
              accessibilityLabel={t('Código de verificación, {n} caracteres', { n: LARGO })}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
            />
          </Pressable>
        </View>

        {error ? <Text style={estilos.error}>{error}</Text> : null}

        <Boton
          texto={t('Verificar')}
          alPresionar={verificar}
          cargando={cargando}
          color={colores.marca}
          colorPresionado={colores.marcaOscuro}
        />

        <Text style={estilos.ayuda}>
          {t('El código vence a los 15 minutos. Si ya venció, vuelve a registrarte.')}
        </Text>
      </View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  cuerpo: {
    ...contenidoCentrado,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  volver: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  flechaVolver: {
    fontSize: 24,
    color: COLORES.texto,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORES.texto,
    marginBottom: 16,
  },
  caja: {
    backgroundColor: COLORES.papelSuave,
    borderWidth: 1,
    borderColor: COLORES.linea,
    borderRadius: 10,
    padding: 18,
    marginBottom: 20,
  },
  info: {
    fontSize: 13,
    color: COLORES.textoTenue,
    lineHeight: 20,
    marginBottom: 14,
  },
  correo: {
    fontWeight: '700',
    color: COLORES.tinta,
  },
  casillas: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  casilla: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    borderRadius: 8,
    backgroundColor: COLORES.fondo,
  },
  casillaLlena: {
    borderColor: COLORES.marca,
  },
  casillaActiva: {
    borderColor: COLORES.marca,
    backgroundColor: COLORES.marcaSuave,
  },
  caracter: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORES.texto,
  },
  // El campo de verdad: cubre la fila de casillas para que el toque caiga en él, pero no se ve. No
  // se usa `display: none` ni `width: 0` porque un campo sin tamaño no siempre recibe el foco en
  // Android.
  campoOculto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 54,
    opacity: 0,
    color: 'transparent',
  },
  error: {
    color: COLORES.error,
    fontSize: 13,
    marginBottom: 12,
  },
  ayuda: {
    fontSize: 12.5,
    color: COLORES.textoTenue,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 19,
  },
});

export default Verification;
