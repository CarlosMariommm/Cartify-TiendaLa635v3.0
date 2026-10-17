// CAMPO DE TEXTO — el input de la tienda, en nativo
// En la web cada pantalla vuelve a declarar su `Label`, su `InputWrapper`, su `IconWrapper` y su
// `Input` con styled-components.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useIdioma } from '../../context/IdiomaContext';

const CampoTexto = ({
  etiqueta,
  icono: Icono,
  error,
  valor,
  alCambiar,
  marcador,
  esContrasena = false,
  // Pill redondeada en vez de la esquina de 8 de siempre — la usa el login
  // rediseñado. Opcional para no mover el resto de formularios (Registro,
  // el DUI de ModalConfirmarEdad) que siguen con el campo cuadrado normal.
  redondo = false,
  // El recorrido con el teclado. `siguiente` es la ref del campo que viene: la tecla del teclado
  // dice "Siguiente" y salta ahí sin cerrarse. En el último campo va `alEnviar`: la tecla dice
  // "Listo" y manda el formulario. Sin esto había que cerrar el teclado y tocar cada campo a mano.
  siguiente,
  alEnviar,
  // Se avisan hacia afuera sin pisar el borde de foco de aquí adentro
  // (el login los usa para que Tiqui se tape los ojos en la contraseña).
  onFocus,
  onBlur,
  ...props
}) => {
  const [enfocado, setEnfocado] = useState(false);
  const [verTexto, setVerTexto] = useState(false);
  const { t } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  // El borde de foco se pinta con el color de la temporada, igual que la
  // tienda: en Navidad se enfoca en verde, en Independencia en azul. Fuera de
  // temporada `colores.marca` es el café de siempre.
  const { colores } = useTema();

  // El rojo gana sobre la marca: si el campo está mal, eso es lo que hay que ver.
  const colorBorde = error ? COLORES.error : enfocado ? colores.marca : COLORES.borde;

  const recorrido = siguiente
    ? { returnKeyType: 'next', submitBehavior: 'submit', onSubmitEditing: () => siguiente.current?.focus() }
    : alEnviar
      ? { returnKeyType: 'done', onSubmitEditing: alEnviar }
      : {};

  return (
    <View style={estilos.contenedor}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}

      <View style={estilos.envoltorio}>
        {Icono && (
          <View style={[estilos.icono, redondo && estilos.iconoRedondo]} pointerEvents="none">
            {/* El color se pasa aquí para que los iconos de lucide (que por
                defecto van negros) tomen el mismo gris que la web (#aaa). */}
            <Icono size={18} color={COLORES.iconoCampo} />
          </View>
        )}

        <TextInput
          style={[
            estilos.campo,
            redondo && estilos.campoRedondo,
            { borderColor: colorBorde },
            enfocado && !error && [estilos.campoEnfocado, { shadowColor: colores.marca }],
            esContrasena && estilos.campoConOjo,
            // Un campo apagado (editable={false}) se ve apagado: sin esto parece que se puede escribir y no
            // pasa nada al tocarlo. Lo usa el DUI de Mis datos, que espera a que la fecha de nacimiento diga
            // que ya es mayor de edad.
            props.editable === false && estilos.campoApagado,
          ]}
          value={valor}
          onChangeText={alCambiar}
          placeholder={marcador}
          placeholderTextColor={COLORES.marcador}
          // El teclado de iOS del mismo color que la app.
          keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
          secureTextEntry={esContrasena && !verTexto}
          onFocus={(e) => { setEnfocado(true); onFocus?.(e); }}
          onBlur={(e) => { setEnfocado(false); onBlur?.(e); }}
          // Sin nombre propio, el lector anuncia la etiqueta (o el marcador),
          // y si el campo está mal, dice por qué justo después.
          accessibilityLabel={etiqueta || marcador}
          accessibilityHint={error || undefined}
          {...recorrido}
          {...props}
        />

        {/* El ojo para ver la contraseña. En un teclado de celular, escribir a ciegas una clave con
           mayúsculas y símbolos es la razón número uno de "no me deja entrar"; poder mirarla un segundo
           resuelve más que cualquier mensaje de error. */}
        {esContrasena && (
          <Pressable
            onPress={() => setVerTexto((v) => !v)}
            style={estilos.ojo}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={verTexto ? t('Ocultar contraseña') : t('Mostrar contraseña')}
          >
            {verTexto ? (
              <EyeOff size={17} color={COLORES.tintaTenue} />
            ) : (
              <Eye size={17} color={COLORES.tintaTenue} />
            )}
          </Pressable>
        )}
      </View>

      {/* El error se anuncia solo al aparecer, sin tener que ir a buscarlo. */}
      {error ? (
        <Text style={estilos.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  contenedor: {
    marginBottom: 16,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.texto,
    marginBottom: 8,
  },
  envoltorio: {
    position: 'relative',
    justifyContent: 'center',
  },
  // ── Por qué estos dos llevan `elevation` ──
  // En Android `elevation` decide qué se dibuja encima, y le GANA a `zIndex`.
  icono: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
    elevation: 2,
  },
  campo: {
    width: '100%',
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 44,
    borderWidth: 1.5,
    borderRadius: 8,
    fontSize: 14,
    color: COLORES.texto,
    backgroundColor: COLORES.fondo,
  },
  campoRedondo: {
    borderRadius: 28,
    paddingVertical: 15,
    paddingLeft: 46,
  },
  iconoRedondo: {
    left: 18,
  },
  // El halo café del `:focus` de la web, con la sombra que da Android.
  campoEnfocado: {
    elevation: 1,
    shadowColor: COLORES.marca,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  campoConOjo: {
    paddingRight: 44,
  },
  campoApagado: {
    opacity: 0.6,
    backgroundColor: COLORES.papelGris,
  },
  // El ojo tenía el mismo problema y se notaba más: desaparecía justo al
  // escribir la contraseña, que es cuando se necesita.
  ojo: {
    position: 'absolute',
    right: 14,
    zIndex: 3,
    elevation: 3,
  },
  error: {
    color: COLORES.error,
    fontSize: 12,
    marginTop: 5,
  },
});

export default CampoTexto;
