// POLÍTICA DE COOKIES — legales/cookies.js
// Qué guarda el navegador cuando se usa la tienda, para qué y cuánto dura.

export const LLAVE_CONSENTIMIENTO_COOKIES = 'la635_consentimiento_cookies';

const COLUMNAS = ['Nombre', 'Para qué', 'Tipo', 'Cuánto dura'];

const COOKIES = [
  ['authCookieCliente', 'Mantener abierta su sesión de cliente.', 'Necesaria', '30 días, o hasta que cierre sesión'],
  ['authCookie', 'Mantener abierta la sesión del personal de la tienda.', 'Necesaria', '30 días, o hasta que cierre sesión'],
  ['registrationCookie', 'Terminar de verificar una cuenta nueva.', 'Necesaria', '15 minutos'],
  ['recoveryCookie', 'Terminar de cambiar una contraseña olvidada.', 'Necesaria', '15 minutos'],
  ['twofaCookie', 'Segundo paso de entrada del personal.', 'Necesaria', '10 minutos'],
];

const ALMACENAMIENTO = [
  ['Su sesión', 'Recordar que entró, para no pedirle la contraseña en cada página.', 'Necesaria', 'Hasta que cierre sesión'],
  ['Su carrito', 'Que no se le pierda lo que eligió si cierra la pestaña.', 'Necesaria', 'Hasta que compre o lo vacíe'],
  ['Dirección de entrega elegida', 'Calcular el envío sin preguntarle cada vez.', 'Necesaria', 'Hasta que la cambie'],
  ['Mayoría de edad confirmada', 'No volver a preguntarle su edad en cada producto para mayores de 18.', 'Necesaria', 'Hasta que cierre la pestaña'],
  ['Su decisión sobre este aviso', 'Recordar si aceptó o no las analíticas.', 'Necesaria', '12 meses'],
  ['Modo claro u oscuro', 'Mostrarle la tienda como la prefiere.', 'Preferencia', 'Hasta que la cambie'],
  ['Voz y velocidad de Tiqui', 'Que Tiqui le hable con la voz que eligió.', 'Preferencia', 'Hasta que la cambie'],
  ['Aviso de WhatsApp cerrado', 'No volver a mostrarle el globito del botón de WhatsApp.', 'Preferencia', 'Hasta que borre los datos del navegador'],
];

export const COOKIES_DOC = {
  clave: 'cookies',
  ruta: '/cookies',
  titulo: 'Política de cookies',
  secciones: [
    {
      id: 'resumen',
      titulo: 'En corto',
      bloques: [
        {
          tipo: 'destacado',
          texto:
            'Usamos lo mínimo para que la tienda funcione: su sesión, su carrito y sus preferencias. No hay cookies de publicidad. Las analíticas son anónimas, sin cookies, y solo se activan si usted las acepta.',
        },
      ],
    },
    {
      id: 'que-son',
      titulo: 'Qué son',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Las cookies y el almacenamiento local son pequeños datos que el navegador guarda en su aparato para que una página recuerde algo entre una visita y otra, como que usted ya inició sesión o lo que puso en el carrito.',
        },
      ],
    },
    {
      id: 'cookies',
      titulo: 'Las cookies que usamos',
      bloques: [
        { tipo: 'parrafo', texto: 'Todas son necesarias y todas son nuestras: sin ellas no se puede iniciar sesión.' },
        { tipo: 'tabla', columnas: COLUMNAS, filas: COOKIES },
      ],
    },
    {
      id: 'almacenamiento',
      titulo: 'Lo que guarda su navegador',
      bloques: [
        { tipo: 'tabla', columnas: ['Qué', 'Para qué', 'Tipo', 'Cuánto dura'], filas: ALMACENAMIENTO },
      ],
    },
    {
      id: 'analiticas',
      titulo: 'Analíticas (opcionales)',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Si las acepta, usamos Vercel Web Analytics para saber cuántas personas visitan cada página, desde qué tipo de aparato y de qué país, y así mejorar la tienda. No usa cookies, no guarda su dirección IP y no sabe quién es usted: los datos llegan agrupados.',
        },
        {
          tipo: 'parrafo',
          texto: 'Si las rechaza, no se carga nada de eso y la tienda funciona exactamente igual.',
        },
      ],
    },
    {
      id: 'terceros',
      titulo: 'Servicios de terceros',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Google: si usa el botón "Continuar con Google", Google puede usar sus propias cookies en ese momento, según su política.',
            'El mapa (OpenStreetMap y CARTO): descarga las calles, sin cookies nuestras.',
            'WhatsApp: al tocar el botón verde sale de la tienda hacia WhatsApp, que tiene sus propias reglas.',
          ],
        },
      ],
    },
    {
      id: 'gestionar',
      titulo: 'Cómo cambiar su decisión',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Con "Configurar cookies", al pie de cualquier página de la tienda, vuelve a ver el aviso y cambia lo que eligió.',
            'Desde su navegador puede borrar todo lo que la tienda guardó. Si borra las cookies necesarias, tendrá que volver a iniciar sesión y su carrito se vaciará.',
          ],
        },
      ],
    },
    {
      id: 'app',
      titulo: 'En la aplicación',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'La aplicación no usa cookies: guarda su sesión y su carrito en el almacenamiento seguro de su teléfono, y se borran al cerrar sesión o al desinstalarla.',
        },
      ],
    },
  ],
};
