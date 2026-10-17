// ASISTENTE POR VOZ — el apartado, ahora de verdad
// Reemplaza al placeholder ("Todavía no está disponible"). La lógica vive en useAsistenteVoz; aquí
// solo se pinta.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HelpCircle, Volume2, VolumeX } from 'lucide-react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import TiquiColgada from '../components/Tiqui/TiquiColgada';
import { LLAVE_TIQUI_PRESENTADO } from './ConoceATiqui';
import { leer } from '../utils/almacen';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { useTema } from '../context/TemaContext';
import { useTienda } from '../context/TiendaContext';
import { useAsistenteVoz } from '../hooks/useAsistenteVoz';
import { useAuth } from '../hooks/useAuth';
import { primerNombre } from '../utils/nombreTiqui';
import { navegarA } from '../navigation/navigationRef';
import ModalProducto from '../components/Tienda/ModalProducto';
import { AIRE_ABAJO_MINIMO, ALTURA_BARRA_FLOTANTE } from '../components/UI/BarraInferior';
import { useIdioma } from '../context/IdiomaContext';

const Asistente = () => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { bottom } = useSafeAreaInsets();
  const {
    productos, carrito, totalCarrito, agregarAlCarrito, eliminarDelCarrito, actualizarCantidad, limpiarCarrito,
    setCategoriaSeleccionada, setTerminoBusqueda, setPromoSeleccionada,
  } = useTienda();
  // Lo que pidió VER por voz ("muéstrame las manzanas"), no lo que agregó. Aquí SÍ sigue siendo una
  // hoja y no la página del producto: la persona está hablando con Tiqui, y cambiar de pantalla le
  // cortaría la charla.
  const [productoAbierto, setProductoAbierto] = useState(null);

  // La bienvenida escrita saluda por el nombre más o menos la mitad de las veces que se entra:
  // siempre igual se vuelve fórmula. Ver nombreTiqui.js.
  const { user } = useAuth();
  const nombre = user?.type === 'client' ? primerNombre(user?.fullName) : '';
  const [saludaConNombre] = useState(() => Math.random() < 0.5);

  // La lleva Tiqui a otra pantalla (las promociones): ahí sigue escuchando.
  const saleConTiquiRef = useRef(false);

  const {
    activo, escuchando, muteado, transcripcion, historial, pensando, hablando, esperandoVoz,
    iniciar, detener, toggleMute, interrumpir, pausar, reanudar,
  } = useAsistenteVoz({
    productos, carrito, totalCarrito, agregarAlCarrito, eliminarDelCarrito, actualizarCantidad, limpiarCarrito,
    mostrarProducto: setProductoAbierto,
    // "Las promociones": se cierra la ficha que estaba abierta (antes se quedaba encima) y se va a la
    // tienda sin filtros, donde está el carrusel de promociones.
    irAPromociones: () => {
      setProductoAbierto(null);
      setPromoSeleccionada?.(null);
      setCategoriaSeleccionada?.(null);
      setTerminoBusqueda?.('');
      saleConTiquiRef.current = true;
      navegarA('Tabs', { screen: 'inicio' });
    },
  });

  // Si la persona se va por su cuenta de esta pantalla (otra pestaña, el carrito, la presentación),
  // Tiqui deja de escuchar pero sigue despierta, y al volver retoma sola. Si la llevó Tiqui
  // ("enséñame las promociones"), la charla sigue: le están hablando a ella.
  useFocusEffect(
    useCallback(() => {
      reanudar();
      return () => {
        if (saleConTiquiRef.current) saleConTiquiRef.current = false;
        else pausar();
      };
    }, [pausar, reanudar])
  );

  const chatRef = useRef(null);

  // La primera vez que se entra aquí, Tiqui se presenta sola (ConoceATiqui). Es lo que distingue a
  // la tienda: no se deja a que alguien la descubra por casualidad. Después se puede volver a ver
  // con "¿Quién es Tiqui?".
  useEffect(() => {
    let vivo = true;
    leer(LLAVE_TIQUI_PRESENTADO).then((visto) => {
      if (vivo && visto !== '1') navegarA('ConoceATiqui');
    });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollToEnd({ animated: true });
  }, [historial]);

  const items = carrito.reduce((a, i) => a + i.cantidad, 0);

  // Tiqui ES el botón. Ya no hay micrófono: se le habla a ella. Mientras nadie le habla, duerme
  // colgada de su cordón; tocarla la despierta y se pone a escuchar, y lo próximo que dice lo dice
  // recién despertada.
  const dormida = !activo && !pensando && !hablando;
  // Con la respuesta lista pero su voz en camino, todavía piensa: el mensaje
  // y la boca arrancan junto con el sonido.
  const piensa = pensando || esperandoVoz;
  const estadoTexto = piensa
    ? t('Pensando…')
    : hablando ? t('Tócala para interrumpirla')
    : dormida ? t('Despierta a Tiqui para empezar a hablar con ella')
    : escuchando ? t('Te escucho…') : t('Un momento…');
  const etiquetaToque = hablando
    ? t('Interrumpir a Tiqui y hablar')
    : dormida ? t('Despertar a Tiqui para hablar con ella')
    : t('Dormir a Tiqui y dejar de escuchar');

  const alTocarTiqui = hablando ? interrumpir : activo ? detener : iniciar;

  // Su cara dice lo mismo que el texto de estado, sin tener que leerlo.
  const cara = dormida ? 'dormida' : escuchando ? 'escucha' : piensa ? 'piensa' : hablando ? 'habla' : 'normal';
  // Mientras habla, su cara va con el ánimo de lo que dice (el mismo de su voz).
  const animoHablando = hablando ? [...historial].reverse().find((m) => m.tipo === 'bot')?.animo : undefined;
  // El mensaje que espera su voz no se muestra todavía (ver esperandoVoz).
  const mensajes = esperandoVoz && historial[historial.length - 1]?.tipo === 'bot' ? historial.slice(0, -1) : historial;

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <Text style={estilos.titulo} accessibilityRole="header">{t('Tiqui, tu asistente')}</Text>
        <View style={estilos.acciones}>
          <TouchableOpacity
            onPress={() => navegarA('ConoceATiqui')}
            accessibilityRole="button"
            accessibilityLabel={t('¿Quién es Tiqui? Ver la presentación')}
            hitSlop={8}
            style={estilos.accion}
          >
            <HelpCircle size={22} color={colores.marca} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleMute}
            accessibilityRole="button"
            accessibilityLabel={muteado ? t('Activar voz') : t('Silenciar voz')}
            hitSlop={8}
            style={estilos.accion}
          >
            {muteado
              ? <VolumeX size={22} color={COLORES.textoSuave} strokeWidth={1.8} />
              : <Volume2 size={22} color={colores.marca} strokeWidth={1.8} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={estilos.cuerpo}>
        {/* Tiqui colgando del borde de arriba, agarrada con su broche. Más chica cuando ya hay charla, para
           dejarle lugar al chat. */}
        <Pressable
          onPress={alTocarTiqui}
          accessibilityRole="button"
          accessibilityLabel={etiquetaToque}
          hitSlop={12}
          style={({ pressed }) => [estilos.tiqui, pressed && { opacity: 0.85 }]}
        >
          <TiquiColgada cara={cara} animo={animoHablando} alto={historial.length === 0 ? 250 : 170} largo={historial.length === 0 ? 170 : 110} />
        </Pressable>

        <Text
          style={[estilos.estado, { color: dormida ? COLORES.tituloFuerte : colores.marcaTexto }]}
          accessibilityLiveRegion="polite"
        >
          {estadoTexto}
        </Text>

        {escuchando && transcripcion ? (
          <Text style={estilos.transcripcion} numberOfLines={2}>…{transcripcion}</Text>
        ) : null}

        {historial.length === 0 ? (
          <Text style={estilos.bajada}>
            {saludaConNombre && nombre ? t('¡Hola, {nombre}! ', { nombre }) : ''}
            {t('Tócala y dile, por ejemplo: "quiero dos manzanas y una leche" o "¿qué ofertas hay?".')}
          </Text>
        ) : (
          <ScrollView ref={chatRef} style={estilos.chat} contentContainerStyle={estilos.chatContenido}>
            {mensajes.map((m) => (
              <View
                key={m.id}
                style={[
                  estilos.burbuja,
                  m.tipo === 'user'
                    ? { alignSelf: 'flex-end', backgroundColor: colores.marca }
                    : { alignSelf: 'flex-start', backgroundColor: COLORES.papelGris },
                ]}
              >
                <Text style={[estilos.burbujaTexto, m.tipo === 'user' && { color: '#fff' }]}>{m.texto}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity accessibilityRole="button"
        activeOpacity={carrito.length === 0 ? 1 : 0.7}
        onPress={() => carrito.length > 0 && navegarA('Carrito')}
        style={[
          estilos.carritoResumen,
          {
            borderColor: colores.marcaSuave,
            backgroundColor: colores.marcaTenue,
            // Esta barra es el último hijo de la pantalla, no contenido que se desliza: si no le deja hueco a
            // la píldora de abajo (que flota por ENCIMA, pintada por el propio Tab Navigator), el toque en "Tu
            // carrito" lo captura la píldora y no esto.
            paddingBottom: 14 + Math.max(bottom, AIRE_ABAJO_MINIMO) + ALTURA_BARRA_FLOTANTE,
          },
        ]}
      >
        <View style={estilos.carritoFila}>
          <Text style={estilos.carritoTitulo}>{t('Tu carrito ({n})', { n: items })}</Text>
          <Text style={[estilos.carritoTotal, { color: colores.marcaTexto }]}>${totalCarrito.toFixed(2)}</Text>
        </View>
        {carrito.length === 0 ? (
          <Text style={estilos.carritoVacio}>{t('Aún no has agregado nada.')}</Text>
        ) : (
          <Text style={estilos.carritoDetalle} numberOfLines={2}>
            {carrito.map((i) => `${i.cantidad}× ${i.nombre}`).join(' · ')}
          </Text>
        )}
      </TouchableOpacity>

      {productoAbierto && (
        <ModalProducto
          producto={productoAbierto}
          alCerrar={() => setProductoAbierto(null)}
          alAgregar={agregarAlCarrito}
          conBarraFlotante
        />
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  barra: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.4,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // 44 × 44: el mínimo para atinarle con el pulgar sin tocar el de al lado.
  accion: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sin aire arriba: Tiqui cuelga pegada al borde de la barra.
  cuerpo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  tiqui: {
    marginBottom: 6,
  },
  estado: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  transcripcion: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORES.textoSuave,
    textAlign: 'center',
    marginBottom: 8,
  },
  bajada: {
    fontSize: 14.5,
    lineHeight: 22,
    color: COLORES.textoSuave,
    textAlign: 'center',
    marginTop: 8,
  },
  chat: {
    flex: 1,
    width: '100%',
    marginTop: 8,
  },
  chatContenido: {
    ...contenidoCentrado,
    gap: 8,
    paddingBottom: 12,
  },
  burbuja: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  burbujaTexto: {
    fontSize: 14,
    color: COLORES.tituloFuerte,
  },
  carritoResumen: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  carritoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carritoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  carritoTotal: {
    fontSize: 17,
    fontWeight: '800',
  },
  carritoVacio: {
    fontSize: 13,
    color: COLORES.textoTenue,
    marginTop: 4,
  },
  carritoDetalle: {
    fontSize: 13,
    color: COLORES.textoSuave,
    marginTop: 4,
  },
});

export default Asistente;
