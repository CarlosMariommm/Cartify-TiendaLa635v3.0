/*
 * ============================================================
 * EL RETO DE TIQUI — juegoTiqui.js
 * ============================================================
 * La dinámica del stand de la Expo (pantalla /juego, en la laptop):
 *
 *   1. Tiqui hace preguntas sobre el proyecto, de tres opciones: la tienda,
 *      ella misma, tu cuenta y el negocio. Nada de cómo está programado
 *      (se pidió así): todo es lo que alguien ve al usarla.
 *   2. Con 3 aciertos antes de 2 errores, se gira la ruleta. Perdona un
 *      error: con uno solo, una pregunta difícil sacaba a casi todos.
 *   3. La ruleta da dulce o premio secreto. Lo decide el ángulo donde cae, y
 *      cada porción mide lo mismo que su probabilidad (15 % secreto = 54°):
 *      lo que se ve es exactamente lo que pasa.
 *
 * Aquí vive solo lo que no depende de la pantalla: las preguntas, las frases
 * de Tiqui, el marcador, el mazo y la ruleta. Lo usan la pantalla
 * (pages/JuegoTiqui.jsx) y el script que graba su voz (scripts/voz-juego.mjs),
 * por eso no importa nada del navegador.
 * ============================================================
 */

export const ACIERTOS_PARA_GANAR = 3;
export const ERRORES_PARA_PERDER = 2;

/*
 * Las preguntas. La PRIMERA opción es la correcta: el orden en pantalla se
 * mezcla en cada partida (ver armarPregunta). `voz` es lo que dice Tiqui
 * cuando lo escrito no se lee bien en voz alta (comillas, un NO en
 * mayúsculas); si no está, dice la pregunta tal cual. `dato` sale después de
 * responder: cuenta cómo funciona esa parte del proyecto, así que cada
 * pregunta también lo presenta. Los datos son del código real: si algo
 * cambia en la tienda, cambiar también su pregunta.
 *
 * El "635" y los precios ("$2.50") no hace falta escribirlos para la voz: el
 * servidor ya los dice bien (backend/src/utils/vozTiqui.js).
 */
