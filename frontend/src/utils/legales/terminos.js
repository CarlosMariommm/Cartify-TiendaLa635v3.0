// TÉRMINOS Y CONDICIONES — legales/terminos.js
// Las reglas del trato entre la tienda y quien compra.

export const TERMINOS = {
  clave: 'terminos',
  ruta: '/terminos',
  titulo: 'Términos y condiciones',
  secciones: [
    {
      id: 'resumen',
      titulo: 'En corto',
      bloques: [
        {
          tipo: 'destacado',
          texto:
            'Esta es la tienda del barrio, en línea. Usted elige, nosotros le llevamos o lo pasa a traer. El precio que ve al confirmar es el que paga, y si algo sale mal por culpa nuestra, lo arreglamos.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Estas condiciones valen para la tienda en línea, la aplicación y el kiosco de la tienda. Lo que hacemos con sus datos, las cookies y los cambios y devoluciones tienen su propia página, enlazada más abajo.',
        },
      ],
    },
    {
      id: 'quienes',
      titulo: 'Quiénes somos y cómo contactarnos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'La tienda está en El Salvador. Estos son sus datos; para cualquier consulta o reclamo use el medio que le quede más cómodo:',
        },
        { tipo: 'negocio' },
        {
          tipo: 'lista',
          puntos: [
            'Por WhatsApp, con el botón verde de la tienda. Es la vía más rápida.',
            'En persona, en la dirección de arriba.',
            'Al recibir su pedido: quien se lo lleva también puede tomarle un mensaje o una queja.',
          ],
        },
      ],
    },
    {
      id: 'aceptacion',
      titulo: 'Cuándo aplican estas condiciones',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Puede recorrer la tienda y llenar el carrito sin cuenta. Para pagar, guardar direcciones, juntar puntos o ver sus pedidos hace falta una cuenta, y al crearla le pedimos que acepte estas condiciones y la Política de privacidad. Guardamos qué versión aceptó y en qué fecha.',
        },
      ],
    },
    {
      id: 'cuenta',
      titulo: 'Su cuenta',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Los datos que ponga tienen que ser suyos y de verdad. Un teléfono equivocado es un pedido que no llega.',
            'La cuenta es para mayores de edad, o para menores con el permiso de quien los cuida. Hay productos que solo se muestran y se venden a mayores de 18.',
            'Usted responde por lo que se haga desde su cuenta, así que no comparta su contraseña. Nadie de la tienda se la va a pedir nunca, ni por WhatsApp ni por teléfono.',
            'Si una cuenta se usa para estafar o para molestar a otras personas, la cerramos.',
          ],
        },
      ],
    },
    {
      id: 'pedidos',
      titulo: 'Pedidos, precios y entregas',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'El precio que se cobra es el que ve al confirmar el pedido. Los precios ya incluyen los impuestos. El envío y, si la hubiera, la tarifa de servicio se muestran aparte antes de confirmar.',
            'Las existencias se mueven todo el día. Si algo se acabó justo después de su pedido, le avisamos y se le descuenta del total; no se lo cambiamos por otra cosa sin preguntarle.',
            'Le llevamos el pedido a domicilio o usted lo pasa a traer. Con entrega a domicilio hace falta una dirección con su punto en el mapa.',
            'El tiempo de entrega que mostramos sale del promedio real de las entregas anteriores a su zona. Es un estimado honesto, no una promesa: la lluvia y el tráfico existen.',
            'Cuando su pedido va en camino puede seguir en el mapa por dónde viene. Al entregarlo le pedimos un código de cuatro dígitos para que nadie más reciba lo suyo.',
            'Los productos para mayores de 18 solo se entregan a una persona mayor de edad. Quien los lleva puede pedirle su DUI, y si no lo tiene a mano, ese producto no se entrega y no se le cobra.',
          ],
        },
      ],
    },
    {
      id: 'tiqui',
      titulo: 'Tiqui, la asistente de voz',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Tiqui le ayuda a armar el pedido hablando: agrega y quita productos, le cuenta las ofertas y le lleva a pagar. Es una ayuda, no un vendedor: nunca agrega algo que usted no pidió, y si no tenemos lo que busca, se lo dice.',
        },
        {
          tipo: 'nota',
          texto:
            'Como cualquier asistente automático, Tiqui se puede equivocar al entender. Revise el carrito antes de pagar: lo que vale es lo que usted confirma en la pantalla de pago.',
        },
      ],
    },
    {
      id: 'pagos',
      titulo: 'Pagos, puntos y saldo',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Hoy se paga al recibir el pedido o en la caja de la tienda, en efectivo o con tarjeta en el datáfono. En la tienda en línea nunca se le va a pedir el número completo de una tarjeta ni su código de seguridad.',
        },
        {
          tipo: 'lista',
          puntos: [
            'Si guarda una tarjeta en su cuenta, solo guardamos la marca, los últimos cuatro números, el titular y el vencimiento, para reconocerla. Nunca el número completo.',
            'Los puntos de fidelidad se ganan comprando y se vencen. Cuánto lleva y cuándo se le vencen lo ve en "Mi Cuenta › Puntos"; si ahí dice una cosa y en otra pantalla otra, vale lo que diga ahí.',
            'El saldo de las tarjetas de regalo se canjea en la tienda, no se vence y no se cambia por efectivo.',
            'Los puntos y el saldo son de su cuenta: no se pasan a otra persona.',
          ],
        },
        {
          tipo: 'nota',
          texto:
            'Si más adelante se habilita el pago con tarjeta en línea, se hará por una pasarela de pago autorizada, se lo avisaremos antes y estas condiciones se actualizarán.',
        },
      ],
    },
    {
      id: 'devoluciones',
      titulo: 'Cambios y devoluciones',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'No hacemos devoluciones por cambio de opinión de productos abiertos, usados o consumidos. Si el error es nuestro —llegó dañado, vencido, equivocado o incompleto— se lo reponemos, y si no lo tenemos, le devolvemos lo que pagó por eso. El detalle, con lo que dice la ley, está en su propia página.',
        },
        { tipo: 'enlace', a: '/devoluciones', texto: 'Ver la política de cambios y devoluciones' },
      ],
    },
    {
      id: 'impresiones',
      titulo: 'Servicio de impresiones',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Usted responde por el archivo que sube: que sea suyo o que tenga permiso para imprimirlo, y que no infrinja derechos de nadie.',
            'Imprimimos lo que manda, tal como lo manda. Revise tamaño, colores y páginas antes de confirmar.',
            'Una impresión ya hecha según su archivo no se devuelve. Si el error fue nuestro (páginas cortadas, manchas, otro tamaño del que pidió), la repetimos sin costo.',
          ],
        },
      ],
    },
    {
      id: 'advertencias',
      titulo: 'Uso seguro de los productos',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Lea la etiqueta y la fecha de vencimiento de cada producto antes de consumirlo o usarlo. Ante cualquier duda, pregúntenos.',
            'Algunos productos y empaques traen piezas pequeñas: manténgalos fuera del alcance de los niños.',
            'Los productos de limpieza deben guardarse lejos de niños y de quien no sepa manejarlos.',
            'Los productos con alcohol o tabaco son solo para mayores de 18 años.',
          ],
        },
      ],
    },
    {
      id: 'contenido',
      titulo: 'Fotos, marcas y contenido',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Las marcas y fotos de los productos son de sus fabricantes y se muestran para que sepa qué está comprando. Tiqui, el nombre y el diseño de la tienda son de la tienda: no se usan sin permiso.',
        },
      ],
    },
    {
      id: 'responsabilidad',
      titulo: 'Lo que no podemos garantizar',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Que la tienda en línea esté siempre disponible: puede haber cortes por mantenimiento o por fallas de los servicios que usamos. Si se cae a mitad de un pedido, revise en "Mis pedidos" si quedó registrado antes de repetirlo.',
            'Que el mapa y los tiempos sean exactos al minuto: son estimados.',
            'Nada de esto le quita los derechos que le da la ley como consumidor.',
          ],
        },
      ],
    },
    {
      id: 'privacidad',
      titulo: 'Sus datos y las cookies',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Qué datos le pedimos, para qué, quién más los ve y cómo pedir que los borremos está en la Política de privacidad. Qué guarda su navegador está en la Política de cookies.',
        },
        { tipo: 'enlace', a: '/privacidad', texto: 'Ver la política de privacidad' },
        { tipo: 'enlace', a: '/cookies', texto: 'Ver la política de cookies' },
      ],
    },
    {
      id: 'ley',
      titulo: 'Ley aplicable y reclamos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Estas condiciones se rigen por las leyes de El Salvador, en especial la Ley de Protección al Consumidor. Si tiene un reclamo, escríbanos primero: casi todo se resuelve con una conversación. Si no queda conforme, puede acudir a la Defensoría del Consumidor.',
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
            'Arriba dice qué versión está leyendo. Si solo corregimos una palabra, el número no se mueve. Si cambiamos algo de lo que aquí le prometemos —cómo se paga, cómo se devuelve, qué hacemos con sus datos— el número sube y se lo hacemos saber.',
        },
      ],
    },
  ],
};
