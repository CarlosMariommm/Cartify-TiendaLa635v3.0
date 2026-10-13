/*
 * ============================================================
 * NOTIFICACIONES — qué avisos quiere recibir, y por dónde
 * ============================================================
 * La misma lista que `frontend/src/pages/cliente/Notificaciones.jsx`, con las
 * mismas claves, porque escriben en el mismo documento: cambiar uno desde el
 * teléfono tiene que verse al abrir la tienda en la computadora.
 *
 * Cada aviso tiene su interruptor EN LA APP (`avisosApp`) y, si sale por
 * correo, el suyo POR CORREO (`notificationPrefs`). Apagar uno no toca al
 * otro: quien se cansó de los correos de promociones puede seguir
 * enterándose en el teléfono (ver backend/src/utils/preferenciasAvisos.js).
 *
 * ── Se guarda solo (y se deshace solo si falla) ──
 *
 * No hay botón de guardar. Un interruptor que se mueve pero no cuenta hasta que
 * uno baja a apretar "Guardar" es la manera de que la gente salga de la
 * pantalla creyendo que ya quedó. Se manda al tocarlo, como en la web.
 *
 * El interruptor se pinta ANTES de que conteste el servidor, porque un switch
 * que se queda quieto medio segundo se toca dos veces. Si el guardado falla, se
 * devuelve a donde estaba y se avisa: quedarse encendido de mentira sería
 * prometer avisos que nunca van a llegar.
 *
 * ── Dos cosas distintas: QUÉ quiere y A DÓNDE se lo mandamos ──
 *
 * El interruptor guarda la preferencia en la cuenta, igual que en la web. Lo
 * que hace que además SUENE es el token de este teléfono, que se registra la
 * primera vez que se enciende algo (ver utils/notificaciones.js) y que el
 * backend cruza con la preferencia al mandar el aviso (utils/pushExpo.js).
 *
 * Son dos pasos y no uno porque el permiso del sistema puede faltar aunque la
 * preferencia esté encendida: ahí la cuenta dice "sí quiero" y el teléfono
 * dice "no me avises". El pie de la lista cuenta en cuál de los dos estados
 * está, sin adornos — prometer "le avisamos cuando su pedido esté cerca" y que
 * nunca suene nada es peor que no ofrecerlo.
 * ============================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CargandoMascota } from '../../components/Tiqui/Mascota';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../context/TemaContext';
import { useAviso } from '../../context/AvisoContext';
import { getCliente, actualizarNotificaciones, registrarTokenPush } from '../../api/clienteApi';
import { HAY_PUSH, registrarParaAvisos, tokenActual } from '../../utils/notificaciones';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import Boton from '../../components/UI/Boton';
import { useIdioma } from '../../context/IdiomaContext';
import { contenidoCentrado } from '../../theme/pantalla';

// Los mismos valores por defecto que la web, para que un cliente nuevo vea lo
// mismo en los dos lados antes de tocar nada.
const POR_DEFECTO = {
  correo: { promociones: true, nuevosProductos: true, pedidoCerca: false },
  app: {
    promociones: true,
    favoritosEnOferta: true,
    nuevosProductos: true,
    pedidoPreparando: true,
    pedidoListo: true,
    pedidoEntregado: true,
    pedidoCancelado: true,
  },
};

const desdeCliente = (cliente) => ({
  correo: { ...POR_DEFECTO.correo, ...(cliente?.notificationPrefs || {}) },
  app: { ...POR_DEFECTO.app, ...(cliente?.avisosApp || {}) },
});

/*
 * `app`: la clave en avisosApp. `correo`: la de notificationPrefs, solo si ese
 * aviso también sale por correo. "Sale o está listo" usa `pedidoCerca`, el
 * correo de siempre de "tu pedido va en camino".
 */
const GRUPOS = [
  {
    titulo: 'Ofertas y novedades',
    avisos: [
      { app: 'promociones', correo: 'promociones', titulo: 'Promociones nuevas', sub: 'Ofertas y descuentos de la tienda.' },
      { app: 'favoritosEnOferta', titulo: 'Mis favoritos en oferta', sub: 'Cuando algo que guardaste en favoritos entra en una promoción.' },
      { app: 'nuevosProductos', correo: 'nuevosProductos', titulo: 'Productos nuevos', sub: 'Cuando llegan productos a la tienda.' },
    ],
  },
  {
    titulo: 'Tu pedido',
    avisos: [
      { app: 'pedidoPreparando', titulo: 'Lo empiezan a preparar', sub: 'Cuando la tienda junta tus productos.' },
      { app: 'pedidoListo', correo: 'pedidoCerca', titulo: 'Sale o está listo para recoger', sub: 'El correo es solo cuando sale a domicilio.' },
      { app: 'pedidoEntregado', titulo: 'Cuando te llega', sub: 'Solo en pedidos a domicilio.' },
      { app: 'pedidoCancelado', titulo: 'Si se cancela', sub: 'El correo con el motivo te llega siempre.' },
    ],
  },
];

