// REPARTO — los pedidos a domicilio, para quien los lleva (Reparto.js)
// La pantalla del repartidor en la app del personal (la web ya no tiene Reparto: se repartía desde
// Mi Cuenta y se quitó).

import { useRef, useState } from 'react';
import {
  Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bike, MapPin, Navigation, Phone, Radio, Signpost, TriangleAlert } from 'lucide-react-native';
import { CargandoMascota } from '../../components/Tiqui/Mascota';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { hojaCentrada, contenidoCentrado } from '../../theme/pantalla';

const dinero = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }) : '');
const PAGO = { efectivo: 'Paga en efectivo', tarjeta: 'Paga con tarjeta', saldo: 'Pagado con saldo' };

// La ruta en la app de mapas del teléfono, desde donde está el repartidor. En Android va un enlace
// geo: y el teléfono pregunta con cuál abrirlo (Google Maps, Waze, el que tenga); en iPhone, Apple
// Maps. Ahí está la navegación de verdad: voz, tráfico, recalcular.
const abrirRuta = async (pedido) => {
  const hayPunto = pedido.deliveryLat != null && pedido.deliveryLng != null;
  const punto = hayPunto ? `${pedido.deliveryLat},${pedido.deliveryLng}` : '';
  const texto = encodeURIComponent(pedido.deliveryAddress || '');
  const quien = encodeURIComponent(`Entrega a ${pedido.clientId?.fullName || 'cliente'}`);
  const enlace = Platform.OS === 'ios'
    ? `https://maps.apple.com/?daddr=${hayPunto ? punto : texto}`
    : hayPunto ? `geo:${punto}?q=${punto}(${quien})` : `geo:0,0?q=${texto}`;
  try {
    await Linking.openURL(enlace);
  } catch {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${hayPunto ? punto : texto}`).catch(() => {});
  }
};

// "¿Me dice su código?" — la pregunta de la puerta. Si no coincide, el servidor lo dice y la
// ventana se queda abierta para volver a intentar. La salida de emergencia (entregar sin código)
// cuesta escribir por qué, y ese por qué queda guardado en el pedido, igual que en el panel.
const ModalEntrega = ({ pedido, alCerrar, alEntregar }) => {
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();
  const { colores } = useTema();
  const [codigo, setCodigo] = useState('');
  const [sinCodigo, setSinCodigo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [enfocado, setEnfocado] = useState(false);
  const campo = useRef(null);
  // La app va de borde a borde: la ventana se dibuja también detrás de la barra del sistema (en la
  // tablet, la barra de tareas), y ahí quedaba escondido "Marcar entregado".
  const { bottom } = useSafeAreaInsets();

  const tieneCodigo = pedido?.tieneCodigoEntrega !== false;
  const listo = sinCodigo || !tieneCodigo ? true : codigo.length === 4;

  const confirmar = async () => {
    setError('');
    setEnviando(true);
    try {
      const extras = !tieneCodigo ? {}
        : sinCodigo ? { omitirCodigo: true, motivoOmision: motivo.trim() }
        : { codigoEntrega: codigo };
      await alEntregar(extras);
    } catch (e) {
      setError(e?.message || 'No se pudo marcar como entregado.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={alCerrar}>
      <Pressable style={estilos.velo} onPress={alCerrar} accessibilityLabel="Cerrar" />
      <View style={[estilos.hoja, { paddingBottom: 30 + bottom }]}>
        <Text style={estilos.hojaTitulo} accessibilityRole="header">
          Entregar el pedido #{String(pedido._id).slice(-6).toUpperCase()}
        </Text>
        {!tieneCodigo ? (
          <Text style={estilos.hojaTexto}>Este pedido es de antes de los códigos de entrega: se entrega sin pedirlo.</Text>
        ) : !sinCodigo ? (
          <>
            <Text style={estilos.hojaTexto}>Pídale al cliente los 4 dígitos que ve en su pedido.</Text>
            {/* Cuatro casillas subrayadas, una por dígito, como el código que ve el cliente. El campo de verdad
               sigue ahí (lo que se escribe y lo que lee el lector de pantalla), invisible encima de las
               casillas: tocarlas abre el teclado. */}
            <Pressable style={estilos.casillas} onPress={() => campo.current?.focus()} accessible={false}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    estilos.casilla,
                    { borderBottomColor: enfocado && i === Math.min(codigo.length, 3) ? colores.marca : COLORES.borde },
                  ]}
                >
                  <Text style={estilos.digito}>{codigo[i] || ''}</Text>
                </View>
              ))}
              <TextInput
                ref={campo}
                value={codigo}
                onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 4))}
                onFocus={() => setEnfocado(true)}
                onBlur={() => setEnfocado(false)}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                caretHidden
                contextMenuHidden
                accessibilityLabel="Código de entrega de 4 dígitos"
                style={estilos.codigoInvisible}
              />
            </Pressable>
            <Text style={[estilos.enlace, { color: colores.marcaTexto }]} onPress={() => setSinCodigo(true)} accessibilityRole="button">
              El cliente no tiene el código
            </Text>
          </>
        ) : (
          <>
            <Text style={estilos.hojaTexto}>Escriba por qué se entrega sin código. Queda guardado en el pedido.</Text>
            <TextInput
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Por ejemplo: se le descargó el teléfono"
              placeholderTextColor={COLORES.textoTenue}
              accessibilityLabel="Por qué se entrega sin código"
              style={estilos.motivo}
              maxLength={200}
              multiline
            />
            <Text style={[estilos.enlace, { color: colores.marcaTexto }]} onPress={() => setSinCodigo(false)} accessibilityRole="button">
              Mejor pedir el código
            </Text>
          </>
        )}

        {error ? <Text style={estilos.hojaError} accessibilityLiveRegion="polite">{error}</Text> : null}

        <Pressable
          onPress={confirmar}
          disabled={!listo || enviando || (sinCodigo && motivo.trim().length < 4)}
          accessibilityRole="button"
          style={({ pressed }) => [
            estilos.botonPrincipal,
            { backgroundColor: COLORES.exitoVivo },
            (!listo || enviando || (sinCodigo && motivo.trim().length < 4)) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={estilos.botonPrincipalTexto}>{enviando ? 'Marcando…' : 'Marcar entregado'}</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const Reparto = ({ reparto }) => {
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();
  const { colores } = useTema();
  const [aEntregar, setAEntregar] = useState(null);
  const [recargando, setRecargando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const {
    pedidos, cargando, error, moviendo, recargar, avanzar, salirEnCamino, entregar,
    enViaje, errorGps, vaEnViaje, empezarViaje, quitarDelViaje,
  } = reparto;

  const hacer = async (fn) => {
    setErrorAccion('');
    try { await fn(); } catch (e) { setErrorAccion(e?.message || 'No se pudo actualizar el pedido.'); }
  };

  const alJalar = async () => {
    setRecargando(true);
    await recargar();
    setRecargando(false);
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        contentContainerStyle={estilos.cuerpo}
        refreshControl={<RefreshControl refreshing={recargando} onRefresh={alJalar} colors={[colores.marca]} tintColor={colores.marca} />}
      >
        <Text style={estilos.titulo} accessibilityRole="header">Reparto</Text>
        <Text style={estilos.bajada}>Pedidos a domicilio que faltan por entregar.</Text>

        {/* Mientras se comparte la ubicación se dice grande y sin rodeos: es la ubicación de una persona, y
           nadie debería enterarse por casualidad de que su teléfono estuvo transmitiendo. */}
        {enViaje.length > 0 && (
          <View style={[estilos.aviso, { backgroundColor: COLORES.infoFondo, borderColor: COLORES.infoBorde }]} accessibilityLiveRegion="polite">
            <Radio size={20} color={COLORES.infoVivo} strokeWidth={2} />
            <View style={estilos.flexible}>
              <Text style={[estilos.avisoTitulo, { color: COLORES.infoTexto }]}>
                Compartiendo su ubicación · {enViaje.length} {enViaje.length === 1 ? 'pedido' : 'pedidos'}
              </Text>
              <Text style={[estilos.avisoTexto, { color: COLORES.infoSuave }]}>
                La pantalla se queda encendida mientras dure el viaje. Deje la app abierta: si la cierra, el cliente deja de verlo avanzar.
              </Text>
            </View>
          </View>
        )}

        {errorGps || error || errorAccion ? (
          <View style={[estilos.aviso, { backgroundColor: COLORES.avisoFondo, borderColor: COLORES.avisoBorde }]} accessibilityLiveRegion="polite">
            <TriangleAlert size={20} color={COLORES.avisoVivo} strokeWidth={2} />
            <Text style={[estilos.avisoTexto, estilos.flexible, { color: COLORES.avisoTexto }]}>{errorAccion || errorGps || error}</Text>
          </View>
        ) : null}

        {cargando ? (
          <CargandoMascota texto="Cargando los pedidos…" />
        ) : pedidos.length === 0 ? (
          <View style={estilos.vacio}>
            <Text style={estilos.vacioTitulo}>No hay entregas pendientes</Text>
            <Text style={estilos.bajada}>Cuando entre un pedido a domicilio, aparecerá aquí. Jale hacia abajo para revisar.</Text>
          </View>
        ) : (
          pedidos.map((p, i) => {
            const hayPunto = p.deliveryLat != null && p.deliveryLng != null;
            const compartiendo = vaEnViaje(p._id);
            const ocupado = moviendo === p._id;
            const estado = p.status === 'en_camino'
              ? { texto: 'En camino', fondo: COLORES.infoFondo, color: COLORES.infoVivo }
              : p.status === 'preparando'
                ? { texto: 'Preparando', fondo: COLORES.avisoFondo, color: COLORES.avisoVivo }
                : { texto: 'Por preparar', fondo: COLORES.infoFondo, color: COLORES.infoVivo };
            return (
              <View key={p._id} style={[estilos.pedido, i > 0 && estilos.separador]}>
                <View style={estilos.fila}>
                  <View style={estilos.flexible}>
                    <Text style={estilos.cliente}>{p.clientId?.fullName || 'Cliente'}</Text>
                    <Text style={estilos.detalle}>
                      #{String(p._id).slice(-6).toUpperCase()} · {p.items?.length || 0} {(p.items?.length || 0) === 1 ? 'producto' : 'productos'} · {dinero(p.total)}
                    </Text>
                  </View>
                  <View style={[estilos.chip, { backgroundColor: estado.fondo }]}>
                    <Text style={[estilos.chipTexto, { color: estado.color }]}>{estado.texto}</Text>
                  </View>
                </View>

                <View style={estilos.linea}>
                  <MapPin size={16} color={colores.marca} strokeWidth={2} />
                  <Text style={[estilos.lineaTexto, estilos.flexible]}>{p.deliveryAddress || 'Sin dirección escrita'}</Text>
                </View>
                {p.deliveryReference ? (
                  <View style={estilos.linea}>
                    <Signpost size={16} color={COLORES.textoTenue} strokeWidth={2} />
                    <Text style={[estilos.lineaSuave, estilos.flexible]}>{p.deliveryReference}</Text>
                  </View>
                ) : null}
                {p.clientId?.phoneNumber ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${p.clientId.phoneNumber}`)} accessibilityRole="link" style={estilos.linea}>
                    <Phone size={16} color={colores.marca} strokeWidth={2} />
                    <Text style={[estilos.lineaTexto, { color: colores.marcaTexto, fontWeight: '700' }]}>{p.clientId.phoneNumber}</Text>
                  </Pressable>
                ) : null}
                <Text style={estilos.lineaSuave}>
                  {PAGO[p.paymentMethod] || 'Pago al entregar'}
                  {p.preparedAt ? ` · Preparado a las ${hora(p.preparedAt)}${p.preparedBy ? ` por ${p.preparedBy}` : ''}` : ''}
                </Text>

                <View style={estilos.botones}>
                  <Pressable
                    onPress={() => abrirRuta(p)}
                    accessibilityRole="button"
                    style={({ pressed }) => [estilos.boton, { backgroundColor: pressed ? colores.marcaOscuro : colores.marca }]}
                  >
                    <Navigation size={17} color={COLORES.sobreMarca} strokeWidth={2.2} />
                    <Text style={estilos.botonTextoClaro}>Cómo llegar</Text>
                  </Pressable>

                  {p.status === 'pagado' && (
                    <Pressable
                      onPress={() => hacer(() => avanzar(p, 'preparando'))}
                      disabled={ocupado}
                      accessibilityRole="button"
                      style={({ pressed }) => [estilos.boton, estilos.botonBorde, pressed && { backgroundColor: COLORES.papelGris }, ocupado && { opacity: 0.6 }]}
                    >
                      <Text style={estilos.botonTexto}>{ocupado ? 'Marcando…' : 'Empezar a preparar'}</Text>
                    </Pressable>
                  )}
                  {p.status === 'preparando' && (
                    <Pressable
                      onPress={() => hacer(() => salirEnCamino(p))}
                      disabled={ocupado}
                      accessibilityRole="button"
                      style={({ pressed }) => [estilos.boton, estilos.botonBorde, { borderColor: COLORES.infoVivo }, pressed && { backgroundColor: COLORES.infoFondo }, ocupado && { opacity: 0.6 }]}
                    >
                      <Bike size={17} color={COLORES.infoVivo} strokeWidth={2.2} />
                      <Text style={[estilos.botonTexto, { color: COLORES.infoVivo }]}>{ocupado ? 'Marcando…' : 'Salí a repartir'}</Text>
                    </Pressable>
                  )}
                  {p.status === 'en_camino' && (
                    <Pressable
                      onPress={() => setAEntregar(p)}
                      disabled={ocupado}
                      accessibilityRole="button"
                      style={({ pressed }) => [estilos.boton, estilos.botonBorde, { borderColor: COLORES.exitoVivo }, pressed && { backgroundColor: COLORES.exitoFondo }, ocupado && { opacity: 0.6 }]}
                    >
                      <Text style={[estilos.botonTexto, { color: COLORES.exitoVivo }]}>{ocupado ? 'Marcando…' : 'Marcar entregado'}</Text>
                    </Pressable>
                  )}
                </View>

                {/* Compartir a mano queda de respaldo: para cuando el GPS falló al salir, o para pausarlo. Salir ya
                   lo enciende solo. */}
                {hayPunto && p.status === 'en_camino' && (
                  <Pressable
                    onPress={() => (compartiendo ? quitarDelViaje(p._id) : empezarViaje(p._id))}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      estilos.boton, estilos.botonBorde, estilos.botonAncho,
                      compartiendo && { borderColor: COLORES.infoVivo, backgroundColor: COLORES.infoFondo },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Radio size={17} color={compartiendo ? COLORES.infoVivo : COLORES.tituloFuerte} strokeWidth={2} />
                    <Text style={[estilos.botonTexto, compartiendo && { color: COLORES.infoVivo }]}>
                      {compartiendo ? 'Dejar de compartir' : 'Volver a compartir ubicación'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {aEntregar && (
        <ModalEntrega
          key={aEntregar._id}
          pedido={aEntregar}
          alCerrar={() => setAEntregar(null)}
          alEntregar={async (extras) => {
            await entregar(aEntregar, extras);
            setAEntregar(null);
          }}
        />
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  flexible: { flex: 1 },
  cuerpo: { ...contenidoCentrado, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: '800', color: COLORES.tituloFuerte, letterSpacing: -0.4 },
  bajada: { fontSize: 14, lineHeight: 20, color: COLORES.textoSuave, marginTop: 2, marginBottom: 14 },
  aviso: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14,
  },
  avisoTitulo: { fontSize: 14, fontWeight: '800' },
  avisoTexto: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  vacio: { alignItems: 'center', paddingVertical: 40 },
  vacioTitulo: { fontSize: 16, fontWeight: '800', color: COLORES.tituloFuerte, marginBottom: 4 },
  pedido: { paddingVertical: 16 },
  separador: { borderTopWidth: 1, borderTopColor: COLORES.linea },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cliente: { fontSize: 16, fontWeight: '800', color: COLORES.tituloFuerte },
  detalle: { fontSize: 13, color: COLORES.textoTenue, marginTop: 2 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipTexto: { fontSize: 12, fontWeight: '800' },
  linea: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  lineaTexto: { fontSize: 14.5, lineHeight: 20, color: COLORES.tituloFuerte },
  lineaSuave: { fontSize: 13, lineHeight: 18, color: COLORES.textoSuave, marginTop: 4 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  boton: {
    flexGrow: 1, minHeight: 46, borderRadius: 999, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  botonBorde: { borderWidth: 1.5, borderColor: COLORES.borde, backgroundColor: COLORES.fondo },
  botonAncho: { marginTop: 10 },
  botonTexto: { fontSize: 14.5, fontWeight: '800', color: COLORES.tituloFuerte },
  // Encima de la marca: blanco, salvo con las paletas oscuras del panel.
  botonTextoClaro: { fontSize: 14.5, fontWeight: '800', color: COLORES.sobreMarca },

  // ── La ventana del código ──
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: {
    ...hojaCentrada,
    backgroundColor: COLORES.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30, gap: 10,
  },
  hojaTitulo: { fontSize: 19, fontWeight: '800', color: COLORES.tituloFuerte },
  hojaTexto: { fontSize: 14.5, lineHeight: 21, color: COLORES.textoSuave },
  casillas: { flexDirection: 'row', justifyContent: 'center', gap: 14, paddingVertical: 6 },
  casilla: { width: 52, height: 62, alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: 3, paddingBottom: 6 },
  digito: { fontSize: 34, fontWeight: '800', color: COLORES.tituloFuerte, includeFontPadding: false },
  // Encima de las casillas y transparente: recibe lo que se escribe, no se ve.
  codigoInvisible: { ...StyleSheet.absoluteFillObject, opacity: 0.01, color: 'transparent' },
  motivo: {
    minHeight: 80, fontSize: 15, color: COLORES.tituloFuerte, textAlignVertical: 'top',
    borderWidth: 1.5, borderColor: COLORES.borde, borderRadius: 14, padding: 12,
  },
  enlace: { fontSize: 14, fontWeight: '700', paddingVertical: 4 },
  hojaError: { fontSize: 13.5, color: COLORES.peligro },
  botonPrincipal: { minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  botonPrincipalTexto: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});

export default Reparto;
