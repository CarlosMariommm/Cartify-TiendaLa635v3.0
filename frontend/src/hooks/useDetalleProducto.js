import { useState, useEffect, useRef, useMemo } from 'react';
import { useEdad } from '../context/EdadContext';
import { useFavoritosCtx } from '../context/FavoritosContext';
import { esPorLibra, esSoloAdultos } from '../utils/unidades';
import { cargarTambienLlevan, elegirTambienLlevan } from '../utils/tambienLlevan';

/*
 * ============================================================
 * DETALLE DE UN PRODUCTO — useDetalleProducto.js
 * ============================================================
 * Todo lo que la ficha de producto necesita SABER, para que el componente
 * solo tenga que pintarlo: el candado del scroll, el "atrás" del navegador,
 * lo que se lleva junto, los recomendados, el candado +18 y el corazón de
 * favoritos.
 *
 * Vivía suelto dentro de ProductDetailModal, mezclado con doscientas líneas
 * de estilos. Aquí se lee de corrido y, sobre todo, se puede arreglar sin
 * pasar por encima del diseño.
 * ============================================================
 */

/*
 * "Hay una entrada nuestra en la historia."
 *
 * Se lleva la cuenta aquí y NO leyendo history.state, que era lo primero que
 * intenté: React Router pisa ese objeto con el suyo ({idx, key, usr}) en
 * cuanto la app toca la URL, así que la marca desaparecía en silencio.
 *
 * Y vive FUERA del hook, no en un ref, porque tiene que sobrevivir al ciclo
 * montar→desmontar→montar que StrictMode hace en desarrollo. Un ref nace de
 * cero en el segundo montaje y el hook empujaría una segunda entrada.
 */
let entradaPuesta = false;