// El ancho de cada columna de interruptores (App y Correo).
const COLUMNA = 54;

// Mismo tiempo que --dur-press en la web: es el mismo interruptor, misma duración.
const DURACION_INTERRUPTOR = 160;

/*
 * El interruptor. La bolita se mueve con `transform` y no cambiando `left`
 * porque es lo único que no obliga a recalcular la posición de todo lo que
 * tiene al lado en cada fotograma — mismo criterio que el de la web. El color
 * del riel no admite el driver nativo, así que todo el progreso (bolita y
 * color) corre por un solo `Animated.Value` en el hilo de JS.
 */
const Interruptor = ({ encendido, alTocar, color, etiqueta }) => {
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const progreso = useRef(new Animated.Value(encendido ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: encendido ? 1 : 0,
      duration: DURACION_INTERRUPTOR,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [encendido, progreso]);

  return (
    <Pressable
      onPress={alTocar}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: encendido }}
      accessibilityLabel={etiqueta}
    >
      <Animated.View
        style={[
          estilos.riel,
          {
            backgroundColor: progreso.interpolate({
              inputRange: [0, 1],
              outputRange: [COLORES.borde, color],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            estilos.bolita,
            {
              transform: [
                { translateX: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, 19] }) },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const Notificaciones = ({ alVolver }) => {
  const { t } = useIdioma();
  const { user } = useAuth();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  const { avisar } = useAviso();

  const [prefs, setPrefs] = useState(POR_DEFECTO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const cliente = await getCliente(user.id);
      setPrefs(desdeCliente(cliente));
    } catch (e) {
      setError(e?.message || t('No se pudieron cargar tus preferencias'));
    } finally {
      setCargando(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /*
   * En qué estado está ESTE teléfono: 'listo' si el aviso va a sonar, o el
   * motivo por el que no. Empieza en null (todavía comprobando) para no
   * mostrar una advertencia durante el medio segundo que tarda en saberse.
   */
  const [avisos, setAvisos] = useState(null);

  /*
   * Al entrar, sin molestar a nadie: si el permiso YA estaba dado, se vuelve a
   * mandar el token al servidor. No es redundante — Expo puede rotarlo, y un
   * token viejo es un aviso que no llega sin que nada parezca roto.
   */
  useEffect(() => {
    if (!user?.id) return;
    tokenActual().then((token) => {
      if (!token) return;
      setAvisos('listo');
      registrarTokenPush(user.id, token).catch(() => {
        // Que falle el refresco no es algo que contarle a nadie: el token que
        // ya estaba guardado sigue sirviendo.
      });
    });
  }, [user?.id]);

  /*
   * Pide el permiso y registra el teléfono. Se llama al ENCENDER, no al
   * entrar: el sistema muestra el cuadro de permiso una sola vez en la vida de
   * la instalación, y gastarlo apenas se abre la pantalla —antes de que la
   * persona haya pedido nada— es la forma más rápida de que lo rechace.
   */
  const asegurarAvisos = async () => {
    const { token, motivo } = await registrarParaAvisos();
    if (!token) {
      setAvisos(motivo);
      return;
    }
    try {
      await registrarTokenPush(user.id, token);
      setAvisos('listo');
    } catch {
      setAvisos('error');
    }
  };

  // `canal`: 'app' o 'correo'.
  const alternar = async (canal, clave) => {
    const antes = prefs;
    const valor = !prefs[canal][clave];

    setPrefs({ ...prefs, [canal]: { ...prefs[canal], [clave]: valor } }); // se ve al instante
    try {
      // Solo la que cambió: el controlador la mezcla con las que ya estaban.
      await actualizarNotificaciones(user.id, { [canal]: { [clave]: valor } });
    } catch (e) {
      setPrefs(antes);
      avisar(e?.message || t('No se pudo guardar la preferencia'), 'error');
      return;
    }

    /*
     * Encender un aviso de la app es el momento de pedir el permiso, y va
     * DESPUÉS de guardar la preferencia: si el permiso se rechaza, lo que la
     * persona eligió queda guardado igual. Mañana lo concede desde los ajustes
     * y los avisos empiezan a llegar sin tener que volver a tocar el
     * interruptor. Un correo no necesita nada del teléfono.
     */
    if (canal === 'app' && valor && avisos !== 'listo') asegurarAvisos();
  };

  /*
   * El pie dice la verdad de este teléfono. Cada estado lleva a un lugar
   * distinto: el "no" del sistema se arregla en los ajustes, un emulador no se
   * arregla, y sin proyecto de Expo configurado el que tiene que hacer algo es
   * quien compila la app, no quien la usa.
   */
  const PIES = {
    listo: 'Te avisamos en este teléfono.',
    'sin-permiso': 'Este teléfono tiene los avisos bloqueados. Se cambia en los ajustes del sistema.',
    emulador: 'Los avisos llegan a un teléfono de verdad; en el emulador no suena nada.',
    'sin-proyecto': 'Esta versión de la app todavía no puede recibir avisos.',
    'sin-token': 'No se pudo preparar este teléfono para los avisos.',
    error: 'No se pudo preparar este teléfono para los avisos.',
  };
  const pie = t(avisos
    ? PIES[avisos]
    : HAY_PUSH
      ? 'Enciende lo que quieras y te avisamos en este teléfono.'
      : PIES['sin-proyecto']);

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Notificaciones')} alVolver={alVolver} />

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando tus preferencias…')} />
        </View>
      ) : error ? (
        <View style={estilos.centro}>
          <Text style={estilos.errorTitulo}>{t('No se pudieron cargar tus preferencias')}</Text>
          <Text style={estilos.errorTexto}>{error}</Text>
          <View style={estilos.botonError}>
            <Boton
              texto={t('Reintentar')}
              alPresionar={cargar}
              color={colores.marca}
              colorPresionado={colores.marcaOscuro}
            />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={estilos.cuerpo} showsVerticalScrollIndicator={false}>
          <Text style={estilos.intro}>
            {t('Elige qué te avisamos y por dónde: en la app del teléfono o por correo.')}
          </Text>

          {GRUPOS.map((grupo) => (
            <View key={grupo.titulo} style={estilos.grupo}>
              <View style={estilos.cabecera}>
                <Text style={estilos.grupoTitulo} accessibilityRole="header">{t(grupo.titulo)}</Text>
                <Text style={estilos.columnaTitulo}>{t('App')}</Text>
                <Text style={estilos.columnaTitulo}>{t('Correo')}</Text>
              </View>

              {grupo.avisos.map((aviso) => {
                const titulo = t(aviso.titulo);
                return (
                  <View key={aviso.app} style={estilos.fila}>
                    <View style={estilos.textos}>
                      <Text style={estilos.titulo}>{titulo}</Text>
                      <Text style={estilos.sub}>{t(aviso.sub)}</Text>
                    </View>

                    <View style={estilos.columna}>
                      <Interruptor
                        encendido={!!prefs.app[aviso.app]}
                        alTocar={() => alternar('app', aviso.app)}
                        color={colores.marca}
                        etiqueta={t('{aviso}, en la app', { aviso: titulo })}
                      />
                    </View>
                    <View style={estilos.columna}>
                      {aviso.correo ? (
                        <Interruptor
                          encendido={!!prefs.correo[aviso.correo]}
                          alTocar={() => alternar('correo', aviso.correo)}
                          color={colores.marca}
                          etiqueta={t('{aviso}, por correo', { aviso: titulo })}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <Text style={estilos.pie}>{pie}</Text>

          {avisos === 'sin-permiso' && (
            <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={8}>
              <Text style={[estilos.pie, estilos.pieEnlace, { color: colores.marcaTexto }]}>
                {t('Abrir los ajustes del teléfono')}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  errorTexto: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  botonError: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  cuerpo: {
    ...contenidoCentrado,
    padding: 16,
    paddingBottom: 40,
    gap: 22,
  },
  intro: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoSuave,
  },
  grupo: {},
  // El título del grupo y, encima de cada columna de interruptores, de qué es.
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 8,
  },
  grupoTitulo: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  columnaTitulo: {
    width: COLUMNA,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: COLORES.textoSuave,
  },
  // Sin recuadro: una línea fina entre aviso y aviso.
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORES.linea,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  columna: {
    width: COLUMNA,
    alignItems: 'center',
  },
  titulo: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  sub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORES.textoSuave,
  },
  pieEnlace: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  riel: {
    width: 46,
    height: 27,
    borderRadius: 14,
    padding: 2.5,
    justifyContent: 'center',
  },
  bolita: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  pie: {
    marginTop: 6,
    paddingHorizontal: 4,
    fontSize: 12.5,
    lineHeight: 19,
    color: COLORES.textoTenue,
    textAlign: 'center',
  },
});

export default Notificaciones;
