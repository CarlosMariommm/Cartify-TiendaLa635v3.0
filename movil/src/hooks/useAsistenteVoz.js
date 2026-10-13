/*
 * ============================================================
 * useAsistenteVoz — el "cerebro" del asistente por voz, en móvil
 * ============================================================
 * El equivalente de `frontend/src/hooks/useVoiceAssistant.js`. Las reglas de
 * texto (sinónimos, cantidades, puntaje por producto) son una copia literal:
 * eso es JS puro, sin nada del navegador, y funciona igual en los dos lados.
 *
 * Lo que SÍ cambia es cómo se escucha y se habla:
 *   - Web: `SpeechRecognition` / `speechSynthesis`, del navegador.
 *   - Aquí: `expo-speech-recognition` (módulo nativo, TurboModule — el único
 *     que de verdad soporta la New Architecture; `@react-native-voice/voice`
 *     falla en silencio con ella) y `expo-speech` para hablar.
 *
 * Y habla con la VOZ DE TIQUI (la del video, desde el servidor) cuando la
 * compilación trae expo-audio y el servidor tiene la llave; si no, con la
 * del teléfono. Ver utils/vozTiqui.js. Tiqui tutea, como en su video.
 *
 * Lo que se dejó AFUERA a propósito, para que esto fuera un apartado y no
 * un mes de trabajo:
 *   - Elegir voz del sistema (aquí el teléfono elige la suya en español).
 *   - Llevar a una sección de la cuenta específica o abrir un producto en su
 *     ficha: móvil no tiene esas pantallas conectadas a una ruta global
 *     todavía (ver `Asistente.js`). Sí navega a los 4 apartados y al carrito.
 *   - El upsell ("por cierto, X está en oferta"): el catálogo mapeado de
 *     móvil no trae el campo `esMasVendido` que usaba esa regla.
 *
 * ── El plan B: Tiqui, el mismo cerebro que la web ──
 * `preguntarALaIA` (más abajo) es lo que entra cuando estas reglas de texto
 * no alcanzan: habla con `/ai/asistente` (tool calling de Gemini, con el
 * catálogo, las promociones y los datos de la tienda). Ver el comentario
 * grande de TIQUI en `aiController.js`.
 * ============================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { asistenteApi } from '../api/asistenteApi';
import { useAuth } from './useAuth';
import { useEdad } from '../context/EdadContext';
import { cantidadParaDecir, esSoloAdultos } from '../utils/unidades';
import { navegarA } from '../navigation/navigationRef';
import { decirConTiqui, callarTiqui, vozTiquiPosible, paraDecir } from '../utils/vozTiqui';
import { primerNombre, conNombreAVeces } from '../utils/nombreTiqui';
import { animoDeFrase } from '../utils/animoTiqui';

const NUMEROS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

const SINONIMOS = {
  refresco: ['gaseosa', 'soda', 'cola', 'coca'],
  platano: ['banano', 'guineo'],
  galletas: ['galleta'],
  churritos: ['churros', 'churro'],
  yogurt: ['yogur'],
  manzana: ['mansana'],
};

const VELOCIDADES = [
  { v: 0.8, label: 'Lenta' },
  { v: 0.95, label: 'Normal' },
  { v: 1.15, label: 'Rápida' },
];

// Tras un silencio vuelve a escuchar a este ritmo. Ya no se duerme sola por
// callar: solo cuando la app se va a segundo plano (ver abajo).
const REINTENTO_SILENCIO_MS = 900;

/*
 * Lo primero que dice cuando la acaban de despertar, antes de contestar. Va
 * con el ánimo "despertando": con la voz de Tiqui, bosteza (ver
 * backend/src/utils/vozTiqui.js). Tiqui es ELLA: "despierta", no "despierto".
 */
const AL_DESPERTAR = [
  'Mmm… ya estoy despierta.',
  '¡Ay! Me quedé dormida. Ya estoy aquí.',
  'Uy, ya desperté.',
];

// A dónde puede llevar por voz. Solo lo que móvil de verdad tiene como ruta.
const DESTINOS = [
  { seccion: 'pedidos', palabras: /\b(mis pedidos|mi pedido|pedidos|ordenes|compras)\b/, nombre: 'tus pedidos', tab: 'pedidos', sesion: true },
  { seccion: 'cuenta', palabras: /\b(mi perfil|mi cuenta|mis datos)\b/, nombre: 'tu cuenta', tab: 'perfil', sesion: true },
  { seccion: 'carrito', palabras: /\b(mi carrito|el carrito|carrito)\b/, nombre: 'tu carrito', ruta: 'Carrito' },
  { seccion: 'inicio', palabras: /\b(inicio|la tienda|el catalogo|el catálogo)\b/, nombre: 'el inicio', tab: 'inicio' },
];

/*
 * Las secciones que la IA puede pedir abrir. Móvil no tiene pantallas propias
 * para puntos, favoritos, direcciones, etc.: viven dentro del perfil.
 */
const DESTINO_DE_SECCION = {
  ...Object.fromEntries(DESTINOS.map((d) => [d.seccion, d])),
  ...Object.fromEntries(['puntos', 'favoritos', 'direcciones', 'pagos', 'recibos', 'avisos']
    .map((s) => [s, { nombre: 'tu cuenta', tab: 'perfil', sesion: true }])),
};