export const PREGUNTAS = [
  // ── La tienda ──
  {
    id: 'lema', tema: 'La tienda',
    pregunta: 'Completa el lema de la tienda: "La tienda de barrio, a un…"',
    voz: 'Completa el lema de la tienda: la tienda de barrio, a un…',
    opciones: ['toque', 'clic', 'paso'],
    dato: 'A un toque: compras desde la web, la app o hablándole a Tiqui.',
  },
  {
    id: 'donde-esta', tema: 'La tienda',
    pregunta: '¿Dónde está Tienda la 635?',
    // La dirección es la del pie de la web (utils/tienda.js). Si cambia, cambiar aquí también.
    opciones: ['En Calle Sevilla, colonia Providencia', 'En Calle Madrid, colonia Escalón', 'En Calle Toledo, colonia Flor Blanca'],
    dato: 'En Calle Sevilla 635, colonia Providencia: el mismo número de su nombre. Es una tienda de barrio que ahora también vende por internet.',
  },
  {
    id: 'cartify', tema: 'La tienda',
    pregunta: '¿Cómo se llama el sistema que hicimos para la tienda?',
    opciones: ['Cartify', 'Shopify', 'Tiendify'],
    dato: 'Cartify es todo el sistema: la tienda web, la app del teléfono y el panel del negocio.',
  },
  {
    id: 'saldo', tema: 'La tienda',
    pregunta: 'Al pagar puedes usar "saldo". ¿De dónde sale ese saldo?',
    opciones: ['De las tarjetas de regalo', 'De los puntos de cada compra', 'De un préstamo de la tienda'],
    dato: 'Las tarjetas de regalo cargan saldo a tu cuenta. Los puntos son aparte: se canjean como descuento.',
  },
  {
    id: 'kiosco-qr', tema: 'La tienda',
    pregunta: 'En el kiosco de la tienda no se inicia sesión. ¿Cómo sumas tus puntos ahí?',
    opciones: ['Escaneando un código QR con tu teléfono', 'Diciéndole tu contraseña a Tiqui', 'Dando tu número de DUI'],
    dato: 'Así tu contraseña nunca pasa por una pantalla pública: el QR liga la compra a tu cuenta y los puntos te caen solos.',
  },
  {
    id: 'impresiones', tema: 'La tienda',
    pregunta: 'Además del súper, ¿qué otro servicio tiene la tienda en la web?',
    opciones: ['Impresiones', 'Envío de paquetes', 'Reparación de celulares'],
    dato: 'Subes tu archivo, eliges el papel y la tienda te lo imprime.',
  },
  {
    id: 'retiro-listo', tema: 'La tienda',
    pregunta: 'Si eliges recoger tu pedido en la tienda, ¿qué estado te avisa que ya puedes pasar?',
    opciones: ['Listo', 'En camino', 'Pagado'],
    dato: 'Antes saltaba de "preparando" a "entregado" sin avisarte. Ahora te avisa cuando ya puedes pasar.',
  },
  {
    id: 'codigo-entrega', tema: 'La tienda',
    pregunta: '¿Cuántos dígitos tiene el código que le dices al repartidor para recibir tu pedido?',
    opciones: ['4', '6', '8'],
    dato: 'Lo ves en tu pedido. Sin él no se puede marcar como entregado: así nadie más se queda con tus cosas.',
  },
  {
    id: 'mapa-vivo', tema: 'La tienda',
    pregunta: 'Cuando tu pedido va en camino, ¿qué ves en la pantalla de tu pedido?',
    opciones: ['Al repartidor moviéndose en un mapa', 'Una foto de tu paquete', 'Una cuenta regresiva'],
    dato: 'La app del repartidor comparte su ubicación mientras va hacia tu casa.',
  },
  {
    id: 'mayores-18', tema: 'La tienda',
    pregunta: '¿Qué pasa si quieres agregar al carrito un producto para mayores de 18?',
    opciones: ['Te pide confirmar que eres mayor de edad', 'Te pide subir tu DUI', 'No se puede comprar en línea'],
    dato: 'Una sola confirmación sirve para toda la tienda: la ficha, el detalle y el carrito.',
  },
  {
    id: 'idiomas', tema: 'La tienda',
    pregunta: '¿En qué idiomas puedes usar la tienda?',
    opciones: ['Español e inglés', 'Solo español', 'Español, inglés y portugués'],
    dato: 'Se cambia en el pie de la página o en Mi Cuenta. El panel del negocio se queda en español.',
  },
  {
    id: 'sin-internet', tema: 'La tienda',
    pregunta: 'Si se te va el internet mientras compras, ¿qué pasa con tu carrito?',
    opciones: ['Se queda guardado', 'Se borra', 'Se manda el pedido igual'],
    dato: 'Tu carrito vive en el navegador. Tiqui aparece desenchufada para avisarte que se cayó la conexión.',
  },

  {
    id: 'temporadas', tema: 'La tienda',
    pregunta: 'En Navidad o en Halloween, ¿qué le pasa a la tienda?',
    opciones: ['Se pinta de la temporada y caen figuras', 'Cierra unos días', 'Sube los precios'],
    dato: 'El dueño elige la temporada en el panel: la tienda cambia de color, caen copos o murciélagos y Tiqui se disfraza.',
  },
  // ── Tiqui ──
  {
    id: 'que-es-tiqui', tema: 'Tiqui',
    pregunta: '¿Qué es Tiqui, la mascota de la tienda?',
    opciones: ['Una etiqueta de precio', 'Una bolsa de compras', 'Un carrito de súper'],
    dato: 'Es la etiqueta del logo con cara, y su cordón azul le hace de antena.',
  },
  {
    id: 'nombre-tiqui', tema: 'Tiqui',
    pregunta: '¿De dónde viene el nombre de Tiqui?',
    opciones: ['De "tiquete"', 'De "tic-tac"', 'De "tiquismiquis"'],
    dato: 'Viene de "tiquete", como la etiqueta de precio que ella es.',
  },
  {
    id: 'pronuncia', tema: 'Tiqui',
    pregunta: '¿Cómo dice Tiqui el nombre de la tienda?',
    opciones: ['"La seis tres cinco"', '"La seiscientos treinta y cinco"', '"La sesenta y tres cinco"'],
    dato: 'Se dice número por número. Hasta su voz tiene una regla para no decir "seiscientos treinta y cinco".',
  },
  {
    id: 'pedir-voz', tema: 'Tiqui',
    pregunta: '¿Qué puedes hacer hablándole a Tiqui en la tienda?',
    opciones: ['Armar tu pedido y preguntar por ofertas', 'Pagar con tu voz', 'Cambiar tu contraseña'],
    dato: 'Le dices "quiero dos manzanas y una leche" y ella las pone en tu carrito.',
  },
  {
    id: 'ojos-tapados', tema: 'Tiqui',
    pregunta: 'En el inicio de sesión de la web, ¿qué hace Tiqui cuando escribes tu contraseña?',
    opciones: ['Se tapa los ojos', 'Cierra los ojos y se duerme', 'Se voltea de espaldas'],
    dato: 'Si tocas "mostrar contraseña", espía. Y si la contraseña falla, niega con la cabeza.',
  },
  {
    id: 'disfraz-halloween', tema: 'Tiqui',
    pregunta: 'En la temporada de Halloween, ¿qué se pone Tiqui?',
    opciones: ['Un sombrero de bruja', 'Un disfraz de calabaza', 'Una sábana de fantasma'],
    dato: 'Tiqui no cambia de color: cambia de ropa con la temporada. En Navidad usa gorro de Santa.',
  },
  {
    id: 'disfraz-independencia', tema: 'Tiqui',
    pregunta: 'En septiembre, por la Independencia, ¿qué se pone Tiqui?',
    opciones: ['Un corbatín azul y blanco', 'Un sombrero de palma', 'Una banda con la bandera'],
    dato: 'Con los colores de la bandera. En San Valentín lleva un moño y se sonroja.',
  },
  {
    id: 'despertar', tema: 'Tiqui',
    pregunta: 'En la app del teléfono, ¿cómo empiezas a hablar con Tiqui?',
    opciones: ['Tocándola para despertarla', 'Diciendo "Oye, Tiqui"', 'Agitando el teléfono'],
    dato: 'Cuelga dormida con sus zetas. Se vuelve a dormir cuando cierras la app, para no gastar.',
  },
  {
    id: 'jalar', tema: 'Tiqui',
    pregunta: 'En la app, ¿qué pasa si jalas la pantalla hacia abajo para recargar?',
    opciones: ['Tiqui baja colgando de su cordón', 'Aparece una ruedita de carga', 'Suena una campanita'],
    dato: 'Su cordón se estira mientras jalas, y al soltar sube contenta mientras la tienda se recarga.',
  },


  {
    id: 'favoritos-vacios', tema: 'Tiqui',
    pregunta: 'Si todavía no tienes favoritos guardados, ¿qué ves en esa pantalla?',
    opciones: ['A Tiqui con un corazón vacío', 'Una pantalla en blanco', 'Un aviso de error'],
    dato: 'Tiqui aparece en cada lista vacía: con un recibo en blanco, un pin para las direcciones o una tarjeta.',
  },
  {
    id: 'burbuja-pedido', tema: 'Tiqui',
    pregunta: 'Cuando tienes un pedido en curso, ¿qué aparece en una esquina de la tienda?',
    opciones: ['Tiqui con la cara del estado de tu pedido', 'Un reloj con la hora de entrega', 'El teléfono del repartidor'],
    dato: 'Tiqui cambia según el pedido: recibido, preparando, en camino o entregado. Al tocarla ves el detalle.',
  },
  // ── Tu cuenta ──
  {
    id: 'tarjeta-guardada', tema: 'Tu cuenta',
    pregunta: 'Si guardas una tarjeta en tu cuenta, ¿qué se guarda de ella?',
    opciones: ['Los últimos 4 dígitos, el titular y el vencimiento', 'El número completo, cifrado', 'El número y el código de seguridad'],
    dato: 'Con eso basta para que reconozcas tu tarjeta; el número completo nunca se guarda.',
  },

  {
    id: 'puntos', tema: 'Tu cuenta',
    pregunta: '¿Para qué sirven los puntos que ganas con tus compras?',
    opciones: ['Para descontar en tus siguientes compras', 'Para participar en rifas', 'Para subir de nivel en un juego'],
    dato: 'Cada compra suma puntos, y al pagar puedes canjearlos como descuento.',
  },
  {
    id: 'entrar-google', tema: 'Tu cuenta',
    pregunta: 'Además de correo y contraseña, ¿con qué puedes entrar a la tienda?',
    opciones: ['Con tu cuenta de Google', 'Con tu cuenta de Facebook', 'Con tu número de DUI'],
    dato: 'La primera vez solo te pide tu teléfono y que aceptes los términos, y ya puedes comprar.',
  },
  {
    id: 'modo-oscuro', tema: 'Tu cuenta',
    pregunta: 'En Mi Cuenta → Preferencias, ¿qué puedes elegir?',
    voz: 'En Mi Cuenta, en Preferencias, ¿qué puedes elegir?',
    opciones: ['Modo claro, oscuro o automático', 'El color de Tiqui', 'La hora de entrega fija'],
    dato: 'Y el idioma. En automático, la tienda sigue el modo de tu teléfono o computadora.',
  },
  // ── El negocio ──
  {
    id: 'tiqui-panel', tema: 'El negocio',
    pregunta: 'En el panel del negocio también está Tiqui. Si le pides cambiar un precio, ¿qué hace?',
    opciones: ['Te pide confirmar antes de cambiarlo', 'Lo cambia de una vez', 'Solo te dice cómo hacerlo'],
    dato: 'Nunca cambia datos por su cuenta: propone el cambio y espera tu "sí".',
  },
  {
    id: 'ayudante-ventas', tema: 'El negocio',
    pregunta: '¿Qué avisa el ayudante de ventas del panel?',
    opciones: ['Promociones que dejan pérdida', 'Los precios de la competencia', 'Los cumpleaños de los clientes'],
    dato: 'Cruza precio, costo y ventas reales. También avisa productos bajo costo, por vencer o que no se venden.',
  },
  {
    id: 'paleta-calma', tema: 'El negocio',
    pregunta: 'El panel tiene una paleta de colores llamada "Calma". ¿Para qué es?',
    opciones: ['Para quien se cansa o se abruma con la pantalla', 'Para ahorrar batería de noche', 'Para que los reportes se impriman mejor'],
    dato: 'Usa colores apagados y fondo marfil. También hay paletas de lectura, contraste reforzado y modo oscuro.',
  },
  {
    id: 'reparto', tema: 'El negocio',
    pregunta: '¿Quién usa la sección "Reparto" de la app?',
    opciones: ['Los empleados que llevan los pedidos', 'Los clientes que esperan su pedido', 'Los proveedores de la tienda'],
    dato: 'Ahí ven los pedidos a domicilio, comparten su ubicación y marcan la entrega con el código del cliente.',
  },
];

