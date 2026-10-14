import {
  Compass, LayoutDashboard, ShoppingBag, Package, Shapes, Tag, Blocks, Printer,
  Megaphone, Award, Gift, Palette, UserSquare2, Users, Truck, Settings, Sparkles, TrendingUp,
} from 'lucide-react';

/*
 * ============================================================
 * LA AYUDA DEL PANEL — ayudaPanel.js
 * ============================================================
 * Qué hace cada apartado del panel y cómo se usa, para quien lo abre por
 * primera vez (o para el que no se acuerda de dónde se cambiaba el envío).
 * Lo pinta pages/AyudaPanel.jsx; aquí solo vive el contenido, así que corregir
 * un texto o agregar un tema no toca la pantalla.
 *
 * Cada tema:
 *   id        la clave de la URL (/ayuda?tema=inventario) y del ancla.
 *   ruta      la pantalla de la que habla. El "?" de la barra de arriba abre
 *             la ayuda del tema cuya ruta coincide con donde se está parado.
 *   grupo     igual que el menú lateral: el día a día, Catálogo, Ventas,
 *             Personas, y lo general.
 *   soloAdmin el empleado no lo ve: esas pantallas tampoco las tiene.
 *   resumen   para qué sirve, en una frase.
 *   pasos     cómo se usa, en orden.
 *   consejos  lo que conviene saber y no es obvio.
 *
 * OJO: si una pantalla cambia (un botón, un campo), cambia su tema aquí. Una
 * ayuda que describe botones que ya no existen confunde más que no tenerla.
 * ============================================================
 */

export const GRUPOS_AYUDA = [
  { id: 'general', nombre: 'Para empezar' },
  { id: 'diario', nombre: 'El día a día' },
  { id: 'catalogo', nombre: 'Catálogo' },
  { id: 'ventas', nombre: 'Ventas' },
  { id: 'personas', nombre: 'Personas' },
];

