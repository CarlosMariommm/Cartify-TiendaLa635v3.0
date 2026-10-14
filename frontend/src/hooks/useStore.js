import { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';
import { avisarAgregado, avisarQuitado } from '../utils/avisoCarrito';
import { volarAlCarrito } from '../utils/volarAlCarrito';
import { productService } from '../api/productService';
import { promotionService } from '../api/promotionService';
import { promoVigente } from '../utils/promos';
import { familiasQueCoinciden } from '../utils/familias';
import { familiaDeProducto } from '../utils/similitud';
import { aplicarFiltros, FILTROS_VACIOS, marcasDe } from '../utils/filtrosTienda';
import { cantidadConUnidad } from '../utils/unidades';
import { useAuth } from './useAuth';
import { tAhora } from '../utils/idioma';

/*
 * useStore — estado de la tienda (catálogo real + carrito) con PROMOCIONES.
 *
 * Al cargar, trae productos y promociones, y aplica a cada producto su promo:
 *   - descuento   → precio con % de descuento (precioAnterior = original).
 *   - precio_fijo → precio fijo de oferta      (precioAnterior = original).
 *   - nxm         → precio normal, pero el CARRITO cobra "compra N paga M".
 */

// Los productos que toca una promo, ya vengan poblados o como puro id.
export const idsDePromo = (promo) =>
  (promo?.items || [])
    .map((it) => (typeof it.productId === 'object' ? it.productId?._id : it.productId))
    .filter(Boolean);

/*
 * Mapa productId -> info de promo. "Vigente" incluye la fecha: una promo que
 * venció anoche no puede seguir bajando precios hoy solo porque nadie recargó
 * la lista.
 *
 * Un producto puede estar en VARIAS promos vigentes a la vez: por ejemplo un
 * "anuncio" que solo lo destaca (sin tocar el precio) y un "descuento" que sí
 * se lo baja. Cuando eso pasa gana la que AFECTA EL PRECIO por encima del
 * anuncio, y entre dos que afectan el precio, la más nueva. Antes ganaba
 * simplemente la primera de la lista —muchas veces el anuncio, que devuelve el
 * precio de siempre—, así que el descuento recién creado quedaba tapado y no
 * se veía en ningún lado.
 */
const prioridadPromo = (tipo) => (tipo === 'anuncio' ? 0 : 1);

const construirMapaPromo = (promos) => {
  const mapa = {};
  const ordenadas = (promos || [])
    .filter(promoVigente)
    .sort((a, b) =>
      prioridadPromo(b.type) - prioridadPromo(a.type) ||
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

  ordenadas.forEach((pr) => {
    (pr.items || []).forEach((it) => {
      const pid = typeof it.productId === 'object' ? it.productId?._id : it.productId;
      if (!pid || mapa[pid]) return;
      mapa[pid] = {
        type: pr.type,
        discount: it.discount || 0,
        fixedPrice: it.fixedPrice,
        buyQty: pr.buyQty || 2,
        payQty: pr.payQty || 1,
        // Solo el anuncio la trae: es su sello, ya que no tiene ahorro.
        etiqueta: pr.etiqueta || '',
      };
    });
  });
  return mapa;
};

// Adapta un producto real al formato de la tienda, aplicando su promo si tiene.
const mapearProducto = (p, mapaPromo = {}) => {
  const base = Number(p.salePrice) || 0;
  const promo = mapaPromo[p._id];
  let precio = base;
  let precioAnterior = null;
  let promoInfo = null;

  if (promo) {
    if (promo.type === 'descuento' && promo.discount > 0) {
      precio = Number((base * (1 - promo.discount / 100)).toFixed(2));
      precioAnterior = base;
      promoInfo = { type: 'descuento', discount: promo.discount };
    } else if (promo.type === 'precio_fijo' && promo.fixedPrice != null && promo.fixedPrice !== '') {
      precio = Number(promo.fixedPrice);
      precioAnterior = base;
      promoInfo = { type: 'precio_fijo' };
    } else if (promo.type === 'nxm') {
      promoInfo = { type: 'nxm', buyQty: promo.buyQty, payQty: promo.payQty };
    } else if (promo.type === 'anuncio') {
      /*
       * El anuncio NO toca el precio: solo le pone su sello al producto para
       * que destaque en la tienda. Por eso no se define precioAnterior — si no,
       * la tarjeta mostraría un precio tachado igual al vigente.
       */
      promoInfo = { type: 'anuncio', etiqueta: promo.etiqueta || 'Nuevo' };
    }
  }

  return {
    id: p._id,
    nombre: p.name || '',
    marca: p.brandId?.name || '',
    categoria: p.typeId?.type || 'General',
    modulo: p.moduleId?.name || '',
    // El id además del nombre: filtrar por pasillo con el nombre se rompía en
    // cuanto alguien le corregía una tilde al módulo.
    moduloId: p.moduleId?._id || p.moduleId || null,
    precio,
    precioAnterior,
    promo: promoInfo,
    descripcion: p.description || '',
    /*
     * Cómo se vende. Va tal cual en el producto de la tienda porque lo
     * necesitan la tarjeta (para el "/lb"), el detalle y el carrito (para
     * moverse de media en media libra). Ver utils/unidades.js.
     */
    unidadVenta: p.unidadVenta === 'libra' ? 'libra' : 'unidad',
    // En cuántas piezas están esas libras, y si la venta es solo para mayores.
    piezas: p.piezas ?? null,
    soloAdultos: !!p.soloAdultos,
    stock: Number(p.stock) || 0,
    // Tope de stock del producto: sirve para saber si "se está acabando"
    // en relación a lo que normalmente tiene, no contra un número fijo.
    stockMaximo: Number(p.maxQuantity) || 0,
    imagen: Array.isArray(p.image) ? p.image[0] : p.image,
    // De dónde salió la foto si no es de la tienda (Open Food Facts, al importar
    // desde Excel): la ficha da el crédito que pide su licencia.
    fotoFuente: p.fotoFuente || '',
    esMasVendido: false,
    fechaExpiracion: p.expirationDate,
    creadoEn: p.createdAt,
  };
};

/*
 * ============================================================
 * EL CARRITO, GUARDADO — que no se pierda al salir de la tienda
 * ============================================================
 * El carrito vivía en un useState y nada más. Bastaba con salir un momento
 * —a marcar una dirección, a iniciar sesión, o darle sin querer a "atrás"—
 * para que al volver estuviera vacío. Y no es que se borrara: es que nunca
 * se había guardado en ningún lado.
 *
 * Ahora vive en el teléfono, con una llave POR PERSONA y otra para quien
 * todavía no entró — igual que la dirección activa (ver useDireccionActiva).
 * Así al cerrar sesión no queda a la vista el carrito de quien estaba antes:
 * su llave sencillamente ya no se lee.
 *
 * Y se guarda SOLO el id y la cantidad. Nunca el precio.
 *
 * Eso último es lo importante: un precio guardado en el navegador es un
 * precio de ayer, y el día que la tienda sube uno, quien tuviera el producto
 * en el carrito lo pagaría al viejo. Al no guardarlo no hay nada que
 * reconciliar — el precio, la promo y el stock salen siempre del catálogo
 * que se acaba de cargar.
 * ============================================================
 */
const llaveCarrito = (userId) => `kartify:carrito:${userId || 'invitado'}`;

// Aviso propio: `storage` solo lo oyen las OTRAS pestañas, nunca la que
// escribió. Sin esto, agregar desde la portada no movería el contador de arriba.
const EVENTO_CARRITO = 'kartify:carrito-cambio';

const suscribirCarrito = (avisar) => {
  window.addEventListener('storage', avisar);
  window.addEventListener(EVENTO_CARRITO, avisar);
  return () => {
    window.removeEventListener('storage', avisar);
    window.removeEventListener(EVENTO_CARRITO, avisar);
  };
};

// El navegador puede negarse a dar localStorage (modo privado, permisos). Que
// eso deje la tienda sin memoria es aceptable; que la tumbe, no.
const leerCrudo = (llave) => {
  try { return localStorage.getItem(llave); } catch { return null; }
};

/*
 * De lo guardado a algo confiable: [{ id, cantidad }] con cantidades enteras y
 * positivas. Se desconfía a propósito de lo que hay en el navegador — puede
 * venir de una versión vieja de la tienda o de alguien que lo editó a mano.
 */
const normalizarLineas = (crudo) => {
  try {
    const datos = JSON.parse(crudo || '[]');
    if (!Array.isArray(datos)) return [];
    return datos
      .map((l) => ({ id: String(l?.id ?? ''), cantidad: Math.floor(Number(l?.cantidad) || 0) }))
      .filter((l) => l.id && l.cantidad > 0);
  } catch {
    return [];
  }
};

const escribirLineas = (llave, lista) => {
  const lineas = (lista || [])
    .map((i) => ({ id: String(i.id), cantidad: Math.floor(Number(i.cantidad) || 0) }))
    .filter((l) => l.id && l.cantidad > 0);
  try {
    if (lineas.length) localStorage.setItem(llave, JSON.stringify(lineas));
    else localStorage.removeItem(llave);
  } catch { /* sin memoria, pero la tienda sigue funcionando */ }
  window.dispatchEvent(new Event(EVENTO_CARRITO));
};

/*
 * `promoInicial` es el id que llega en ?promo= — lo pone el botón "Ver la
 * promoción" del correo que se le manda a los clientes cuando la tienda
 * publica una. Sin esto, ese botón dejaba a la persona en la portada a buscar
 * a mano la oferta que le acababan de anunciar. Ver backend/utils/avisoPromo.js.
 */
export const useStore = ({ moduloInicial = null, busquedaInicial = '', promoInicial = null } = {}) => {
  const [productos, setProductos] = useState([]);
  // La lista cruda de promociones. Antes solo se usaba de paso para calcular
  // los precios y se tiraba; ahora hace falta guardarla para poder abrir una
  // por su id.
  const [promociones, setPromociones] = useState([]);
  /*
   * El pasillo en el que está parado el cliente. null = toda la tienda.
   * Viene de la pantalla de servicios (?modulo=) o de las pastillas de arriba.
   */
  const [moduloSeleccionado, setModuloSeleccionado] = useState(moduloInicial);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  // Arranca con lo que venga en ?q= (ver Store.jsx), o vacío.
  const [terminoBusqueda, setTerminoBusqueda] = useState(busquedaInicial);
  /*
   * Arranca en true porque el catálogo se pide en cuanto se monta la tienda.
   * Arrancaba en false y el efecto lo encendía DESPUÉS del primer cuadro: ese
   * cuadro salía sin esqueletos ni lugar reservado (la tienda "vacía") y al
   * siguiente todo se recorría. Lighthouse lo medía como un salto de 0.55.
   */
  const [cargando, setCargando] = useState(true);
  /*
   * La carga falló (servidor caído, sin internet…). Antes el error se tragaba
   * y la lista quedaba vacía, así que la tienda decía "Todavía no hay
   * productos": un problema de conexión se leía como un negocio sin nada que
   * vender. Ahora se sabe y se puede reintentar.
   */
  const [errorCarga, setErrorCarga] = useState(false);
  /*
   * Los filtros que elige el cliente: orden, precio, solo ofertas, solo lo
   * disponible y marca. Ver utils/filtrosTienda.js (la app filtra igual).
   */
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const cambiarFiltro = useCallback((clave, valor) => setFiltros((f) => ({ ...f, [clave]: valor })), []);
  const limpiarFiltros = useCallback(() => setFiltros(FILTROS_VACIOS), []);
  const [promoSeleccionada, setPromoSeleccionada] = useState(null);
  // Promo abierta en la ventana de detalle (el click al banner del carrusel).
  const [promoDetalle, setPromoDetalle] = useState(null);

  // Trae el catálogo y las promos. La usan el arranque y el botón "Reintentar".
  const traerTienda = useCallback(async () => {
    try {
      const [prods, promos] = await Promise.all([
        productService.getProducts(),
        promotionService.getPromotions().catch(() => []),
      ]);
      const activos = (Array.isArray(prods) ? prods : []).filter((p) => p.isActive !== false);
      const lista = Array.isArray(promos) ? promos : [];
      const mapaPromo = construirMapaPromo(lista);
      setProductos(activos.map((p) => mapearProducto(p, mapaPromo)));
      setPromociones(lista);
      setErrorCarga(false);
    } catch (error) {
      console.error('Error cargando la tienda:', error);
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      await traerTienda();
    };
    cargar();
  }, [traerTienda]);

  const reintentarCarga = useCallback(() => {
    setCargando(true);
    setErrorCarga(false);
    traerTienda();
  }, [traerTienda]);

  /*
   * Llegó por el enlace del correo: se le abre la promo que le anunciaron.
   *
   * Espera a que las promociones estén cargadas —el id sin la lista no sirve
   * de nada— y se desarma después de abrirla UNA vez. Sin ese candado, cerrar
   * el detalle lo volvía a abrir en el siguiente render y la ventana se
   * quedaba pegada: imposible de cerrar salvo recargando.
   *
   * Si la promo ya venció o la borraron, no pasa nada: se queda en la portada,
   * que es mejor que un error por algo que ya no existe.
   */
  const [promoDelEnlaceAbierta, setPromoDelEnlaceAbierta] = useState(false);
  if (promoInicial && !promoDelEnlaceAbierta && promociones.length) {
    setPromoDelEnlaceAbierta(true);
    const promo = promociones.find((p) => String(p._id) === String(promoInicial));
    if (promo) setPromoDetalle(promo);
  }

  /*
   * Escape cierra el detalle de la promo. El listener vive acá y no en el
   * componente porque el estado de apertura también vive acá: la ventana solo
   * pinta lo que el hook le dice.
   */
  useEffect(() => {
    if (!promoDetalle) return;
    const alTeclear = (e) => { if (e.key === 'Escape') setPromoDetalle(null); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [promoDetalle]);

  /*
   * El pasillo manda sobre todo lo demás: si el cliente entró a la Panadería,
   * las categorías, los destacados y la búsqueda son de la panadería. Por eso
   * el filtro de módulo se aplica ANTES que cualquier otro y todo lo demás
   * cuelga de aquí.
   */
  const productosDelPasillo = useMemo(() => {
    if (!moduloSeleccionado) return productos;
    return productos.filter((p) => String(p.moduloId) === String(moduloSeleccionado));
  }, [productos, moduloSeleccionado]);

  // Al cambiar de pasillo se suelta la categoría: la de la panadería no existe
  // en abarrotes, y la lista quedaría vacía sin explicación.
  const [pasilloVisto, setPasilloVisto] = useState(moduloSeleccionado);
  if (pasilloVisto !== moduloSeleccionado) {
    setPasilloVisto(moduloSeleccionado);
    setCategoriaSeleccionada(null);
    // Y la marca: puede no existir en el pasillo nuevo.
    setFiltros((f) => (f.marca ? { ...f, marca: '' } : f));
  }

  const categorias = useMemo(() => {
    const cats = new Set(productosDelPasillo.map((p) => p.categoria).filter(Boolean));
    return Array.from(cats).sort();
  }, [productosDelPasillo]);

  const productosFiltrados = useMemo(() => {
    let filtrados = productosDelPasillo;

    // Filtro por promo (banner): solo los productos de esa promo.
    if (promoSeleccionada) {
      const ids = idsDePromo(promoSeleccionada);
      filtrados = filtrados.filter((p) => ids.includes(p.id));
    }

    if (categoriaSeleccionada) {
      filtrados = filtrados.filter((p) => p.categoria === categoriaSeleccionada);
    }

    if (terminoBusqueda.trim()) {
      const busqueda = terminoBusqueda.toLowerCase().trim();
      /*
       * El buscador también entiende ESTANTES, no solo etiquetas.
       *
       * Nadie le pone "Bebida energizante" de nombre a una lata de Red Bull, así
       * que buscar "energizante" no encontraba ni una aunque la tienda tuviera
       * cinco. Lo mismo con "limpieza", "lácteos" o "papelería": son las
       * palabras con las que piensa el cliente, no las que trae la etiqueta.
       *
       * Suma resultados, nunca los quita: lo que ya se encontraba por nombre,
       * marca o categoría se sigue encontrando igual.
       */
      const familiasBuscadas = familiasQueCoinciden(busqueda);
      filtrados = filtrados.filter((p) =>
        p.nombre?.toLowerCase().includes(busqueda) ||
        p.marca?.toLowerCase().includes(busqueda) ||
        p.categoria?.toLowerCase().includes(busqueda) ||
        (familiasBuscadas && familiasBuscadas.has(familiaDeProducto(p)))
      );
    }

    return aplicarFiltros(filtrados, filtros);
  }, [productosDelPasillo, categoriaSeleccionada, terminoBusqueda, filtros, promoSeleccionada]);

  // Las marcas del pasillo, para el filtro.
  const marcasDisponibles = useMemo(() => marcasDe(productosDelPasillo), [productosDelPasillo]);

  const productosDestacados = useMemo(() => productosDelPasillo.slice(0, 6), [productosDelPasillo]);

  /*
   * Los productos de la promo que se está mirando en detalle. Salen del
   * catálogo ya mapeado, no de promo.items, para que se vean con su precio de
   * oferta y su stock real — los mismos que verá en la tienda.
   */
  const productosDePromo = useMemo(() => {
    if (!promoDetalle) return [];
    const ids = idsDePromo(promoDetalle);
    return productos.filter((p) => ids.includes(p.id));
  }, [productos, promoDetalle]);

  // Abrir el detalle de una promo (click al banner) y cerrarlo.
  const abrirPromo = (promo) => setPromoDetalle(promo);
  const cerrarPromo = () => setPromoDetalle(null);

  /*
   * "Ver todos en la tienda": cierra el detalle y deja la lista filtrada a esa
   * promo, limpiando categoría y búsqueda para que no se peleen entre filtros.
   */
  const verPromoEnTienda = (promo) => {
    setPromoSeleccionada(promo || promoDetalle);
    setCategoriaSeleccionada(null);
    setTerminoBusqueda('');
    setPromoDetalle(null);
  };

  /* ══════════════ EL CARRITO ══════════════ */

  const { user } = useAuth();
  const llave = llaveCarrito(user?.id);

  /*
   * localStorage es estado que vive FUERA de React; leerlo con un efecto que
   * llama a setState provoca un render de más y el linter lo rechaza con
   * razón. useSyncExternalStore es la herramienta hecha para esto — y de
   * regalo, dos pestañas abiertas ven el mismo carrito.
   */
  const guardado = useSyncExternalStore(
    suscribirCarrito,
    () => leerCrudo(llave),
    () => null
  );

  const lineas = useMemo(() => normalizarLineas(guardado), [guardado]);

  /*
   * El carrito que se ve = lo guardado CASADO con el catálogo de hoy.
   *
   * Por eso un producto que la tienda dio de baja o que se quedó sin stock
   * desaparece solo, y una cantidad guardada mayor a lo que hay se recorta a
   * lo que hay. Mientras el catálogo no haya cargado no se muestra nada: es
   * preferible un carrito que tarda un instante a uno que enseña precios que
   * ya no son.
   */
  const carrito = useMemo(() => {
    if (lineas.length === 0 || productos.length === 0) return [];
    const porId = new Map(productos.map((p) => [String(p.id), p]));
    return lineas.reduce((lista, linea) => {
      const p = porId.get(linea.id);
      if (!p || p.stock <= 0) return lista;
      lista.push({ ...p, cantidad: Math.min(linea.cantidad, p.stock) });
      return lista;
    }, []);
  }, [lineas, productos]);

  const guardarCarrito = useCallback((lista) => escribirLineas(llave, lista), [llave]);

  /*
   * Las líneas guardadas AHORA, no las de este render.
   *
   * Agregar, quitar y cambiar partían de `carrito`, que es la foto del último
   * render. Tiqui hace varias cosas de una sola vez ("dos cocas, un pan y una
   * leche"): la segunda partía de la misma foto que la primera y la pisaba, y
   * del pedido entero solo quedaba lo último. localStorage se escribe al
   * instante, así que leerlo aquí siempre trae lo más nuevo.
   */
  const lineasAhora = () => normalizarLineas(leerCrudo(llave));

  /*
   * Cuando el catálogo termina de cargar, lo guardado se limpia de una vez:
   * lo que ya no existe se borra del navegador y lo que se recortó se guarda
   * recortado. Si no, la corrección se rehacía en cada visita y el aviso
   * volvía a salir cada vez.
   *
   * Se avisa porque callarlo es peor: quien pidió tres y recibe dos merece
   * enterarse ahora y no en la puerta de su casa.
   */
  const yaConciliado = useRef(false);
  useEffect(() => {
    if (cargando || yaConciliado.current) return;
    // Catálogo vacío = la API no respondió. Ahí no se toca nada: borrarle el
    // carrito a alguien porque se cayó el servidor sería el peor arreglo.
    if (productos.length === 0 || lineas.length === 0) return;
    yaConciliado.current = true;

    const fuera = lineas.length - carrito.length;
    const recortados = carrito.filter((i) => {
      const guardada = lineas.find((l) => l.id === String(i.id));
      return guardada && guardada.cantidad > i.cantidad;
    }).length;

    if (fuera === 0 && recortados === 0) return;

    guardarCarrito(carrito);

    const partes = [];
    if (fuera > 0) {
      partes.push(fuera === 1
        ? tAhora('un producto ya no está disponible')
        : tAhora('{n} productos ya no están disponibles', { n: fuera }));
    }
    if (recortados > 0) {
      partes.push(recortados === 1
        ? tAhora('de otro quedaban menos unidades de las que llevaba')
        : tAhora('de {n} quedaban menos unidades de las que llevaba', { n: recortados }));
    }
    toast(tAhora('De tu carrito guardado, {partes}. Ya está corregido.', { partes: partes.join(tAhora(' y ')) }), { duration: 6000 });
  }, [cargando, productos, lineas, carrito, guardarCarrito]);

  /*
   * Al iniciar sesión, lo que llenó como invitado se pasa a su cuenta.
   *
   * Sin esto el arreglo quedaba a medias justo donde más duele: la tienda se
   * recorre sin cuenta, el carrito se llena sin cuenta, y al pedir la sesión
   * para pagar la llave cambiaba y el carrito aparecía vacío. Se toma la
   * cantidad mayor de las dos, nunca la suma, para no duplicar sin querer.
   */
  useEffect(() => {
    if (!user?.id) return;
    const deInvitado = normalizarLineas(leerCrudo(llaveCarrito(null)));
    if (deInvitado.length === 0) return;

    const suyo = llaveCarrito(user.id);
    const fusion = [...normalizarLineas(leerCrudo(suyo))];
    deInvitado.forEach((linea) => {
      const i = fusion.findIndex((f) => f.id === linea.id);
      if (i === -1) fusion.push(linea);
      else fusion[i] = { ...fusion[i], cantidad: Math.max(fusion[i].cantidad, linea.cantidad) };
    });

    try { localStorage.removeItem(llaveCarrito(null)); } catch { /* ya está */ }
    escribirLineas(suyo, fusion);
  }, [user?.id]);

  /*
   * `origen` es la foto desde donde se tocó "+": si viene, sale volando hasta
   * el botón del carrito. El asistente de voz agrega sin foto de origen y ahí
   * no vuela nada — solo sale el aviso.
   *
   * `hastaDondeAlcance` es para Tiqui: si piden 74 y quedan 12, entran las 12
   * (el "+" de una tarjeta, en cambio, no agrega nada de más). Devuelve cuánto
   * entró DE VERDAD, para que Tiqui diga eso y no lo que se pidió: decía
   * "Agregué 74 Manzana" sobre un carrito que había rechazado las 74.
   */
  const agregarAlCarrito = (producto, cantidad = 1, { origen, hastaDondeAlcance = false } = {}) => {
    if (!producto?.id) return 0;
    const stock = Number(producto.stock) || 0;
    if (stock <= 0) {
      toast.error(tAhora('{nombre} se quedó sin existencias', { nombre: producto.nombre }));
      return 0;
    }

    const id = String(producto.id);
    const actuales = lineasAhora();
    const enCarrito = actuales.find((l) => l.id === id)?.cantidad || 0;
    const cabe = stock - enCarrito;
    let entra = cantidad;
    if (cantidad > cabe) {
      if (!hastaDondeAlcance || cabe <= 0) {
        // "Solo hay 3 unidades" de un queso que se vende por peso confunde:
        // se dice en la unidad en que se vende. Ver utils/unidades.js.
        toast.error(tAhora('Solo hay {cantidad} disponibles', { cantidad: cantidadConUnidad(producto, stock) }));
        return 0;
      }
      entra = cabe;
    }
    const nuevaCantidad = enCarrito + entra;

    guardarCarrito(
      enCarrito
        ? actuales.map((l) => (l.id === id ? { ...l, cantidad: nuevaCantidad } : l))
        : [...actuales, { id, cantidad: entra }]
    );

    volarAlCarrito(origen);

    /*
     * El aviso dice cuántos lleva, no solo que se agregó: al segundo click el
     * texto era idéntico y no había forma de saber si el toque contó.
     * Es la píldora oscura de la landing page, abajo al centro; ver
     * utils/avisoCarrito.jsx.
     */
    avisarAgregado(
      nuevaCantidad > 1
        ? tAhora('{nombre} · {cantidad} en el carrito', { nombre: producto.nombre, cantidad: cantidadConUnidad(producto, nuevaCantidad) })
        : tAhora('Agregaste {nombre} al carrito', { nombre: producto.nombre })
    );
    return entra;
  };

  // Quitar y cambiar también parten de lo guardado ahora (ver lineasAhora).
  const eliminarDelCarrito = (productoId) => {
    const id = String(productoId);
    const fuera = carrito.find((i) => String(i.id) === id);
    guardarCarrito(lineasAhora().filter((l) => l.id !== id));
    avisarQuitado(fuera ? tAhora('{nombre} salió del carrito', { nombre: fuera.nombre }) : tAhora('Producto eliminado'));
  };

  // Devuelve la cantidad con la que quedó: si pidieron más de lo que hay, el tope.
  const actualizarCantidad = (productoId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId);
      return 0;
    }
    const id = String(productoId);
    const actuales = lineasAhora();
    const linea = actuales.find((l) => l.id === id);
    const stock = Number(productos.find((p) => String(p.id) === id)?.stock) || 0;
    if (!linea || stock <= 0) return 0;
    // El tope se respeta también aquí, no solo en el botón: en el teléfono el
    // "+" se pulsa más rápido de lo que el render alcanza a deshabilitarlo.
    const cantidad = Math.min(nuevaCantidad, stock);
    if (cantidad === linea.cantidad) return cantidad;
    guardarCarrito(actuales.map((l) => (l.id === id ? { ...l, cantidad } : l)));
    return cantidad;
  };

  /*
   * `avisar` existe porque vaciar el carrito significa DOS cosas distintas.
   *
   * Cuando alguien toca "Vaciar", el aviso confirma que se hizo lo que pidió.
   * Pero al terminar un pedido el carrito también se vacía —lo comprado dejó
   * de estar pendiente— y ahí el mismo texto se lee como si algo se hubiera
   * perdido: "Se vació el carrito (3 productos)" justo después de pagar
   * parece un error, no el final feliz de una compra.
   */
  const limpiarCarrito = ({ avisar = true } = {}) => {
    const cuantos = carrito.length;
    guardarCarrito([]);
    if (cuantos && avisar) {
      avisarQuitado(tAhora(cuantos > 1 ? 'Se vació el carrito ({n} productos)' : 'Se vació el carrito ({n} producto)', { n: cuantos }));
    }
  };

  // Total del carrito, aplicando el NxM (cada N unidades, se pagan M).
  const totalCarrito = useMemo(
    () => carrito.reduce((total, item) => {
      if (item.promo?.type === 'nxm') {
        const b = item.promo.buyQty || 2;
        const m = item.promo.payQty || 1;
        const grupos = Math.floor(item.cantidad / b);
        const pagados = grupos * m + (item.cantidad % b);
        return total + item.precio * pagados;
      }
      return total + item.precio * item.cantidad;
    }, 0),
    [carrito]
  );

  const cantidadItems = useMemo(
    () => carrito.reduce((total, item) => total + item.cantidad, 0),
    [carrito]
  );

  return {
    productos,
    productosDelPasillo,
    moduloSeleccionado,
    setModuloSeleccionado,
    categorias,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    terminoBusqueda,
    setTerminoBusqueda,
    productosFiltrados,
    productosDestacados,
    carrito,
    totalCarrito,
    cantidadItems,
    agregarAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    limpiarCarrito,
    cargando,
    errorCarga,
    reintentarCarga,
    filtros,
    cambiarFiltro,
    limpiarFiltros,
    marcasDisponibles,
    promoSeleccionada,
    setPromoSeleccionada,
    promoDetalle,
    productosDePromo,
    abrirPromo,
    cerrarPromo,
    verPromoEnTienda,
  };
};