/*
 * Lo que dice Tiqui fuera de las preguntas. Cada frase lleva su `id` (es el
 * nombre de su audio grabado) y su ánimo, que le da el tono a la voz y la
 * cara a la mascota. Todo en tú y sin género: no sabemos quién se acerca.
 *
 * Hay frases distintas para el primer y el segundo acierto, y para el primer
 * error y el que cierra la partida: así Tiqui cuenta cómo va el juego sin que
 * nadie tenga que mirar el marcador.
 */
export const FRASES = {
  bienvenida: [
    { id: 'bienvenida', animo: 'alegre', texto: '¡Hola! Soy Tiqui. Te voy a preguntar sobre mi tienda. Acierta tres antes de fallar dos, y te dejo girar mi ruleta. ¡Empecemos!' },
  ],
  acierto: [
    { id: 'acierto-1', animo: 'emocionada', texto: '¡Correcto! Qué buena mente.' },
    { id: 'acierto-2', animo: 'emocionada', texto: '¡Eso es! Le diste.' },
    { id: 'acierto-3', animo: 'emocionada', texto: '¡Exacto! Vas con todo.' },
    { id: 'acierto-4', animo: 'emocionada', texto: '¡Sí! Y esa estaba difícil.' },
  ],
  aciertoCasi: [
    { id: 'acierto-casi-1', animo: 'emocionada', texto: '¡Correcto! Solo te falta una para la ruleta.' },
    { id: 'acierto-casi-2', animo: 'emocionada', texto: '¡Muy bien! Una más y giras la ruleta.' },
  ],
  gana: [
    { id: 'gana-1', animo: 'emocionada', texto: '¡Correcto! ¡Lo lograste! Ahora te toca girar mi ruleta.' },
    { id: 'gana-2', animo: 'emocionada', texto: '¡Sí! ¡Tres aciertos! Vamos a la ruleta.' },
  ],
  error: [
    { id: 'error-1', animo: 'apenada', texto: '¡Uy, esa no era! Tranquilidad, todavía te queda una oportunidad.' },
    { id: 'error-2', animo: 'apenada', texto: 'Casi, pero no. Te queda una oportunidad más: ¡concéntrate!' },
  ],
  pierde: [
    { id: 'pierde-1', animo: 'apenada', texto: '¡Oh, no! Se acabaron tus oportunidades. Estuvo difícil. ¡Gracias por jugar conmigo!' },
    { id: 'pierde-2', animo: 'apenada', texto: 'Esa tampoco era. ¡Pero jugaste muy bien! Gracias por intentarlo.' },
  ],
  tiempo: [
    { id: 'tiempo', animo: 'asombrada', texto: '¡Se acabó el tiempo! Todavía te queda una oportunidad.' },
  ],
  tiempoPierde: [
    { id: 'tiempo-pierde', animo: 'apenada', texto: '¡Se acabó el tiempo! Y con eso se acabaron tus oportunidades. ¡Gracias por jugar!' },
  ],
  girar: [
    { id: 'girar', animo: 'emocionada', texto: '¡A girar! Mucha suerte.' },
  ],
  dulce: [
    { id: 'dulce-1', animo: 'alegre', texto: '¡Ganaste un dulce! Que lo disfrutes.' },
    { id: 'dulce-2', animo: 'alegre', texto: '¡Te toca un dulce! Bien merecido.' },
  ],
  secreto: [
    { id: 'secreto', animo: 'asombrada', texto: '¡No lo puedo creer! ¡Te ganaste el premio secreto!' },
  ],
};