export const TEMAS_AYUDA = [
  {
    id: 'primeros-pasos',
    grupo: 'general',
    titulo: 'Cómo se usa el panel',
    Icono: Compass,
    resumen: 'El panel es donde se maneja la tienda: pedidos, productos, precios, promociones y personas.',
    pasos: [
      'El menú de la izquierda (en el teléfono, el botón ☰ de arriba) tiene todas las pantallas. Dashboard, Pedidos e Inventario son las del día a día; Catálogo, Ventas y Personas se despliegan cuando hay que configurar algo.',
      'El botón con la paleta, arriba, cambia los colores del panel y el tamaño del texto. Hay paletas pensadas para quien ve poco, para leer mucho rato y para descansar la vista.',
      'El botón “?” de arriba abre la ayuda de la pantalla en la que usted está.',
      'Tiqui, abajo a la derecha, contesta preguntas sobre la tienda y hace cambios si se los pide.',
      'Para salir, toque su nombre arriba a la derecha y elija “Cerrar sesión”.',
    ],
    consejos: [
      'Un empleado ve solo el Dashboard y los Pedidos: precios, promociones, clientes y ajustes son del administrador.',
    ],
  },
  {
    id: 'tiqui',
    grupo: 'general',
    titulo: 'Tiqui, su asistente',
    Icono: Sparkles,
    resumen: 'Se sabe los números del negocio, le ayuda a vender mejor y hace cambios cuando usted se los confirma.',
    pasos: [
      'Tóquela abajo a la derecha y háblele, o escríbale en el cuadro de texto.',
      'Pregúntele lo que quiera saber: “¿cómo vamos hoy?”, “¿qué pedidos esperan?”, “¿qué se está acabando?”, “¿cuánto les debemos a los proveedores?”.',
      'Como ayudante de ventas, avisa si una promoción deja pérdida, si algo se vende por debajo del costo, qué caduca pronto y qué no se mueve. Pregúntele “¿qué me recomiendas para vender más?”.',
      'Puede mover pedidos, cambiar existencias y precios, mostrar u ocultar productos, prender, apagar o ajustar promociones y cambiar la temporada. Antes de hacer algo siempre pregunta “¿Lo hago?”: nada cambia hasta que usted dice que sí.',
    ],
    consejos: [
      'Si hay algo urgente, como una promoción que está dejando pérdida, se lo dice apenas la abre.',
      'El empleado puede pedirle que mueva pedidos; lo demás solo lo cambia el administrador.',
    ],
  },
  {
    id: 'dashboard',
    ruta: '/dashboard',
    grupo: 'diario',
    titulo: 'Dashboard',
    Icono: LayoutDashboard,
    resumen: 'Cómo va la tienda hoy, de un vistazo.',
    pasos: [
      'Arriba están los pedidos de hoy, los entregados de la semana, lo que entró hoy y lo que hay que reponer, cada uno comparado con el día o la semana anterior.',
      'Inversión, ganancia real y margen dicen cuánto costó lo que se vendió y cuánto quedó de verdad. Si el margen sale en rojo, se está vendiendo por debajo del costo.',
      'La gráfica compara ventas y compras por semana o por mes.',
      '“Requiere tu atención” junta lo urgente: pedidos que esperan, productos que se acaban o que caducan.',
      'Más abajo: lo más vendido, cuánto vende cada módulo de la tienda y lo que nadie ha comprado.',
      '“Descargar” saca el resumen de la tienda en PDF (del periodo que elija), el inventario completo o, para el administrador, el reporte predictivo.',
    ],
    consejos: [
      'Lo que “nadie ha comprado” es buen candidato para una promoción o para dejar de surtirlo.',
    ],
  },
  {
    id: 'pedidos',
    ruta: '/pedidos',
    grupo: 'diario',
    titulo: 'Pedidos',
    Icono: ShoppingBag,
    resumen: 'Los pedidos de los clientes, desde que pagan hasta que los reciben.',
    pasos: [
      'Arriba están los estados: por preparar, en preparación, en camino (a domicilio), listos para recoger y entregados. Toque uno para ver solo esos.',
      'Cada pedido trae el botón de su siguiente paso: “Empezar a preparar”, después “en camino” o “listo para recoger”, según cómo lo pidió, y al final “entregado”.',
      'Para marcarlo entregado hace falta el código de 4 dígitos que el cliente ve en su pedido: así se sabe que llegó a la persona correcta.',
      'Busque por el nombre del cliente o por el número del pedido, el que empieza con #.',
      'En los pedidos de impresiones, “Imprimir” abre el archivo que mandó el cliente, listo para la impresora.',
      'Para cancelar un pedido, toque “Cancelar” y escriba el motivo (o elija uno de los rápidos). Al cliente le llega tal cual. Los productos vuelven al inventario y, si pagó con su saldo o canjeó puntos, se le devuelven solos.',
    ],
    consejos: [
      'Al cliente le llega un aviso cada vez que su pedido cambia de estado. Si se cancela, le llega también el motivo, por notificación y por correo.',
      'Un pedido entregado ya no se cancela, y uno cancelado ya no se reabre: si hubo un error, se hace un pedido nuevo. Los cancelados se ven en el filtro “Cancelados”.',
      'El reparto con GPS se hace desde la app del teléfono: “¿Trabajas en la tienda?” en el inicio de sesión.',
    ],
  },
  {
    id: 'inventario',
    ruta: '/inventario',
    grupo: 'diario',
    soloAdmin: true,
    titulo: 'Inventario',
    Icono: Package,
    resumen: 'Todos los productos, con sus precios, costos y existencias.',
    pasos: [
      '“Añadir producto” abre el formulario: nombre, categoría, marca, proveedor, costo, precio, existencias y su máximo, fecha de vencimiento y fotos.',
      'En “¿Cómo se vende?” elija por unidad o por libra (lo que se vende a granel).',
      'El código de barras se puede escanear. Si lo deja vacío, se genera uno interno.',
      'Marque “Solo para mayores de 18” en cerveza, cigarros y similares: la tienda pide confirmar la edad y al entregar se pide documento.',
      'Filtre por categoría o busque por nombre. Al tocar un producto lo ve completo, y desde ahí se edita o se elimina.',
      '“Importar desde Excel” carga muchos productos de una vez: suba su .xlsx o .csv (basta con nombre y precio), revise qué columna es cuál y la IA completa la marca, el pasillo, la categoría, si va por libra o es +18, y busca la foto de cada uno. Antes de guardar ve la lista, quita lo que no quiera y lo que ya existe se omite solo.',
    ],
    consejos: [
      'Con código de barras en el Excel, la foto sale exacta. Las fotos salen de Open Food Facts (una base abierta de productos) y la tienda menciona de dónde son; si no aparece, póngasela después con “Editar”.',
      'El máximo de cada producto sirve para saber cuándo reponer: con 25% o menos de su máximo, sale en “Por reponer”.',
      'Cargue siempre el costo: sin él no se puede saber la ganancia ni si una promoción deja pérdida.',
    ],
  },
  {
    id: 'categorias',
    ruta: '/categorias',
    grupo: 'catalogo',
    soloAdmin: true,
    titulo: 'Categorías',
    Icono: Shapes,
    resumen: 'Los grupos en que se ordenan los productos: lácteos, bebidas, snacks…',
    pasos: [
      '“Agregar categoría”, póngale nombre y guárdela.',
      'Cada producto se asigna a una categoría al crearlo o editarlo en el Inventario.',
    ],
    consejos: [
      'La tienda usa las categorías para sus filtros y para armar secciones de la portada, y en Promociones se puede rebajar una categoría completa de una vez.',
    ],
  },
  {
    id: 'marcas',
    ruta: '/marcas',
    grupo: 'catalogo',
    soloAdmin: true,
    titulo: 'Marcas',
    Icono: Tag,
    resumen: 'Las marcas de los productos: ayudan a buscarlos y a ordenarlos.',
    pasos: [
      '“Agregar marca”, escriba el nombre y guárdela.',
      'Después, en el Inventario, elija la marca de cada producto.',
    ],
    consejos: [],
  },
  {
    id: 'modulos',
    ruta: '/modulos',
    grupo: 'catalogo',
    soloAdmin: true,
    titulo: 'Módulos',
    Icono: Blocks,
    resumen: 'Las áreas o pasillos de la tienda: abarrotes, bebidas, papelería…',
    pasos: [
      '“Agregar módulo” con su nombre y una descripción corta.',
      'Cada producto pertenece a un módulo. En la tienda se recorren como pasillos.',
    ],
    consejos: [
      'El Dashboard muestra cuánto vende cada módulo: dice qué área de la tienda está rindiendo.',
    ],
  },
  {
    id: 'impresiones',
    ruta: '/servicios-impresion',
    grupo: 'catalogo',
    soloAdmin: true,
    titulo: 'Impresiones',
    Icono: Printer,
    resumen: 'El servicio de impresiones: los formatos que se imprimen, su precio y el papel que gastan.',
    pasos: [
      'Los formatos de uso general ya vienen cargados. En “Agregar formato” se crean los propios: nombre, tamaño, precio por copia, recargo por color y el papel que usa.',
      'En Materiales se anota cuánto papel o tinta queda y desde qué cantidad avisar que se está acabando.',
    ],
    consejos: [
      'Actualice lo que queda cuando llega papel o se acaba un cartucho: el “Avisar desde” le marca a tiempo cuándo reponer.',
    ],
  },
  {
    id: 'pronostico',
    ruta: '/pronostico',
    grupo: 'ventas',
    soloAdmin: true,
    titulo: 'Pronóstico',
    Icono: TrendingUp,
    resumen: 'Lo que se espera vender las próximas 4 semanas, qué se agotaría y qué conviene pedir a cada proveedor.',
    pasos: [
      'Se calcula al abrirla, con el historial de ventas. Si el servicio de análisis estaba en reposo, la primera vez del día puede tardar hasta un minuto; después abre al instante.',
      'Arriba están la venta esperada de las próximas 4 semanas y de la próxima semana, cada una con su rango: lo más probable es que la venta caiga entre esos dos montos. Al lado, lo que de verdad se vendió en las 4 semanas anteriores.',
      'El resumen dice en palabras lo más importante. La gráfica pone las semanas que pasaron junto a las que vienen, con la línea del rango.',
      '“Productos que se agotarían” dice cuándo se acabaría cada uno con la venta esperada y lo antes que podría pasar.',
      '“Compra sugerida” separa por proveedor cuánto pedir para llegar a la próxima compra y cuánto costaría.',
      'Junto a cada proveedor está el botón para pedírselo: “Pedir por WhatsApp” abre WhatsApp con el mensaje y la lista ya escritos; “Pedir en BEES” (o la app que sea) abre la app con la lista copiada para pegarla; “Llamar” marca su número. Si dice “Indicar cómo se le pide”, falta decirlo en Proveedores.',
      '“Actualizar” lo vuelve a calcular con las ventas más recientes; “Descargar PDF” saca el reporte predictivo para imprimir o compartir.',
      'Arriba puede elegir “Tienda real” o “Demostración”. La demostración muestra el pronóstico con 3 meses y medio de ventas inventadas, para ver todo lo que hace cuando hay historia; la tienda real no cambia, y el PDF dice que es una demostración.',
    ],
    consejos: [
      'Con pocas semanas de ventas el pronóstico es preliminar, y así lo dice. Mejora con cada semana que pasa.',
      'Con menos de 3 días de venta no se sugiere cuánto pedir de un producto: todavía no hay base para decirlo.',
      'Pregúntele a Tiqui “¿qué tengo que pedir esta semana?” o “¿qué se va a agotar?”.',
    ],
  },
  {
    id: 'promociones',
    ruta: '/promociones',
    grupo: 'ventas',
    soloAdmin: true,
    titulo: 'Promociones',
    Icono: Megaphone,
    resumen: 'Las ofertas que se ven en la tienda y que el carrito cobra solo.',
    pasos: [
      '“Agregar promoción” y elija el tipo: Descuento (un porcentaje menos), Precio fijo (un precio especial), NxM (lleve 3, pague 2) o Anuncio (destaca productos sin rebajarlos).',
      'Agregue los productos uno por uno o una categoría completa.',
      'Diseñe el banner: colores, icono o una imagen propia, título y descripción. La vista previa muestra cómo se verá en la tienda.',
      '“Vence el” es opcional: al pasar la fecha, la promoción se apaga sola.',
      'Déjela activa para que se aplique. La primera vez que se enciende, se avisa a los clientes por correo y en el teléfono.',
    ],
    consejos: [
      'Una promoción sin anuncio rebaja el precio pero no sale en el carrusel ni se avisa: sirve para un descuento discreto.',
      'Tiqui revisa que ninguna promoción deje pérdida. Pregúntele “¿cómo van las promociones?”.',
    ],
  },
  {
    id: 'fidelidad',
    ruta: '/fidelidad',
    grupo: 'ventas',
    soloAdmin: true,
    titulo: 'Fidelidad',
    Icono: Award,
    resumen: 'Los puntos que ganan los clientes al comprar y cómo los canjean.',
    pasos: [
      'Elija cuántos puntos se ganan por cada dólar de compra.',
      'Diga a los cuántos meses vencen los puntos.',
      'Elija cuántos puntos equivalen a un dólar al canjear y el mínimo de puntos para poder canjear.',
      '“Programa activo” lo enciende o lo apaga. La pantalla muestra un ejemplo con los números que ponga.',
    ],
    consejos: [
      'Los clientes ven sus puntos en su cuenta y los usan como descuento al pagar.',
    ],
  },
  {
    id: 'tarjetas',
    ruta: '/tarjetas',
    grupo: 'ventas',
    soloAdmin: true,
    titulo: 'Tarjetas de regalo',
    Icono: Gift,
    resumen: 'Tarjetas con saldo que el cliente canjea en su cuenta y usa para pagar.',
    pasos: [
      '“Crear tarjetas”: el monto, cuántas (hasta 100 de una vez), un vencimiento si quiere y una nota, por ejemplo “Rifa de aniversario”.',
      'Cada una lleva su propio código. Cópielo con el botón para entregarlo.',
      'Busque por código, cliente o monto. Una tarjeta entregada por error se puede anular.',
    ],
    consejos: [],
  },
  {
    id: 'personalizacion',
    ruta: '/personalizacion',
    grupo: 'ventas',
    soloAdmin: true,
    titulo: 'Personalización',
    Icono: Palette,
    resumen: 'Cómo se ve la tienda y cómo cobra.',
    pasos: [
      'Identidad: el nombre, el logo y los datos del negocio, como la dirección y el WhatsApp.',
      'Apariencia: la temporada (automática según la fecha, puesta a mano o ninguna), sus temporadas propias y el mensaje de la cinta de arriba de la tienda.',
      'Envío y cobros: cuánto cuesta el envío (fijo, por distancia o por zonas) y la tarifa de servicio (un monto fijo o un porcentaje).',
      'Portada: el orden de las secciones que ve el cliente al entrar.',
    ],
    consejos: [
      'La dirección de la tienda es de donde salen los repartos: con ella se calcula el envío por distancia.',
    ],
  },
  {
    id: 'clientes',
    ruta: '/clientes',
    grupo: 'personas',
    soloAdmin: true,
    titulo: 'Clientes',
    Icono: UserSquare2,
    resumen: 'Quién le compra: sus datos de contacto, si verificó su correo y sus puntos.',
    pasos: [
      'Arriba verá cuántos clientes hay, cuántos están activos y cuántos no han verificado su correo.',
      'Busque por nombre, correo o teléfono.',
      'Para eliminar a un cliente, toque “Ver más” en su tarjeta y luego “Eliminar cliente”. Se borran su cuenta y sus datos personales; sus pedidos se quedan en la contabilidad, sin nada que lo identifique.',
    ],
    consejos: [
      'Los datos de los clientes solo los ve el administrador. Úselos únicamente para atender sus pedidos.',
      'Si un cliente pide que borren sus datos, así se hace. Si tiene un pedido en curso, primero hay que entregarlo o cancelarlo. Eliminar no se puede deshacer.',
    ],
  },
  {
    id: 'empleados',
    ruta: '/empleados',
    grupo: 'personas',
    soloAdmin: true,
    titulo: 'Empleados',
    Icono: Users,
    resumen: 'Las cuentas del personal que entra al panel y a la app de reparto.',
    pasos: [
      '“Añadir empleados” con su nombre, correo, teléfono y DUI.',
      'El empleado entra al panel con su correo, su contraseña y el código que le llega al correo.',
      'En el teléfono entra por “¿Trabajas en la tienda?” y ve el Reparto: sus pedidos a domicilio, la ruta y el código de entrega.',
    ],
    consejos: [
      'Un empleado ve solo el Dashboard y los Pedidos. Precios, promociones, clientes y ajustes quedan para el administrador.',
    ],
  },
  {
    id: 'proveedores',
    ruta: '/proveedores',
    grupo: 'personas',
    soloAdmin: true,
    titulo: 'Proveedores',
    Icono: Truck,
    resumen: 'A quién le compra la tienda, por dónde se le pide y cuánto se le debe a cada uno.',
    pasos: [
      '“Agregar proveedor” con sus datos de contacto.',
      'En “Estado de cuenta” registre cada compra al crédito y cada pago. El número de factura (F-0001) o de recibo (R-0001) se pone solo; si el papel trae otro, escríbalo encima.',
      'Ponga el límite de crédito y el plazo en días: la fecha de pago de cada factura se calcula sola.',
      'Lo vencido sale arriba, en rojo. Las facturas por pagar se pueden mandar al calendario del teléfono con “Calendario” o con el código QR.',
      'En “Cómo se le hacen los pedidos” elija WhatsApp (con su número), una app o sitio como BEES (con su enlace) o llamada. Con eso, la compra sugerida del Pronóstico se le pide con un toque.',
    ],
    consejos: [
      'Si paga de más, la diferencia queda a favor para la próxima factura.',
      'BEES y apps parecidas no reciben pedidos de otros sistemas: el botón abre la app con la lista copiada, y usted la pega en el carrito.',
    ],
  },
  {
    id: 'cuenta',
    ruta: '/cuenta',
    grupo: 'personas',
    titulo: 'Su cuenta y los colores',
    Icono: Settings,
    resumen: 'Sus datos, su contraseña y los colores del panel.',
    pasos: [
      'Actualice su nombre, usuario, correo, teléfono y contraseña.',
      'En “Colores y lectura” elija la paleta que le resulte más cómoda: Mi marca (la de siempre), Lectura (sepia, para leer mucho rato), Contraste reforzado (para quien ve poco), Modo oscuro, Calma y Calma noche.',
      'Debajo, en Lectura: el tamaño del texto (normal, grande o muy grande), más espacio entre líneas, menos animaciones y resaltar enlaces y foco.',
    ],
    consejos: [
      'Lo mismo está a un clic desde cualquier pantalla, en el botón de la paleta de la barra de arriba.',
      'Calma y Calma noche usan colores suaves y menos brillo, sin dejar de leerse bien: pensadas para quien se cansa o se abruma con la pantalla. Calma es clara y Calma noche es su versión oscura.',
      'Contraste reforzado se lee mejor junto con el texto grande.',
      'Los colores y la lectura se guardan en esta computadora o teléfono: cada persona puede tener los suyos.',
    ],
  },
];

// Los temas que le tocan a quien entró: el empleado no ve los de pantallas que no tiene.
export const temasPara = (esAdmin) => TEMAS_AYUDA.filter((t) => esAdmin || !t.soloAdmin);

// El tema de la pantalla en la que se está (para el "?" de la barra de arriba).
export const temaDeRuta = (pathname = '') =>
  TEMAS_AYUDA.find((t) => t.ruta && (pathname === t.ruta || pathname.startsWith(`${t.ruta}/`)))?.id || null;

const plano = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Buscar en título, resumen, pasos y consejos, sin importar tildes ni mayúsculas.
export const buscarEnTemas = (temas, texto) => {
  const q = plano(texto).trim();
  if (!q) return temas;
  const palabras = q.split(/\s+/);
  return temas.filter((t) => {
    const todo = plano([t.titulo, t.resumen, ...t.pasos, ...t.consejos].join(' '));
    return palabras.every((w) => todo.includes(w));
  });
};