// Mismas reglas que la web (ver useVoiceAssistant.js allá para el porqué de cada una).
const PIDE_VACIAR = /\b(vaciar|vacia|vacialo|empezar de nuevo|borra todo|borrar todo|quita todo|quitar todo)\b|\b(borra|borrar|limpia|limpiar|quita|quitar|elimina|eliminar|saca|sacar|vacia|vaciar)\s+(todo\s+)?(el|mi)\s+carrito\b/;
const PIDE_TOTAL = /\b(cuanto llevo|cuanto va|cuanto debo|cuanto sale todo|el total|mi total|total)\b|^cuanto (es|seria)( todo)?$/;
const PIDE_COMPRAR = (t) =>
  /\b(comprar|pagar|finalizar|terminar|es todo|eso es todo)\b/.test(t) ||
  (/^(ya\s+)?listo\b/.test(t) && t.split(' ').length <= 3);
const ES_PREGUNTA = /\b(que|cual|cuales|cuanto cuesta|cuanto vale|cuanto sale|precio|hay|tienen|tienes|esta en|estan en|recomienda|recomiendas|recomiendame|sugiere|sugieres|oferta|ofertas|promo|promocion|promociones|descuento|descuentos|donde|como|por que)\b/;
const PIDE_AGREGAR = /\b(quiero|dame|deme|agrega|agregame|agregue|pon|ponme|echa|echame|me das|me llevo|llevo|anota|anotame)\b/;
// Ver las promociones (ver useVoiceAssistant.js en la web: es la misma regla).
const PIDE_PROMOS = /\b(promo|promos|promocion|promociones|oferta|ofertas|descuento|descuentos|rebaja|rebajas)\b/;
const PIDE_IR = /\b(ver|vamos|llevame|llévame|muestrame|muéstrame|enseñame|enséñame|abrir|abre|ir a|donde esta|dónde está)\b/;

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalizar = (s) => sinAcentos(s).toLowerCase().trim();

/*
 * Cuántos productos DISTINTOS se nombran en un pedazo de la frase. Se cuenta
 * la palabra que manda en cada nombre ("sandía", "coca", "queso"), sin
 * repetir: "queso fresco" nombra un queso, aunque haya tres quesos en la
 * tienda.
 */
const productosNombrados = (texto, productos) => {
  const dichas = new Set(texto.split(/\s+/).map((w) => w.replace(/s$/, '')));
  const vistas = new Set();
  for (const p of productos) {
    const principal = normalizar(p.nombre).split(/[\s-]+/).find((w) => w.length > 2);
    const base = principal?.replace(/s$/, '');
    if (base && dichas.has(base)) vistas.add(base);
  }
  return vistas.size;
};
const contarItems = (lista) => lista.reduce((a, i) => a + i.cantidad, 0);

/*
 * Las frases del total. El monto se escribe "$12.50" (así sale en el chat) y
 * la voz lo dice "12 dólares con 50 centavos" (ver paraDecir en vozTiqui).
 * Decía "Tu total es $12.50 con 3 productos": dicho en voz alta quedaba
 * "...con 50 centavos con 3 productos", y con uno solo, "1 productos".
 */
const productosEnTexto = (lista) => {
  const n = contarItems(lista);
  return n === 1 ? '1 producto' : `${n} productos`;
};
const fraseConfirmar = (lista, total) =>
  `Son ${productosEnTexto(lista)} y tu total es $${total.toFixed(2)}. ¿Confirmas la compra? Di sí para confirmar.`;
const fraseLlevas = (lista, total) => `Llevas ${total.toFixed(2)} en ${productosEnTexto(lista)}.`;

const enLista = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

/*
 * ── Lo que entró de verdad ──
 * Tiqui anunciaba lo PEDIDO: "Agregué 74 Manzana" sobre un carrito que había
 * rechazado las 74 porque quedaban 12. Ahora el carrito agrega hasta donde
 * alcance y dice cuánto entró (ver agregarAlCarrito en TiendaContext), y la
 * frase se arma con eso. Igual que en la web (useVoiceAssistant):
 *
 *   - entró todo      → "Agregué 74 Manzanas."
 *   - entró una parte → "Solo me quedaban 12 Manzanas, y ya están en tu carrito."
 *   - no entró nada   → ya lleva todo lo que hay: "Ya tienes en tu carrito 12
 *                       Manzanas, que es todo lo que me queda."
 */
const agregarLoQueHaya = (fns, prod, pedido) => ({
  prod,
  pedido,
  entro: Number(fns.agregarAlCarrito?.(prod, pedido, { hastaDondeAlcance: true })) || 0,
});

const fraseDeLoAgregado = (resultados) => {
  const completos = resultados.filter((r) => r.entro >= r.pedido).map((r) => cantidadParaDecir(r.prod, r.pedido));
  const partes = completos.length ? [`Agregué ${enLista(completos)}.`] : [];
  for (const r of resultados) {
    if (r.entro > 0 && r.entro < r.pedido) {
      const uno = r.entro === 1;
      partes.push(`Solo me ${uno ? 'quedaba' : 'quedaban'} ${cantidadParaDecir(r.prod, r.entro)}, y ya ${uno ? 'está' : 'están'} en tu carrito.`);
    } else if (r.entro <= 0) {
      partes.push(`Ya tienes en tu carrito ${cantidadParaDecir(r.prod, Number(r.prod.stock) || 0)}, que es todo lo que me queda.`);
    }
  }
  return partes.join(' ');
};

const cantidadExplicita = (texto) => {
  const t = normalizar(texto);
  const d = t.match(/\b(\d+)\b/);
  if (d) return parseInt(d[1], 10);
  for (const [p, n] of Object.entries(NUMEROS)) {
    if (new RegExp(`\\b${p}\\b`).test(t)) return n;
  }
  return null;
};