export const useDetalleProducto = ({
  producto,
  onClose,
  onAgregarAlCarrito,
  todosLosProductos = [],
}) => {
  const [imgError, setImgError] = useState(false);

  /*
   * El contenedor que scrollea. Se necesita para dos cosas: devolverlo arriba
   * al cambiar de producto, y saber cuánto se ha bajado.
   */
  const contenedor = useRef(null);

  // onClose siempre fresco para los listeners de abajo, sin re-armarlos.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  /*
   * Al saltar a un recomendado se empieza DE NUEVO: con la foto limpia.
   *
   * El aviso de "imagen rota" se quedaba pegado del producto anterior, así que
   * el siguiente salía con el icono gris aunque su foto estuviera perfecta.
   *
   * Se ajusta DURANTE el render y no en un efecto. Es el patrón que React
   * recomienda para "este estado depende de otro": en un efecto habría que
   * pintar el producto nuevo con la basura del viejo y repintarlo enseguida,
   * y el ojo alcanza a ver ese parpadeo. Aquí React descarta el render a
   * medias y rehace el correcto antes de tocar la pantalla.
   */
  const [idPintado, setIdPintado] = useState(producto?.id);
  if (producto?.id !== idPintado) {
    setIdPintado(producto?.id);
    setImgError(false);
  }

  /*
   * Y arriba del todo. Tocar una recomendación —que está hasta abajo— dejaba
   * al siguiente producto abierto por el final, mostrando las recomendaciones
   * de las recomendaciones sin haber visto nunca su precio.
   *
   * Esto sí es un efecto: mover la barra de desplazamiento es tocar el
   * navegador, no calcular estado.
   */
  useEffect(() => {
    contenedor.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [producto?.id]);

  // UN SOLO SCROLL: el overlay ya scrollea por dentro; sin congelar el de la
  // página de atrás quedaban dos barras independientes peleando.
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflowPrevio; };
  }, []);

  /*
   * LA HISTORIA DEL NAVEGADOR, CON UNA SOLA PUERTA DE SALIDA.
   *
   * Abrir un producto empuja una entrada de historia, para que la flecha
   * "atrás" cierre la ficha en vez de sacar a la persona de la tienda —o
   * peor, devolverla al login por donde entró—.
   *
   * Lo que faltaba: el botón "Volver" cerraba POR SU CUENTA y dejaba esa
   * entrada tirada. Quien entraba a un producto y salía con el botón quedaba
   * con una entrada fantasma encima, así que el siguiente "atrás" se gastaba
   * en consumirla SIN QUE PASARA NADA en pantalla, y había que darle una
   * segunda vez para moverse de verdad. Ese era el bug.
   *
   * Y el primer arreglo —recoger la entrada al desmontar— era peor: en
   * StrictMode el ciclo montar→desmontar→montar deja ese back() asíncrono
   * corriendo una carrera contra el segundo montaje, y según quién llegue
   * primero se va una entrada de más y la persona termina fuera del sitio.
   *
   * Así que ahora hay UNA sola forma de cerrar: retroceder. El botón no
   * cierra, retrocede; el "atrás" del navegador retrocede; los dos caen en el
   * mismo popstate, que es el único que llama a onClose. Sin dos caminos no
   * hay dos caminos que descuadrar.
   */
  useEffect(() => {
    // La guarda es para StrictMode: en el segundo montaje la entrada del
    // primero sigue puesta, y empujar otra dejaría una de sobra.
    if (!entradaPuesta) {
      window.history.pushState({ modalProducto: true }, '');
      entradaPuesta = true;
    }

    const alVolver = () => {
      entradaPuesta = false;
      onCloseRef.current?.();
    };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  /*
   * Cerrar la ficha = retroceder. Si por lo que sea no hay entrada nuestra que
   * consumir, se cierra a secas: más vale una ficha que cierra sin tocar la
   * historia que un back() que se lleve a la persona fuera de la tienda.
   */
  const cerrar = () => {
    if (entradaPuesta) window.history.back();
    else onCloseRef.current?.();
  };

  // Los que se venden por peso muestran el precio de la libra y se agregan de
  // libra en libra. Ver utils/unidades.js.
  const porLibra = esPorLibra(producto);
  const soloAdultos = esSoloAdultos(producto);
  const agotado = Number(producto?.stock) === 0;

  /*
   * Cuánto se ahorra, en porcentaje. Se calcula aquí y no en el estilo porque
   * es un dato del producto, no una decoración: si no hay precio anterior —o
   * si el "anterior" es menor que el de hoy, que pasa cuando alguien teclea
   * mal— simplemente no hay sello que mostrar.
   */
  const ahorro = useMemo(() => {
    const antes = Number(producto?.precioAnterior);
    const ahora = Number(producto?.precio);
    if (!antes || !ahora || antes <= ahora) return 0;
    return Math.round(((antes - ahora) / antes) * 100);
  }, [producto?.precioAnterior, producto?.precio]);

  /*
   * Quien compra esto también lleva: lo que más va con este producto en un
   * mismo pedido, de los pedidos de verdad. La lista de toda la tienda se pide
   * una vez y la comparten todas las fichas. Ver utils/tambienLlevan.js.
   */
  const [juntos, setJuntos] = useState({});
  useEffect(() => {
    let vigente = true;
    cargarTambienLlevan().then((mapa) => { if (vigente) setJuntos(mapa); });
    return () => { vigente = false; };
  }, []);
  const tambienLlevan = useMemo(
    () => elegirTambienLlevan(juntos[producto?.id], todosLosProductos, producto),
    [juntos, todosLosProductos, producto]
  );

  /*
   * Los recomendados: del mismo pasillo, sin repetir el que ya se está
   * viendo ni lo que ya salió arriba. Cinco es lo que cabe en una fila sin
   * que la ficha se vuelva un catálogo.
   */
  const recomendados = useMemo(() => {
    const yaSalen = new Set(tambienLlevan.map((p) => p.id));
    return todosLosProductos
      .filter((p) => p.id !== producto?.id && p.categoria === producto?.categoria && !yaSalen.has(p.id))
      .slice(0, 5);
  }, [todosLosProductos, producto?.id, producto?.categoria, tambienLlevan]);

  // Candado +18 también aquí: agregar un producto restringido pasa antes por
  // la confirmación de edad. Normalmente ya se confirmó al abrir el detalle,
  // pero este es el paso que de verdad mete el producto al carrito.
  const { mayorConfirmado, pedirConfirmacion } = useEdad();

  const agregar = () => {
    const meter = () => {
      // La foto grande del detalle es la que vuela al carrito. Se mide antes
      // de cerrar: con la ventana ya cerrada no hay de dónde salir.
      const origen = document.querySelector('[data-foto-detalle]');
      onAgregarAlCarrito?.(producto, 1, { origen });
      cerrar();
    };
    if (soloAdultos && !mayorConfirmado) {
      pedirConfirmacion(meter);
      return;
    }
    meter();
  };

  /*
   * El corazón. Es el MISMO de las tarjetas —mismo contexto, misma cuenta—,
   * así que lo que se marca aquí ya está marcado allá al cerrar. Faltaba: se
   * podía guardar un producto desde la tarjeta pero no desde su propia ficha,
   * que es justo donde uno termina de decidir.
   */
  const { esFavorito, alternar } = useFavoritosCtx();

  return {
    contenedor,
    imgError,
    marcarImagenRota: () => setImgError(true),
    porLibra,
    soloAdultos,
    agotado,
    ahorro,
    tambienLlevan,
    recomendados,
    agregar,
    cerrar,
    esFavorito: esFavorito(producto?.id),
    alternarFavorito: () => alternar(producto?.id, producto?.nombre),
  };
};
