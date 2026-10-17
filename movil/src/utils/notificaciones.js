// AVISOS DEL TELÉFONO — notificaciones.js
// Lo que convierte los tres interruptores de Mi cuenta > Notificaciones en avisos que de verdad
// suenan.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Qué hacer con un aviso que llega con la app ABIERTA. Por defecto Android no lo muestra —asume
// que si está mirando la app ya se enteró—, y eso deja fuera el caso que importa: alguien viendo
// el catálogo cuando su pedido sale.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// El id del proyecto de Expo. Se busca primero en app.json (donde lo deja `eas init`) y si no, en
// la variable de entorno — así funciona tanto en un proyecto ya enlazado con EAS como en uno que
// solo tiene el .env.
export const PROJECT_ID =
  Constants?.expoConfig?.extra?.eas?.projectId ||
  Constants?.easConfig?.projectId ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  '';

export const HAY_PUSH = !!PROJECT_ID;

const CANAL = 'avisos';
const CANAL_PEDIDOS = 'pedidos';
const CANAL_TIENDA = 'tienda';

// Los canales de Android, con la pinta de la tienda: la luz del aviso en azul marino, como todo lo
// demás. Son dos, y la diferencia es a propósito: 'pedidos' prioridad ALTA: sale como globo arriba
// de la pantalla, con sonido.
const prepararCanal = async ({ personal = false } = {}) => {
  if (Platform.OS !== 'android') return;
  if (personal) {
    await Notifications.setNotificationChannelAsync(CANAL_TIENDA, {
      name: 'Pedidos nuevos de la tienda',
      description: 'Cada pedido que entra, mientras tenga la sesión del personal abierta.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#003049',
    });
  }
  await Notifications.setNotificationChannelAsync(CANAL_PEDIDOS, {
    name: 'Mi pedido',
    description: 'Cuando tu pedido se prepara, sale, está listo o llega.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#003049',
  });
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Promociones y novedades',
    description: 'Ofertas nuevas y productos que llegan a la tienda.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#003049',
  });
};

// Pide el permiso (solo si no lo tiene ya) y devuelve el token de Expo, o null con el motivo.
// Nunca lanza: quien lo llama está en medio de un interruptor, no en un try grande.
export const registrarParaAvisos = async ({ personal = false } = {}) => {
  if (!HAY_PUSH) return { token: null, motivo: 'sin-proyecto' };
  if (!Device.isDevice) return { token: null, motivo: 'emulador' };

  try {
    await prepararCanal({ personal });

    const { status: yaEstaba } = await Notifications.getPermissionsAsync();
    let status = yaEstaba;

    // Solo se pregunta si nunca se decidió. Volver a pedir un permiso ya denegado no abre nada en
    // Android: devuelve "denied" en el acto, y la pantalla tiene que mandar a los ajustes del sistema
    // en vez de insistir.
    if (status !== 'granted') {
      const { status: pedido } = await Notifications.requestPermissionsAsync();
      status = pedido;
    }

    if (status !== 'granted') return { token: null, motivo: 'sin-permiso' };

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return { token: data || null, motivo: data ? null : 'sin-token' };
  } catch (error) {
    console.log('avisos: no se pudo registrar el teléfono: ' + error?.message);
    return { token: null, motivo: 'error' };
  }
};

// Si todavía se le puede preguntar al teléfono por el permiso: nunca se decidió, o Android deja
// volver a preguntar. Para pedirlo una sola vez por cuenta propia (ver
// components/UI/RegistroAvisos.js) sin insistirle a quien ya dijo que no.
export const sePuedePreguntar = async () => {
  if (!HAY_PUSH || !Device.isDevice) return false;
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return status !== 'granted' && canAskAgain !== false;
  } catch {
    return false;
  }
};

// El token que ya tiene este teléfono, sin pedir permiso ni molestar a nadie. Sirve para dar de
// baja al cerrar sesión: ahí no se puede pedir permiso (sería absurdo) pero sí hay que decirle al
// backend que deje de avisar aquí.
export const tokenActual = async () => {
  if (!HAY_PUSH || !Device.isDevice) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    // El canal va antes del token también aquí: de Android 13 en adelante,
    // pedirlo sin canal creado no devuelve nada.
    await prepararCanal();
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return data || null;
  } catch {
    return null;
  }
};

// Qué hacer cuando alguien TOCA el aviso: el servidor manda el tipo y el id, y esto lleva a la
// pantalla que corresponde. `atendidos` evita que un aviso viejo vuelva a abrir su pantalla.
const atendidos = new Set();

const atender = (respuesta, alTocar) => {
  const id = respuesta?.notification?.request?.identifier;
  if (id) {
    if (atendidos.has(id)) return;
    atendidos.add(id);
  }
  alTocar(respuesta?.notification?.request?.content?.data || {});
};

export const escucharToques = (alTocar) => {
  const sub = Notifications.addNotificationResponseReceivedListener((respuesta) => {
    atender(respuesta, alTocar);
  });

  // El caso de la app cerrada del todo: el toque que la abrió no pasa por el oyente de arriba —ya
  // había ocurrido antes de que existiera— y hay que ir a buscarlo. Sin esto, abrir la app desde el
  // aviso te deja en la portada.
  Notifications.getLastNotificationResponseAsync()
    .then((respuesta) => {
      if (respuesta) atender(respuesta, alTocar);
    })
    .catch(() => null);

  return () => sub.remove();
};

// Un aviso que LLEGA con la app abierta (sin que nadie lo toque). Lo usa el modo personal para
// traer la lista del Reparto al momento, sin esperar a la próxima vuelta.
export const escucharLlegadas = (alLlegar) => {
  const sub = Notifications.addNotificationReceivedListener((aviso) => {
    alLlegar(aviso?.request?.content?.data || {});
  });
  return () => sub.remove();
};

// Un aviso que sale del mismo teléfono, sin servidor (solo lo usa el simulador de pedidos).
// permisoParaAvisos: pide el permiso de mostrar avisos (aparte en Android 13+) y dice si lo hay.
export const permisoParaAvisos = async () => {
  try {
    await prepararCanal();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    return status === 'granted';
  } catch {
    return false;
  }
};

export const avisoLocal = async ({ titulo, cuerpo, datos = {}, canal = CANAL }) => {
  try {
    if (!(await permisoParaAvisos())) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, data: datos, sound: 'default' },
      // Inmediato, pero por el canal de la tienda (sin él, Android lo manda a uno sin sonido).
      trigger: Platform.OS === 'android' ? { channelId: canal } : null,
    });
    return true;
  } catch (error) {
    console.log('avisos: no se pudo mostrar el aviso de prueba: ' + error?.message);
    return false;
  }
};