const expandirSinonimos = (t) => {
  let out = t;
  for (const [canon, syns] of Object.entries(SINONIMOS)) {
    for (const s of syns) {
      if (new RegExp(`\\b${s}\\b`).test(out)) out += ' ' + canon;
    }
  }
  return out;
};

/*
 * Lo que la persona pidió en un pedazo de la frase, sin las palabras de pedir
 * ni la cantidad: de "dos galletas" queda "galletas". Sirve para decir lo que
 * no hay en vez de callarlo. Misma regla que la web (useVoiceAssistant.js).
 */
const DE_RELLENO = new Set([
  'quiero', 'quisiera', 'dame', 'deme', 'agrega', 'agregame', 'agregue', 'pon', 'ponme',
  'echa', 'echame', 'das', 'llevo', 'anota', 'anotame', 'necesito', 'los', 'las', 'del',
  'por', 'favor', 'porfa', 'mas', 'con', 'para', 'libra', 'libras', 'media', 'medio',
  'poquito', 'eso', 'todo', 'nada', 'bueno', 'gracias', 'hoy', 'solo', 'nomas', 'algo',
  'otra', 'otro', 'cosa', ...Object.keys(NUMEROS),
]);
const loQuePidio = (parte) =>
  parte.split(/\s+/).filter((w) => w.length > 2 && !DE_RELLENO.has(w) && !/\d/.test(w)).join(' ');

// Las partes de una frase con varios pedidos: "una manzana y dos galletas".
const SEPARA_PEDIDOS = /\s+y\s+|,|\s+tambien\s+|\s+ademas\s+/;

// Mismo puntaje que la web — ver el comentario original ahí para el porqué
// de cada nivel (100 nombre exacto, 90 lo contiene, 80 palabra principal en
// singular/plural, 70 esa palabra suelta en la frase, 20 cualquier palabra).
const puntuarCoincidencia = (nombreProducto, t) => {
  const nombre = normalizar(nombreProducto);
  const palabras = nombre.split(' ').filter((w) => w.length > 2);
  const principal = palabras[0] || nombre;
  const singular = (s) => s.replace(/s$/, '');

  if (t === nombre) return 100;
  if (t.includes(nombre)) return 90;
  if (singular(t) === singular(principal)) return 80;
  if (
    new RegExp(`\\b${principal}\\b`).test(t) ||
    new RegExp(`\\b${singular(principal)}\\b`).test(t)
  ) return 70;
  if (palabras.some((w) => t.includes(w))) return 20;
  return 0;
};

