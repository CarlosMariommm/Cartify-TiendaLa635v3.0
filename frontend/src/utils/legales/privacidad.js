// POLÍTICA DE PRIVACIDAD — legales/privacidad.js
// Qué datos se piden, para qué, quién más los ve, cuánto se guardan y cómo pedir que se borren.

const COLUMNAS_DATOS = ['Dato', 'Para qué', 'Quién más lo ve', 'Cuánto se guarda'];

const FILAS_DATOS = [
  ['Nombre y nombre de usuario', 'Saber quién hizo el pedido y saludarle por su nombre.', 'La tienda y el servicio que envía los correos. Su primer nombre, además, el servicio que pone la voz de Tiqui cuando ella se lo dice.', 'Mientras tenga su cuenta.'],
  ['Correo electrónico', 'Confirmar que la cuenta es suya, recuperar la contraseña y avisarle de su pedido. Promociones solo si usted las acepta.', 'La tienda y el servicio que envía los correos.', 'Mientras tenga su cuenta.'],
  ['Teléfono', 'Llamarle si quien lleva el pedido no encuentra la casa.', 'La tienda y quien le lleva ese pedido.', 'Mientras tenga su cuenta.'],
  ['Fecha de nacimiento (opcional)', 'Habilitar la compra de productos para mayores de 18. Sin ella, esos productos quedan tapados y el resto funciona igual.', 'Solo la tienda.', 'Mientras tenga su cuenta, o hasta que la borre.'],
  ['DUI (opcional)', 'Confirmar la mayoría de edad para productos restringidos e identificarle si hay un reclamo.', 'Solo la tienda.', 'Mientras tenga su cuenta, o hasta que lo borre.'],
  ['Direcciones y su punto en el mapa', 'Llegar a su puerta y calcular el envío y el tiempo de entrega.', 'La tienda y quien le lleva ese pedido.', 'Hasta que borre la dirección.'],
  ['Foto de perfil (opcional)', 'Que su cuenta se reconozca de un vistazo.', 'La tienda y el servicio donde se guardan las imágenes.', 'Hasta que la cambie o la quite.'],
  ['Tarjetas guardadas (opcional)', 'Reconocer su tarjeta: marca, últimos cuatro números, titular y vencimiento. Nunca el número completo ni el código de seguridad.', 'Solo la tienda.', 'Hasta que la quite.'],
  ['Lo que le dice a Tiqui', 'Entender su pedido y contestarle. La tienda recibe el texto de lo que dijo, no una grabación.', 'Los servicios de inteligencia artificial y de voz de la lista de abajo, sin su correo ni su dirección. La inteligencia artificial tampoco recibe su nombre.', 'No se guarda: se usa para contestar y se descarta.'],
  ['Sus pedidos y sus puntos', 'Sus recibos, sus puntos y la contabilidad de la tienda.', 'Solo la tienda.', 'Los pedidos quedan en la contabilidad aunque cierre su cuenta, pero sin su nombre.'],
  ['Visitas al sitio (solo si las acepta)', 'Saber qué páginas se usan más, sin saber quién es usted.', 'El servicio de analíticas, sin cookies y sin datos que le identifiquen.', 'Datos agregados, sin su nombre.'],
  ['Su contraseña', 'Entrar a su cuenta.', 'Nadie. No la guardamos: guardamos una huella cifrada de la que no se puede volver atrás.', 'Mientras tenga su cuenta.'],
];

// Los servicios que de verdad tocan algo, con nombre y con lo que ven. Es la lista que se revisa
// cada vez que se agrega una integración.
const TERCEROS = [
  'MongoDB Atlas (la base de datos) y Render (el servidor): guardan y procesan todo lo de la tabla de arriba para que la tienda funcione.',
  'Vercel: publica este sitio y, solo si usted lo acepta, mide las visitas de forma anónima, sin cookies.',
  'Cloudinary: guarda las imágenes, incluida su foto de perfil si subió una.',
  'Mailjet: envía los correos de verificación, recuperación de contraseña, avisos de pedido y, si los aceptó, promociones. Recibe su correo y su nombre.',
  'Google: cuando usted elige "Continuar con Google", Google nos confirma su nombre, correo y foto. Además, Google Gemini ayuda a Tiqui a entender lo que usted dijo: recibe el texto de su frase y la lista de productos, sin su nombre, correo ni dirección.',
  'ElevenLabs: pone la voz de Tiqui. Recibe el texto de lo que Tiqui le va a decir, que a veces lleva su primer nombre si inició sesión ("¡Listo, María!").',
  'OpenStreetMap y CARTO: el mapa. OpenStreetMap recibe la dirección que usted escribe o, si toca "usar mi ubicación", las coordenadas de ese punto, para convertirlas en una dirección; CARTO entrega las calles del mapa. Nunca su nombre ni su teléfono.',
  'Expo: envía las notificaciones de la aplicación, si usted las permite en su teléfono.',
  'Su navegador o su teléfono: el reconocimiento de voz del micrófono lo hace el propio aparato (en Chrome y Android, con servicios de Google; en iPhone, de Apple). La tienda solo recibe el texto. Si la voz de Tiqui no está disponible, contesta con la voz del propio aparato, que en algunos navegadores también es un servicio de Google.',
];

