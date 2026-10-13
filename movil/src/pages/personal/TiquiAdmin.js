/*
 * ============================================================
 * TIQUI DEL PANEL EN EL TELÉFONO — solo el administrador (TiquiAdmin.js)
 * ============================================================
 * La asistente del equipo: se le pregunta cómo va la tienda y se le piden
 * cambios ("pasa el pedido 88D230 a listo", "llegaron 20 leches", "apaga la
 * promo del 2x1"); ella propone y el administrador confirma. Es una de las dos
 * secciones del modo personal (la otra es el Reparto); el empleado no la ve.
 * Ver ModoPersonal, que pone el encabezado y el botón de salir.
 *
 * Solo pinta. La conversación vive en useTiquiAdmin; la sesión, en PersonalContext.
 * ============================================================
 */

import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SendHorizontal, Volume2, VolumeX } from 'lucide-react-native';
import TiquiColgada from '../../components/Tiqui/TiquiColgada';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useTiquiAdmin } from '../../hooks/useTiquiAdmin';
import { contenidoCentrado } from '../../theme/pantalla';

// Por dónde empezar, para quien no sabe qué pedirle.
const SUGERENCIAS = ['¿Cómo vamos hoy?', '¿Qué pedidos esperan?', '¿Qué tengo que pedir esta semana?', '¿Cuánto les debemos a los proveedores?'];