// Lo que Tiqui dice al leer una pregunta: sin etiqueta de ánimo, con su voz de siempre.
export const clipDePregunta = (p) => ({ id: `p-${p.id}`, animo: '', texto: p.voz || p.pregunta });

// Todo lo que Tiqui dice en el juego: lo que se graba una vez y se reproduce sin internet.
export const clipsDeVoz = () => [
  ...Object.values(FRASES).flat(),
  ...PREGUNTAS.map(clipDePregunta),
];

/*
 * Huella corta del texto (FNV-1a de 32 bits). Va en el nombre del audio: si
 * alguien cambia una frase, su audio viejo deja de coincidir y el juego no
 * dice algo distinto de lo que muestra (cae en la voz del navegador hasta que
 * se vuelva a grabar).
 */
export const huella = (texto) => {
  let h = 0x811c9dc5;
  for (const letra of String(texto)) {
    h ^= letra.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

export const archivoDeVoz = (clip) => `${clip.id}-${huella(`${clip.animo}|${clip.texto}`)}.mp3`;

// ── El marcador ──

export const MARCADOR_INICIAL = { aciertos: 0, errores: 0 };

export const anotar = (marcador, acerto) => (
  acerto
    ? { ...marcador, aciertos: marcador.aciertos + 1 }
    : { ...marcador, errores: marcador.errores + 1 }
);

// 'jugando' | 'gano' | 'perdio'
export const estadoDelJuego = ({ aciertos, errores }) => {
  if (aciertos >= ACIERTOS_PARA_GANAR) return 'gano';
  if (errores >= ERRORES_PARA_PERDER) return 'perdio';
  return 'jugando';
};

/*
 * Qué dice Tiqui después de una respuesta, según cómo quedó el marcador.
 * `porTiempo`: no contestó a tiempo (cuenta como error).
 */
export const grupoDeReaccion = (marcador, acerto, porTiempo = false) => {
  const estado = estadoDelJuego(marcador);
  if (acerto) {
    if (estado === 'gano') return 'gana';
    return marcador.aciertos === ACIERTOS_PARA_GANAR - 1 ? 'aciertoCasi' : 'acierto';
  }
  if (porTiempo) return estado === 'perdio' ? 'tiempoPierde' : 'tiempo';
  return estado === 'perdio' ? 'pierde' : 'error';
};

// ── El azar ──

// Un número en [0, 1). Con crypto si hay (el navegador y Node lo tienen).
export const azarSeguro = () => {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  return Math.random();
};

export const mezclar = (lista, azar = azarSeguro) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

export const alguna = (lista, azar = azarSeguro) => lista[Math.floor(azar() * lista.length)];

/*
 * El mazo: el orden en que salen las preguntas, guardado entre jugadores. Así
 * el que estaba en la fila escuchando no se sabe las respuestas del
 * siguiente: hasta que se acaba el mazo no se repite ninguna. Al acabarse se
 * baraja de nuevo (y si alguien agrega o quita preguntas, el mazo se corrige
 * solo). `yaSalieron` son las de la partida en curso: si el mazo se acaba a
 * media partida, esas van al fondo del nuevo para no repetirlas.
 */
export const sacarDelMazo = (mazo, { ids = PREGUNTAS.map((p) => p.id), yaSalieron = [], azar = azarSeguro } = {}) => {
  let quedan = (Array.isArray(mazo) ? mazo : []).filter((id) => ids.includes(id));
  if (!quedan.length) {
    const nuevo = mezclar(ids, azar);
    quedan = [...nuevo.filter((id) => !yaSalieron.includes(id)), ...nuevo.filter((id) => yaSalieron.includes(id))];
  }
  const [id, ...resto] = quedan;
  return { id, mazo: resto };
};

// La pregunta lista para pantalla: con sus opciones mezcladas y cuál es la buena.
export const armarPregunta = (id, azar = azarSeguro) => {
  const p = PREGUNTAS.find((x) => x.id === id);
  if (!p) return null;
  const opciones = mezclar(p.opciones.map((texto, i) => ({ texto, correcta: i === 0 })), azar);
  return { ...p, opciones };
};

// ── La ruleta ──

export const PORCIONES_DE_DULCE = 6;

/*
 * Las porciones, en grados y en el sentido del reloj desde arriba (0° es
 * donde está la flecha). El premio secreto mide lo mismo que su probabilidad
 * y va entre los dulces, no pegado a la flecha al arrancar.
 *
 * Sin premios secretos en bodega, su porción se queda (gris, "Agotado") pero
 * la ruleta ya no cae ahí: eso es más honesto que esconderla.
 */
/*
 * La probabilidad del premio secreto, en %.
 *
 * Automática: la de sacar un premio secreto de la bolsa de premios que
 * quedan. Con 10 secretos y 60 dulces, 10 de 70 = 14 %. Cada premio que se
 * entrega la mueve: si salen muchos dulces seguidos sube, si sale un secreto
 * baja, y así los dos se acaban más o menos parejo a lo largo del día.
 *
 * Fija: la que eligió el operador, sin importar cuántos queden.
 *
 * Va de 1 % a 50 %: con menos no se vería la porción y con más dejaría de
 * ser secreto. Sin secretos devuelve la fija, solo para dibujar la porción
 * gris de "Agotado" (la ruleta ya no cae ahí).
 */
export const PROBABILIDAD_MINIMA = 1;
export const PROBABILIDAD_MAXIMA = 50;

export const probabilidadSecreta = ({ modo = 'auto', porcentaje = 15, secretos = 0, dulces = 0 } = {}) => {
  if (modo !== 'auto' || secretos <= 0) return porcentaje;
  const exacta = dulces > 0 ? (100 * secretos) / (secretos + dulces) : PROBABILIDAD_MAXIMA;
  return Math.min(PROBABILIDAD_MAXIMA, Math.max(PROBABILIDAD_MINIMA, exacta));
};

export const armarRuleta = ({ porcentajeSecreto = 15, quedanSecretos = 1 } = {}) => {
  const pct = Math.min(PROBABILIDAD_MAXIMA, Math.max(PROBABILIDAD_MINIMA, Number(porcentajeSecreto) || 15));
  const anchoSecreto = (360 * pct) / 100;
  const anchoDulce = (360 - anchoSecreto) / PORCIONES_DE_DULCE;
  const lugarDelSecreto = Math.floor(PORCIONES_DE_DULCE / 2);
  const porciones = [];
  let desde = 0;
  for (let i = 0; i <= PORCIONES_DE_DULCE; i++) {
    const secreto = i === lugarDelSecreto;
    const ancho = secreto ? anchoSecreto : anchoDulce;
    porciones.push({
      tipo: secreto ? 'secreto' : 'dulce',
      desde,
      hasta: desde + ancho,
      agotado: secreto && quedanSecretos <= 0,
    });
    desde += ancho;
  }
  return porciones;
};

/*
 * Dónde cae. Se elige un ángulo al azar en toda la rueda (o solo entre los
 * dulces, si el secreto está agotado): la probabilidad de cada porción es su
 * ancho. Se deja un margen en los bordes para que nunca quede la flecha
 * justo encima de una raya y se dude de qué salió.
 */
const MARGEN = 2;

export const elegirPremio = (porciones, azar = azarSeguro) => {
  const validas = porciones.filter((p) => !p.agotado);
  const total = validas.reduce((s, p) => s + (p.hasta - p.desde), 0);
  let punto = azar() * total;
  for (const p of validas) {
    const ancho = p.hasta - p.desde;
    if (punto < ancho || p === validas[validas.length - 1]) {
      const margen = Math.min(MARGEN, ancho / 4);
      const dentro = margen + (Math.min(punto, ancho) / ancho) * (ancho - 2 * margen);
      return { tipo: p.tipo, angulo: p.desde + dentro };
    }
    punto -= ancho;
  }
  return null;
};

/*
 * Cuánto girar para que `angulo` quede bajo la flecha (arriba), dando al
 * menos `vueltas` completas desde donde está ahora. La ruleta gira en el
 * sentido del reloj: un punto en `a` queda arriba cuando a + giro ≡ 0.
 */
export const giroHasta = (actual, angulo, vueltas = 6) => {
  const base = actual + vueltas * 360;
  const falta = (((360 - ((base + angulo) % 360)) % 360) + 360) % 360;
  return base + falta;
};

// Qué porción queda bajo la flecha con la ruleta girada `giro` grados.
export const porcionEnLaFlecha = (porciones, giro) => {
  const a = (((360 - (giro % 360)) % 360) + 360) % 360;
  const i = porciones.findIndex((p) => a >= p.desde && a < p.hasta);
  return i === -1 ? porciones.length - 1 : i;
};

// ── Lo que se guarda en la laptop ──

export const AJUSTES_INICIALES = {
  secretos: 10,          // premios secretos que quedan
  dulces: 60,            // dulces que quedan
  modo: 'auto',          // 'auto': la probabilidad sale de los premios; 'fija': la de `porcentaje`
  porcentaje: 15,        // probabilidad fija del premio secreto
  segundos: 30,          // tiempo por pregunta (0 = sin tiempo)
  voz: true,
  sonidos: true,
  musica: true,          // la música de fondo
};

export const CONTADORES_VACIOS = { jugaron: 0, ruleta: 0, dulces: 0, secretos: 0 };

export const hoy = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/*
 * Lo guardado, sano: valores fuera de rango vuelven a los de fábrica, y los
 * contadores se reinician solos al cambiar de día (la Expo dura varios).
 */
export const leerGuardado = (crudo, dia = hoy()) => {
  const g = crudo && typeof crudo === 'object' ? crudo : {};
  const numero = (v, min, max, def) => (Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : def);
  const ajustes = {
    secretos: numero(g.ajustes?.secretos, 0, 999, AJUSTES_INICIALES.secretos),
    dulces: numero(g.ajustes?.dulces, 0, 9999, AJUSTES_INICIALES.dulces),
    modo: ['auto', 'fija'].includes(g.ajustes?.modo) ? g.ajustes.modo : AJUSTES_INICIALES.modo,
    porcentaje: numero(g.ajustes?.porcentaje, 1, 50, AJUSTES_INICIALES.porcentaje),
    segundos: [0, 20, 30, 45, 60].includes(g.ajustes?.segundos) ? g.ajustes.segundos : AJUSTES_INICIALES.segundos,
    voz: typeof g.ajustes?.voz === 'boolean' ? g.ajustes.voz : AJUSTES_INICIALES.voz,
    sonidos: typeof g.ajustes?.sonidos === 'boolean' ? g.ajustes.sonidos : AJUSTES_INICIALES.sonidos,
    musica: typeof g.ajustes?.musica === 'boolean' ? g.ajustes.musica : AJUSTES_INICIALES.musica,
  };
  const mismoDia = g.dia === dia;
  const contadores = { ...CONTADORES_VACIOS };
  if (mismoDia) {
    for (const k of Object.keys(CONTADORES_VACIOS)) contadores[k] = numero(g.contadores?.[k], 0, 1e6, 0);
  }
  const mazo = Array.isArray(g.mazo) ? g.mazo.filter((x) => typeof x === 'string') : [];
  return { ajustes, contadores, dia, mazo };
};