export const PRIVACIDAD = {
  clave: 'privacidad',
  ruta: '/privacidad',
  titulo: 'Política de privacidad',
  secciones: [
    {
      id: 'resumen',
      titulo: 'En corto',
      bloques: [
        {
          tipo: 'destacado',
          texto:
            'Le pedimos los datos justos para venderle y llevarle su pedido. No los vendemos, no los prestamos para publicidad de nadie, y puede verlos, corregirlos o pedir que los borremos cuando quiera.',
        },
      ],
    },
    {
      id: 'responsable',
      titulo: 'Quién es responsable de sus datos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'El responsable de sus datos es el negocio de la tienda. Para cualquier consulta sobre sus datos, o para ejercer sus derechos, escríbanos por aquí:',
        },
        { tipo: 'negocio' },
      ],
    },
    {
      id: 'datos',
      titulo: 'Qué datos le pedimos y para qué',
      bloques: [
        {
          tipo: 'parrafo',
          texto: 'Todo lo que la tienda guarda de usted cabe en esta tabla. No hay una lista aparte más larga.',
        },
        { tipo: 'tabla', columnas: COLUMNAS_DATOS, filas: FILAS_DATOS },
        {
          tipo: 'nota',
          texto:
            'Cuando su pedido va en camino puede ver por dónde viene. Esa ubicación es la de quien se lo lleva, no la suya, y se deja de compartir en cuanto le entregan.',
        },
      ],
    },
    {
      id: 'bases',
      titulo: 'Con qué permiso los usamos',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Para cumplir lo que usted nos pide —venderle, llevarle su pedido, sumar sus puntos— usamos los datos que hacen falta para eso.',
            'Con su consentimiento, que puede retirar cuando quiera: las promociones por correo, las analíticas de visitas y los datos opcionales (fecha de nacimiento, DUI, foto).',
            'Porque la ley nos lo pide: los registros de venta que exige la contabilidad.',
            'Para proteger su cuenta: bloqueamos un rato la entrada después de varios intentos fallidos de contraseña.',
          ],
        },
      ],
    },
    {
      id: 'tiqui',
      titulo: 'Tiqui y el micrófono',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Tiqui solo escucha después de que usted toca el micrófono, y deja de escuchar cuando la detiene o cierra el asistente.',
            'El paso de voz a texto lo hace su navegador o su teléfono. La tienda recibe el texto, nunca una grabación, y no guarda lo que usted dijo.',
            'Para entender frases más difíciles, el texto viaja a Google Gemini junto con la lista de productos, sin sus datos personales.',
            'Si inició sesión, Tiqui a veces le llama por su primer nombre. Ese nombre lo agrega la tienda a la respuesta ya armada: no viaja a Google Gemini, pero sí al servicio que pone la voz, junto con la frase que Tiqui le va a decir.',
            'Si en la frase dice algo personal (su dirección, por ejemplo), ese texto viaja igual: mejor no le dicte datos sensibles a Tiqui.',
          ],
        },
      ],
    },
    {
      id: 'terceros',
      titulo: 'Quién más ve sus datos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Los únicos que tocan algo son los servicios que hacen funcionar la tienda, y cada uno ve solo lo suyo:',
        },
        { tipo: 'lista', puntos: TERCEROS },
        {
          tipo: 'parrafo',
          texto: 'Fuera de eso, solo entregamos algo si nos lo ordena una autoridad competente.',
        },
      ],
    },
    {
      id: 'fuera',
      titulo: 'Datos que salen de El Salvador',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Varios de estos servicios guardan o procesan la información fuera del país, principalmente en Estados Unidos. Los elegimos porque aplican medidas de seguridad reconocidas (conexiones cifradas y acceso restringido) y les damos solo lo necesario para su tarea. Al crear su cuenta, usted acepta ese envío.',
        },
      ],
    },
    {
      id: 'seguridad',
      titulo: 'Cómo los cuidamos',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Todo viaja cifrado (https).',
            'Su contraseña no se guarda: guardamos una huella cifrada de la que no se puede volver atrás.',
            'Los datos de entrega solo los ve el personal de la tienda, cada quien con su propia cuenta y contraseña.',
            'Si en un aparato compartido cierra sesión, su sesión se borra de ese navegador.',
          ],
        },
        {
          tipo: 'nota',
          texto:
            'Si alguna vez hubiera un problema de seguridad que afecte sus datos, se lo avisaremos a usted y a las autoridades como pide la ley.',
        },
      ],
    },
    {
      id: 'derechos',
      titulo: 'Qué puede pedirnos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'La Ley para la Protección de Datos Personales le da estos derechos, y le respondemos en un máximo de 20 días hábiles:',
        },
        {
          tipo: 'lista',
          puntos: [
            'Ver lo que tenemos suyo (acceso): está todo en "Mi Cuenta", sin pedir permiso a nadie.',
            'Corregirlo (rectificación): desde "Mi Cuenta › Mis datos".',
            'Que lo borremos (cancelación y olvido): con el botón de aquí abajo.',
            'Oponerse o limitar un uso: por ejemplo, dejar de recibir promociones desde "Mi Cuenta › Avisos", o rechazar las analíticas en el aviso de cookies.',
            'Llevarse sus datos (portabilidad): pídanos una copia y se la mandamos en un archivo.',
          ],
        },
        { tipo: 'borrado' },
        {
          tipo: 'nota',
          texto:
            'Al borrar su cuenta se van su nombre, su correo, su teléfono, sus direcciones y su foto. Los pedidos que ya hizo se quedan en la contabilidad —la ley se lo pide a cualquier negocio— pero desligados de usted.',
        },
      ],
    },
    {
      id: 'menores',
      titulo: 'Menores de edad',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'La tienda no está pensada para menores sin supervisión. Si usted cuida a un menor que creó una cuenta sin su permiso, escríbanos y la borramos.',
        },
      ],
    },
    {
      id: 'cambios',
      titulo: 'Si esto cambia',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Si agregamos un servicio que toque sus datos o cambiamos para qué los usamos, actualizamos esta página, subimos la versión de arriba y se lo hacemos saber.',
        },
      ],
    },
  ],
};