export const useAsistenteVoz = ({ productos = [], carrito = [], totalCarrito = 0, agregarAlCarrito, eliminarDelCarrito, actualizarCantidad, limpiarCarrito, mostrarProducto, irAPromociones }) => {
  const { isAuthenticated, user } = useAuth();
  // El mismo candado +18 que la tarjeta y la ficha: sin esto, pedirlo por
  // voz era una puerta trasera que ni tocaba la foto tapada ni el DUI.
  const { mayorConfirmado } = useEdad();

  const [activo, setActivo] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [muteado, setMuteado] = useState(false);
  const [velIndex, setVelIndex] = useState(1); // Normal
  const [transcripcion, setTranscripcion] = useState('');
  const [pensando, setPensando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [historial, setHistorial] = useState([]);
  /*
   * Ya hay respuesta, pero su voz todavía viene en camino. Mientras tanto la
   * pantalla sigue en "piensa" y el mensaje no se muestra: antes salía el
   * texto y la boca se movía, y el sonido llegaba después.
   */
  const [esperandoVoz, setEsperandoVoz] = useState(false);

  const dataRef = useRef({ productos, carrito, totalCarrito });
  dataRef.current = { productos, carrito, totalCarrito };
  const fnRef = useRef({});
  fnRef.current = { agregarAlCarrito, eliminarDelCarrito, actualizarCantidad, limpiarCarrito, mostrarProducto, irAPromociones };

  const activoRef = useRef(false);
  // Despierta, pero con la persona en otra pantalla: no escucha (ver pausar).
  const pausadoRef = useRef(false);
  const hablandoRef = useRef(false);
  const muteRef = useRef(false); muteRef.current = muteado;
  const rateRef = useRef(0.95); rateRef.current = VELOCIDADES[velIndex].v;
  const ultimaRespuestaRef = useRef('');
  const procesarRef = useRef(null);
  const hablarRef = useRef(null);
  const arrancarRef = useRef(null);
  const confirmandoRef = useRef(false);
  // La acaban de despertar: lo próximo que diga sale recién despertada.
  const recienDespiertaRef = useRef(false);
  const finalTextoRef = useRef('');
  const idRef = useRef(0);
  // La voz de Tiqui: si el servidor la tiene (y esta compilación trae
  // expo-audio). Con dos fallas seguidas se deja de intentar en esta charla.
  const vozTiquiRef = useRef(false);
  const fallasVozRef = useRef(0);

  /*
   * La memoria de la charla, al día en el mismo instante (el estado
   * `historial` recién se actualiza en el próximo render y la pregunta a la IA
   * sale antes). Viaja con cada pregunta para que entienda un "sí" o un
   * "mejor dos" que dependen de lo anterior.
   */
  const memoriaRef = useRef([]);

  /*
   * `visible` es lo que se pinta en la burbuja cuando no es igual a lo dicho
   * (Tiqui con el nombre del cliente). La memoria, que viaja a la IA, guarda
   * siempre `texto`: el nombre no le llega a la IA. Ver nombreTiqui.js.
   */
  const registrar = (tipo, texto, visible = texto, animo) => {
    memoriaRef.current = [...memoriaRef.current.slice(-7), { tipo, texto }];
    setHistorial((h) => [...h.slice(-7), { id: idRef.current++, tipo, texto: visible, animo }]);
  };

  // El primer nombre, si hay sesión de cliente; y cuándo lo usó Tiqui en esta charla.
  const nombreCliente = user?.type === 'client' ? primerNombre(user?.fullName) : '';
  const nombreRef = useRef(nombreCliente);
  useEffect(() => { nombreRef.current = nombreCliente; }, [nombreCliente]);
  const usoDelNombreRef = useRef({});

  // Despierta el servidor apenas se abre el asistente (Render lo duerme si no
  // hay tráfico). Así la primera pregunta no tarda medio minuto.
  // De paso pregunta si tiene la voz de Tiqui.
  useEffect(() => {
    let vivo = true;
    asistenteApi.despertar().then(({ voz }) => {
      if (vivo) vozTiquiRef.current = voz && vozTiquiPosible;
    });
    return () => { vivo = false; };
  }, []);

  const arrancarReconocimiento = useCallback(() => {
    // Dormida, o despierta pero con la persona en otra pantalla (ver pausar).
    if (!activoRef.current || pausadoRef.current) return;
    callarTiqui();
    Speech.stop();
    hablandoRef.current = false;
    finalTextoRef.current = '';
    setTranscripcion('');
    try {
      ExpoSpeechRecognitionModule.start({ lang: 'es-SV', interimResults: true, continuous: false });
    } catch {
      // Ya estaba escuchando, o el reconocedor no está disponible en este
      // teléfono; el evento "error" (si llega) se encarga de avisar.
    }
  }, []);
  arrancarRef.current = arrancarReconocimiento;

  /*
   * `animo`: el que eligió la IA. Las frases fijas no lo traen y sale de cómo
   * empiezan (utils/animoTiqui.js). Viaja a la voz de Tiqui; la del teléfono
   * habla igual que siempre.
   */
  const hablar = useCallback((dichoPorElla, animo) => {
    let texto = dichoPorElla;
    let tono = animo || animoDeFrase(texto);
    if (recienDespiertaRef.current) {
      recienDespiertaRef.current = false;
      texto = `${AL_DESPERTAR[Math.floor(Math.random() * AL_DESPERTAR.length)]} ${texto}`;
      tono = 'despertando';
    }
    ultimaRespuestaRef.current = texto;
    /*
     * A veces, con el nombre del cliente: se ve y se escucha así. La memoria
     * que viaja a la IA se queda con `texto`, sin el nombre (ver registrar y
     * nombreTiqui.js).
     */
    const dicho = conNombreAVeces(texto, nombreRef.current, usoDelNombreRef.current);
    registrar('bot', texto, dicho, tono);

    const continuar = () => {
      hablandoRef.current = false;
      setHablando(false);
      if (activoRef.current) setTimeout(() => arrancarRef.current?.(), 350);
    };

    if (muteRef.current) {
      continuar();
      return;
    }

    callarTiqui();
    Speech.stop();
    setEsperandoVoz(false);
    hablandoRef.current = true;
    setHablando(true);

    // La voz del teléfono: el respaldo de la de Tiqui, y la única sin ella.
    // "$12.50" se dice "12 dólares con 50 centavos", no "doce pesos". Ver paraDecir.
    const conElTelefono = () => {
      setEsperandoVoz(false);
      Speech.speak(paraDecir(dicho), {
        // "es-419" (español latinoamericano neutro) en vez de es-SV: no todos
        // los teléfonos traen una voz de El Salvador instalada, y esta es la
        // que con más frecuencia sí encuentra una voz decente del sistema.
        language: 'es-419',
        rate: rateRef.current,
        onDone: continuar,
        onStopped: continuar,
        onError: continuar,
      });
    };

    if (!vozTiquiRef.current) {
      conElTelefono();
      return;
    }
    setEsperandoVoz(true);
    decirConTiqui(asistenteApi.urlVoz(dicho, tono), {
      // 0,95 es la velocidad "Normal" de la voz del teléfono; el audio va a 1.
      velocidad: rateRef.current / 0.95,
      alEmpezar: () => setEsperandoVoz(false),
      alTerminar: () => {
        fallasVozRef.current = 0;
        setEsperandoVoz(false);
        continuar();
      },
      alFallar: () => {
        fallasVozRef.current += 1;
        if (fallasVozRef.current >= 2) vozTiquiRef.current = false;
        conElTelefono();
      },
    });
  }, []);
  hablarRef.current = hablar;

  /*
   * En un empate gana el que TIENE existencias. Con "leche" y dos leches igual
   * de parecidas, se quedaba con la primera de la lista aunque estuviera
   * agotada, y Tiqui decía "se nos acabó" teniendo la otra en el estante.
   */
  const conStock = (p) => (Number(p?.stock) || 0) > 0;
  const buscarProducto = (texto) => {
    const t = expandirSinonimos(normalizar(texto));
    let mejor = null;
    let mejorPuntaje = 0;
    for (const p of dataRef.current.productos) {
      const puntaje = puntuarCoincidencia(p.nombre, t);
      if (puntaje > mejorPuntaje || (puntaje > 0 && puntaje === mejorPuntaje && conStock(p) && !conStock(mejor))) {
        mejor = p;
        mejorPuntaje = puntaje;
      }
    }
    return mejor;
  };

  /*
   * El backend (`/ai/asistente`) ya hizo el tool calling: esto
   * solo EJECUTA la lista de acciones que Gemini decidió, una por una, igual
   * que las reglas locales de más abajo ejecutan lo que entendieron por
   * regex. Puede traer varias en un mismo turno ("dos manzanas y una
   * leche" son dos `agregar` en la misma respuesta) — por eso hacía falta
   * tool calling y no el `responseSchema` de un solo campo que usa la web.
   *
   * El monto en dólares de "total"/"comprar" NUNCA sale de lo que dijo la
   * IA: se arma acá con `totalCarrito`, que es la cuenta exacta de la
   * tienda. Pedirle aritmética de dinero a un modelo de lenguaje es
   * invitarlo a redondear mal.
   */
  const preguntarALaIA = useCallback(async (frase) => {
    const { productos } = dataRef.current;
    const fns = fnRef.current;

    setPensando(true);
    try {
      const idea = await asistenteApi.asistente({
        frase,
        // Solo se usan si el servidor todavía es el viejo (ver asistenteApi).
        productos,
        carrito: dataRef.current.carrito.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad })),
        // Lo que se habló ANTES de esta frase (la última de la memoria es la
        // frase misma, que ya va aparte).
        historial: memoriaRef.current.slice(0, -1).slice(-6).map((m) => ({
          quien: m.tipo === 'user' ? 'cliente' : 'asistente',
          texto: m.texto,
        })),
      });

      // Sin red o el servidor no contestó a tiempo: decirlo tal cual, no
      // fingir que no se entendió algo que se dijo bien.
      if (idea?.origen === 'sin-red') {
        hablarRef.current?.('Perdón, se me cortó la conexión. ¿Me lo repites?');
        return;
      }

      // La IA está saturada o no contestó a tiempo: no es que no se haya
      // entendido, así que se pide de nuevo sin hacerlo sentir culpable.
      if (idea?.origen === 'error') {
        hablarRef.current?.('Uy, me distraje un segundo. ¿Me lo repites?');
        return;
      }

      if (!idea?.entendido) {
        hablarRef.current?.('No te entendí bien. Puedo agregarte productos, contarte las ofertas o vaciar el carrito.');
        return;
      }

      const acciones = Array.isArray(idea.acciones) ? idea.acciones : [];
      const bloqueados = [];
      // Lo que entró de verdad (ver fraseDeLoAgregado) y los "cambiar" que
      // toparon con lo que hay.
      const resultados = [];
      const topados = [];
      let pideTotal = false;
      let pideComprar = false;

      for (const accion of acciones) {
        const prod = accion.producto ? productos.find((p) => p.nombre === accion.producto) : null;

        switch (accion.tipo) {
          case 'agregar': {
            if (!prod) break;
            // Mismo candado +18 que la tarjeta, la ficha y las reglas
            // locales: la IA no lo mete al carrito por su cuenta.
            if (esSoloAdultos(prod) && !mayorConfirmado) {
              bloqueados.push(prod.nombre);
              break;
            }
            resultados.push(agregarLoQueHaya(fns, prod, accion.cantidad || 1));
            break;
          }
          case 'quitar': {
            if (!prod) break;
            const enCarrito = dataRef.current.carrito.find((i) => i.id === prod.id);
            if (!enCarrito) break;
            if (accion.cantidad && accion.cantidad < enCarrito.cantidad) {
              fns.actualizarCantidad?.(prod.id, enCarrito.cantidad - accion.cantidad);
            } else {
              fns.eliminarDelCarrito?.(prod.id);
            }
            break;
          }
          case 'cambiar': {
            // "Mejor que sean dos": deja la cantidad exacta; si no estaba
            // en el carrito, se agrega con esa cantidad (con el mismo candado +18).
            if (!prod) break;
            const yaEsta = dataRef.current.carrito.find((i) => i.id === prod.id);
            const pedido = accion.cantidad || 1;
            if (yaEsta) {
              const quedo = Number(fns.actualizarCantidad?.(prod.id, pedido)) || 0;
              if (quedo > 0 && quedo < pedido) {
                topados.push(`Solo me quedan ${cantidadParaDecir(prod, quedo)}, así que te dejé ${quedo === 1 ? 'esa' : 'esas'}.`);
              }
            } else if (esSoloAdultos(prod) && !mayorConfirmado) {
              bloqueados.push(prod.nombre);
            } else {
              resultados.push(agregarLoQueHaya(fns, prod, pedido));
            }
            break;
          }
          case 'mostrar':
            if (prod) fns.mostrarProducto?.(prod);
            break;
          case 'vaciar':
            fns.limpiarCarrito?.();
            break;
          case 'seccion': {
            const destino = DESTINO_DE_SECCION[accion.seccion];
            if (!destino || (destino.sesion && !isAuthenticated)) break;
            fns.mostrarProducto?.(null);
            if (destino.ruta) navegarA(destino.ruta);
            else navegarA('Tabs', { screen: destino.tab });
            break;
          }
          // 'categoria': móvil todavía no tiene una pantalla por categoría;
          // Tiqui igual la nombra en lo que dice.
          case 'total':
            pideTotal = true;
            break;
          case 'comprar':
            pideComprar = true;
            break;
          default:
            break;
        }
      }

      /*
       * `agregarAlCarrito`/`eliminarDelCarrito` de arriba no cambian
       * `dataRef.current` al instante: lo actualiza el próximo render de
       * TiendaContext, que todavía no pasó en este mismo tick. Leer el total
       * ahora mismo diría un número viejo justo en el caso que más importa
       * que esté bien: "dos manzanas y cuánto llevo" en la misma frase. Un
       * `setTimeout` a 0 alcanza — para cuando corre, ya hubo tiempo de
       * volver a renderizar y `dataRef.current` está al día.
       */
      setTimeout(() => {
        // Los tres se pisan a propósito, en este orden: un producto +18 sin
        // confirmar es lo más urgente de decir, y comprar/total con el monto
        // real pesa más que la frase suelta que haya dicho la IA.
        let dice = idea.respuesta;
        // El ánimo que eligió la IA vale para SU frase; si se reemplaza, el de la nueva sale de animoTiqui.
        let animo = idea.animo;
        /*
         * Si algo no entró completo, lo que dijo la IA ya no es verdad ("te
         * agregué 74"): se dice lo que se hizo de verdad. La IA ve cuántas
         * quedan y casi siempre acierta; esto es por si no.
         */
        if (topados.length || resultados.some((r) => r.entro < r.pedido)) {
          dice = `${[fraseDeLoAgregado(resultados), ...topados].filter(Boolean).join(' ')} ¿Algo más?`;
          animo = undefined;
        }

        if (bloqueados.length) {
          const lista = bloqueados.join(' y ');
          const verbo = bloqueados.length === 1 ? 'es' : 'son';
          dice = `${lista} ${verbo} para mayores de edad. Ábrelo desde la tienda para confirmar tu identificación.`;
          animo = undefined;
        } else if (pideComprar) {
          animo = undefined;
          const { carrito, totalCarrito } = dataRef.current;
          if (!carrito.length) {
            dice = 'Tu carrito está vacío. ¿Qué te gustaría llevar?';
          } else {
            confirmandoRef.current = true;
            dice = fraseConfirmar(carrito, totalCarrito);
          }
        } else if (pideTotal) {
          const { carrito, totalCarrito } = dataRef.current;
          dice = fraseLlevas(carrito, totalCarrito);
          animo = undefined;
        }

        hablarRef.current?.(dice, animo);
      }, 0);
    } finally {
      setPensando(false);
    }
  }, [mayorConfirmado, isAuthenticated]);

  const procesar = useCallback((texto) => {
    const t = expandirSinonimos(normalizar(texto));
    const { carrito, totalCarrito } = dataRef.current;
    const fns = fnRef.current;

    registrar('user', texto);

    // ── Esperando "sí" o "no" para confirmar la compra ──
    if (confirmandoRef.current) {
      if (/\b(si|sí|claro|confirmo|dale|correcto|comprar)\b/.test(t)) {
        confirmandoRef.current = false;
        // Se apaga el asistente antes de irse a pagar: seguir escuchando en
        // segundo plano mientras la persona mira el checkout no tiene caso, y
        // sí puede gastar batería o agarrar algo que se dice sin querer.
        activoRef.current = false;
        setActivo(false);
        hablar('Te llevo a pagar.');
        navegarA('Checkout');
      } else if (/\b(no|cancela|espera|todavia|todavía|aun|aún)\b/.test(t)) {
        confirmandoRef.current = false;
        hablar('Ok, seguimos. ¿Qué más quieres agregar?');
      } else {
        hablar('¿Confirmas la compra? Di sí para confirmar, o no para seguir agregando.');
      }
      return;
    }

    if (/\b(ayuda|que puedo decir|comandos|no se|no entiendo)\b/.test(t)) {
      hablar('Puedes decirme: quiero dos manzanas y una leche, qué ofertas hay, muéstrame las manzanas, quita una manzana, cuánto llevo, borra el carrito o comprar.');
      return;
    }
    if (/\b(repite|repetir|otra vez|que dijiste)\b/.test(t)) {
      hablar(ultimaRespuestaRef.current || 'No he dicho nada todavía.');
      return;
    }
    if (PIDE_VACIAR.test(t)) {
      fns.limpiarCarrito?.();
      hablar('Vacié tu carrito. ¿Qué te gustaría llevar?');
      return;
    }
    if (PIDE_COMPRAR(t)) {
      if (!carrito.length) { hablar('Tu carrito está vacío. ¿Qué te gustaría llevar?'); return; }
      confirmandoRef.current = true;
      hablar(fraseConfirmar(carrito, totalCarrito));
      return;
    }
    if (PIDE_TOTAL.test(t)) {
      hablar(fraseLlevas(carrito, totalCarrito));
      return;
    }
    if (/\b(quita|quitar|elimina|eliminar|borra|saca|remueve)\b/.test(t)) {
      const prod = buscarProducto(t);
      if (!prod) { hablar('No encontré ese producto para quitarlo.'); return; }
      const enCarrito = carrito.find((i) => i.id === prod.id);
      if (!enCarrito) { hablar(`No tienes ${prod.nombre} en el carrito.`); return; }
      const c = cantidadExplicita(t);
      if (c === null || c >= enCarrito.cantidad) {
        fns.eliminarDelCarrito?.(prod.id);
        hablar(`Quité ${prod.nombre} del carrito.`);
      } else {
        fns.actualizarCantidad?.(prod.id, enCarrito.cantidad - c);
        hablar(`Quité ${c} ${prod.nombre}. Te quedan ${enCarrito.cantidad - c}.`);
      }
      return;
    }

    /*
     * ── Las promociones ──
     * Si no nombra un producto ("¿la leche está en oferta?" es sobre la
     * leche), se ponen a la vista —cerrando la ficha que hubiera abierta— y
     * Tiqui las cuenta con la IA, que sabe cuáles hay hoy.
     */
    if (PIDE_PROMOS.test(t) && !buscarProducto(t) && fns.irAPromociones) {
      fns.irAPromociones();
      preguntarALaIA(texto);
      return;
    }

    // ── Llevarlo a un apartado, o mostrarle un producto ──
    if (PIDE_IR.test(t)) {
      const destino = DESTINOS.find((d) => d.palabras.test(t));
      if (destino) {
        if (destino.sesion && !isAuthenticated) {
          hablar('Necesitas iniciar sesión para eso.');
          return;
        }
        fns.mostrarProducto?.(null);
        if (destino.ruta) navegarA(destino.ruta);
        else navegarA('Tabs', { screen: destino.tab });
        hablar(`Te abro ${destino.nombre}.`);
        return;
      }

      // No es un apartado: ¿es un producto? ("muéstrame las manzanas").
      const prod = buscarProducto(t);
      if (prod && fns.mostrarProducto) {
        fns.mostrarProducto(prod);
        hablar(`Aquí está ${prod.nombre}, a $${Number(prod.precio).toFixed(2)}.`);
        return;
      }

      // Ni apartado ni producto: antes esto se colaba hasta "agregar" de
      // abajo y terminaba metiendo al carrito algo que solo se quería VER.
      // Que lo intente la IA, igual que cuando las reglas de agregar fallan.
      preguntarALaIA(texto);
      return;
    }

    // ── Preguntas: a Tiqui, nunca al carrito ("¿la leche está en oferta?") ──
    // Con signos de pregunta va a la IA aunque también pida algo: ella agrega Y contesta.
    const conSignos = /[¿?]/.test(texto);
    if ((conSignos || ES_PREGUNTA.test(t)) && (conSignos || !PIDE_AGREGAR.test(t))) {
      preguntarALaIA(texto);
      return;
    }

    // ── Agregar (varios por frase) ──
    const partes = t.split(SEPARA_PEDIDOS).map((s) => s.trim()).filter(Boolean);
    // Sin los sinónimos que se le pegan al final, para nombrar lo que no hay
    // tal como lo dijo.
    const dichas = normalizar(texto).split(SEPARA_PEDIDOS).map((s) => s.trim()).filter(Boolean);

    /*
     * Varios productos en un mismo pedazo: el reconocimiento de voz no pone
     * comas, así que "quiero una sandía dos coca colas un queso fresco" llegaba
     * como UN pedido y estas reglas se quedaban con el primero que
     * encontraban (la sandía) y callaban el resto. Separar eso lo hace bien
     * la IA; aquí solo se le pasa.
     */
    if (dichas.some((d) => productosNombrados(d, dataRef.current.productos) > 1)) {
      preguntarALaIA(texto);
      return;
    }
    const noHay = [];
    // Lo que se intentó agregar y cuánto entró de verdad (ver fraseDeLoAgregado).
    const resultados = [];
    // Productos +18 encontrados pero NO agregados: sin confirmar la edad, la
    // voz no mete un producto restringido al carrito por su cuenta — mismo
    // candado que la tarjeta y la ficha, solo que aquí no hay a dónde abrir
    // un modal de DUI en medio de la conversación, así que se explica y ya.
    const bloqueados = [];
    /*
     * Lo que se pidió pero está agotado. Antes se "agregaba" igual: el
     * carrito lo rechazaba en silencio y el asistente decía "Agregué 1 leche"
     * sobre una leche que nunca entró. Ahora se dice que se acabó.
     */
    const agotados = [];
    const vistos = new Set();
    for (const [i, parte] of partes.entries()) {
      const prod = buscarProducto(parte);
      if (!prod) {
        const pedido = loQuePidio(dichas[i] || parte);
        if (pedido && !noHay.includes(pedido)) noHay.push(pedido);
        continue;
      }
      if (!vistos.has(prod.id)) {
        vistos.add(prod.id);
        if ((Number(prod.stock) || 0) <= 0) {
          agotados.push(prod.nombre);
          continue;
        }
        if (esSoloAdultos(prod) && !mayorConfirmado) {
          bloqueados.push(prod.nombre);
          continue;
        }
        resultados.push(agregarLoQueHaya(fns, prod, cantidadExplicita(parte) ?? 1));
      }
    }

    if (resultados.length === 0 && bloqueados.length === 0 && agotados.length === 0) {
      // Las reglas se dieron por vencidas: que lo intente la IA antes de
      // decir que no se entendió nada.
      preguntarALaIA(texto);
      return;
    }

    const piezas = [];
    const loAgregado = fraseDeLoAgregado(resultados);
    // Sin el punto final: las piezas se unen con '. ' más abajo.
    if (loAgregado) piezas.push(loAgregado.replace(/\.$/, ''));
    const entroAlgo = resultados.some((r) => r.entro > 0);
    // Lo que se pidió y no hay se dice, no se calla. Ver loQuePidio.
    if (noHay.length) piezas.push(`No tengo ${noHay.join(' ni ')}`);
    if (agotados.length) {
      piezas.push(`Hoy se nos ${agotados.length === 1 ? 'acabó' : 'acabaron'} ${agotados.join(' y ')}`);
    }
    if (bloqueados.length) {
      const lista = bloqueados.join(' y ');
      const verbo = bloqueados.length === 1 ? 'es' : 'son';
      piezas.push(`${lista} ${verbo} para mayores de edad. Ábrelo desde la tienda para confirmar tu identificación.`);
    }
    const dicho = piezas.join('. ');
    // Si no entró nada (agotado, o ya lleva todo lo que hay), se ofrece otra cosa.
    const pregunta = entroAlgo ? '¿Algo más?' : (agotados.length || resultados.length) && !bloqueados.length ? '¿Te busco otra cosa?' : '';
    // Con punto antes de la pregunta, sin duplicarlo si la última pieza ya lo trae.
    hablar(pregunta ? `${dicho}${dicho.endsWith('.') ? '' : '.'} ${pregunta}` : dicho);
  }, [hablar, preguntarALaIA, isAuthenticated, mayorConfirmado]);
  procesarRef.current = procesar;

  // ── Eventos del reconocedor nativo ──
  useSpeechRecognitionEvent('start', () => setEscuchando(true));

  useSpeechRecognitionEvent('result', (event) => {
    const t = event.results?.[0]?.transcript || '';
    if (event.isFinal) finalTextoRef.current = t;
    setTranscripcion(t);
  });

  useSpeechRecognitionEvent('error', () => setEscuchando(false));

  useSpeechRecognitionEvent('end', () => {
    setEscuchando(false);
    const texto = finalTextoRef.current.trim();
    finalTextoRef.current = '';

    if (texto) {
      procesarRef.current?.(texto);
      return;
    }

    /*
     * Silencio: vuelve a escuchar calladita, sin decir nada, todas las veces
     * que haga falta. Antes se dormía sola después de tres silencios, y cada
     * vez había que volver a despertarla. Ahora se duerme solo si la app se va
     * a segundo plano, si la duermen tocándola o al ir a pagar. Escuchar es del
     * teléfono y no gasta créditos de la voz.
     */
    if (!activoRef.current || hablandoRef.current) return;
    setTimeout(() => arrancarRef.current?.(), REINTENTO_SILENCIO_MS);
  });

  const iniciar = useCallback(async () => {
    try {
      const permiso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permiso.granted) {
        hablar('Necesito permiso del micrófono para escucharte. Actívalo en los ajustes del teléfono.');
        return;
      }
    } catch {
      // El módulo nativo no está disponible: pasa en Expo Go, que no lo trae.
      // Hace falta una compilación propia (npx expo run:android / run:ios).
      hablar('El reconocimiento de voz no está disponible en esta compilación de la app.');
      return;
    }
    // Estaba dormida: lo próximo que diga, lo dice recién despertada.
    recienDespiertaRef.current = true;
    pausadoRef.current = false;
    activoRef.current = true;
    setActivo(true);
    arrancarReconocimiento();
  }, [hablar, arrancarReconocimiento]);

  const interrumpir = useCallback(() => {
    callarTiqui();
    Speech.stop();
    setEsperandoVoz(false);
    hablandoRef.current = false;
    setHablando(false);
    activoRef.current = true;
    setActivo(true);
    arrancarReconocimiento();
  }, [arrancarReconocimiento]);

  const detener = useCallback(() => {
    activoRef.current = false;
    pausadoRef.current = false;
    setActivo(false);
    setEscuchando(false);
    setEsperandoVoz(false);
    try { ExpoSpeechRecognitionModule.stop(); } catch { /* no estaba escuchando */ }
    callarTiqui();
    Speech.stop();
  }, []);

  /*
   * Se duerme cuando la app se va a segundo plano (otra app, el inicio del
   * teléfono, la pantalla apagada): ahí nadie le está hablando, y seguir con
   * el micrófono abierto gasta batería.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'background' && activoRef.current) detener();
    });
    return () => sub.remove();
  }, [detener]);

  /*
   * La persona se fue de la pantalla de Tiqui (otra pestaña, el carrito, la
   * presentación): ya no le está hablando a ella, así que deja de escuchar.
   * Pero NO se duerme: sigue despierta, y al volver retoma sola, sin el
   * bostezo de recién despertada. Si estaba hablando, termina lo que decía.
   *
   * Las pestañas no se desmontan al cambiar de una a otra: sin esto, el
   * micrófono seguía abierto escuchando en la tienda.
   */
  const pausar = useCallback(() => {
    if (!activoRef.current || pausadoRef.current) return;
    pausadoRef.current = true;
    finalTextoRef.current = '';
    setEscuchando(false);
    setTranscripcion('');
    try { ExpoSpeechRecognitionModule.stop(); } catch { /* no estaba escuchando */ }
  }, []);

  const reanudar = useCallback(() => {
    if (!pausadoRef.current) return;
    pausadoRef.current = false;
    if (activoRef.current && !hablandoRef.current) arrancarRef.current?.();
  }, []);

  const toggleMute = useCallback(() => {
    setMuteado((m) => !m);
    callarTiqui();
    Speech.stop();
    setEsperandoVoz(false);
  }, []);

  const cambiarVelocidad = useCallback(() => {
    setVelIndex((i) => (i + 1) % VELOCIDADES.length);
  }, []);

  // Al salir del apartado: apagar todo, no dejarlo escuchando ni hablando
  // de fondo en otra pantalla.
  useEffect(() => {
    return () => {
      const teniaSesion = activoRef.current;
      activoRef.current = false;
      try { ExpoSpeechRecognitionModule.stop(); } catch { /* no estaba escuchando */ }
      if (teniaSesion) {
        callarTiqui();
        Speech.stop();
      }
    };
  }, []);

  return {
    activo, escuchando, muteado, transcripcion, historial, pensando, hablando, esperandoVoz,
    velLabel: VELOCIDADES[velIndex].label,
    iniciar, detener, toggleMute, cambiarVelocidad, hablar, interrumpir, pausar, reanudar,
  };
};

export default useAsistenteVoz;