const TiquiAdmin = () => {
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();
  const { colores } = useTema();
  const { bottom } = useSafeAreaInsets();
  const t = useTiquiAdmin();
  const [texto, setTexto] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    chatRef.current?.scrollToEnd({ animated: true });
  }, [t.mensajes, t.pendiente]);

  const dormida = !t.activo && !t.pensando && !t.hablando;
  const cara = dormida ? 'dormida' : t.escuchando ? 'escucha' : t.pensando ? 'piensa' : t.hablando ? 'habla' : 'normal';
  const estadoTexto = t.pensando ? 'Pensando…'
    : t.hablando ? 'Tócala para interrumpirla'
    : t.escuchando ? 'Te escucho…'
    : dormida ? 'Despierta a Tiqui para hablar con ella' : 'Un momento…';
  const etiquetaToque = t.hablando ? 'Interrumpir a Tiqui y hablar'
    : t.escuchando ? 'Dejar de escuchar' : 'Despertar a Tiqui para hablar con ella';

  const enviar = () => {
    if (!texto.trim()) return;
    t.escribir(texto);
    setTexto('');
  };

  const conCharla = t.mensajes.length > 0;

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity
        onPress={t.alternarVoz}
        accessibilityRole="button"
        accessibilityLabel={t.muteada ? 'Que Tiqui hable en voz alta' : 'Que Tiqui conteste sin voz'}
        hitSlop={8}
        style={estilos.voz}
      >
        {t.muteada
          ? <VolumeX size={22} color={COLORES.textoSuave} strokeWidth={1.8} />
          : <Volume2 size={22} color={colores.marca} strokeWidth={1.8} />}
      </TouchableOpacity>

      <ScrollView
        ref={chatRef}
        style={estilos.flexible}
        contentContainerStyle={estilos.cuerpo}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tiqui colgando: tocarla la despierta, la interrumpe o la duerme. */}
        <Pressable
          onPress={t.tocar}
          accessibilityRole="button"
          accessibilityLabel={etiquetaToque}
          hitSlop={12}
          style={({ pressed }) => [estilos.tiqui, pressed && { opacity: 0.85 }]}
        >
          <TiquiColgada cara={cara} alto={conCharla ? 150 : 230} largo={conCharla ? 60 : 130} />
        </Pressable>

        <Text
          style={[estilos.estado, { color: dormida ? COLORES.tituloFuerte : colores.marcaTexto }]}
          accessibilityLiveRegion="polite"
        >
          {estadoTexto}
        </Text>

        {t.escuchando && t.transcripcion ? (
          <Text style={estilos.transcripcion} numberOfLines={2}>…{t.transcripcion}</Text>
        ) : null}

        {!conCharla ? (
          <>
            <Text style={estilos.bajada}>
              Pregúntame cómo va la tienda o pídeme un cambio: “pasa el pedido 88D230 a listo”, “llegaron 20 leches”, “apaga la promo del 2x1”. Antes de cambiar algo, te pregunto.
            </Text>
            <View style={estilos.sugerencias}>
              {SUGERENCIAS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => t.escribir(s)}
                  accessibilityRole="button"
                  style={({ pressed }) => [estilos.sugerencia, { borderColor: colores.marcaSuave }, pressed && { backgroundColor: colores.marcaTenue }]}
                >
                  <Text style={[estilos.sugerenciaTexto, { color: colores.marcaTexto }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={estilos.chat}>
            {t.mensajes.map((m) => (
              <View
                key={m.id}
                style={[
                  estilos.burbuja,
                  m.quien === 'persona'
                    ? { alignSelf: 'flex-end', backgroundColor: colores.marca }
                    : { alignSelf: 'flex-start', backgroundColor: COLORES.papelGris },
                ]}
              >
                <Text style={[estilos.burbujaTexto, m.quien === 'persona' && { color: COLORES.sobreMarca }]}>{m.texto}</Text>
              </View>
            ))}

            {/* Tiqui propuso un cambio: nada se hace sin esto. */}
            {t.pendiente && !t.pensando ? (
              <View style={estilos.confirmar} accessibilityLabel="Confirmar el cambio">
                <Pressable
                  onPress={t.descartar}
                  accessibilityRole="button"
                  style={({ pressed }) => [estilos.botonNo, pressed && { backgroundColor: COLORES.papelGris }]}
                >
                  <Text style={estilos.botonNoTexto}>No</Text>
                </Pressable>
                <Pressable
                  onPress={t.confirmar}
                  accessibilityRole="button"
                  style={({ pressed }) => [estilos.botonSi, { backgroundColor: pressed ? colores.marcaOscuro : colores.marca }]}
                >
                  <Text style={estilos.botonSiTexto}>Sí, hazlo</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Escribirle, en vez de hablarle. */}
      <View style={[estilos.escribir, { paddingBottom: 10 + bottom }]}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escríbele a Tiqui…"
          placeholderTextColor={COLORES.textoTenue}
          accessibilityLabel="Escríbele a Tiqui"
          style={estilos.campo}
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={enviar}
        />
        <Pressable
          onPress={enviar}
          disabled={!texto.trim() || t.pensando}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          style={({ pressed }) => [
            estilos.enviar,
            { backgroundColor: pressed ? colores.marcaOscuro : colores.marca },
            (!texto.trim() || t.pensando) && { opacity: 0.5 },
          ]}
        >
          <SendHorizontal size={19} color={COLORES.sobreMarca} strokeWidth={2.2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  flexible: { flex: 1 },
  // Arriba a la derecha, encima de la charla: 44 × 44 para atinarle con el pulgar.
  voz: {
    position: 'absolute', top: 6, right: 10, zIndex: 2,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  cuerpo: { ...contenidoCentrado, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  tiqui: { marginBottom: 6 },
  estado: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  transcripcion: { fontSize: 14, fontStyle: 'italic', color: COLORES.textoSuave, textAlign: 'center', marginBottom: 8 },
  bajada: { fontSize: 14.5, lineHeight: 22, color: COLORES.textoSuave, textAlign: 'center', marginTop: 6 },
  sugerencias: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  sugerencia: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  sugerenciaTexto: { fontSize: 13.5, fontWeight: '700' },
  chat: { width: '100%', gap: 8, marginTop: 8 },
  burbuja: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  burbujaTexto: { fontSize: 14.5, lineHeight: 20, color: COLORES.tituloFuerte },
  confirmar: { flexDirection: 'row', gap: 10, alignSelf: 'flex-start', marginTop: 2 },
  botonNo: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonNoTexto: { fontSize: 15, fontWeight: '700', color: COLORES.tituloFuerte },
  botonSi: { minHeight: 44, paddingHorizontal: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  botonSiTexto: { fontSize: 15, fontWeight: '800', color: COLORES.sobreMarca },
  escribir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
    backgroundColor: COLORES.fondo,
  },
  campo: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORES.tituloFuerte,
    backgroundColor: COLORES.fondo,
  },
  enviar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});

export default TiquiAdmin;
