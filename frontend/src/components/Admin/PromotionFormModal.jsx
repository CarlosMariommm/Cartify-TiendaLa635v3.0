import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sparkles, Palette, Layers, X, MapPin, Loader2, Check } from 'lucide-react';
import { productService } from '../../api/productService';
import { validarPromocion, avisoVentaBajoCosto, bloquearTeclasNumero } from '../../utils/validaciones';
import { etiquetaPromo, textoVencimiento, promoVencida } from '../../utils/promos';
import { usePromoAI } from '../../hooks/usePromoAI';
import PromoCard from '../Store/PromoCard';
import SubidorArchivo from '../UI/SubidorArchivo';
import { ICONOS } from '../../utils/iconosAviso';
import { TEMAS, TEMAS_BASE, TEMAS_FESTIVOS } from '../../utils/temasPromo';
import { ICONOS_PROMO } from '../../utils/iconosPromo';

// PromotionFormModal — crear/editar una promoción (multi-tipo). - descuento : cada producto con su
// %. - precio_fijo : cada producto con un precio de oferta. - nxm : compra N, paga M sobre los
// productos. Los productos se agregan con buscador (sin bajar por toda la lista).
const TIPOS = [
  { v: 'descuento', l: 'Descuento %' },
  { v: 'precio_fijo', l: 'Precio fijo' },
  { v: 'nxm', l: 'NxM (2x1)' },
  // Sin cambio de precio: para poner algo al frente de la tienda y ya.
  { v: 'anuncio', l: 'Solo anunciar' },
];

// La fecha de un <input type="date"> se escribe "2026-08-03".
const aInputDate = (valor) => {
  if (!valor) return '';
  const f = new Date(valor);
  if (isNaN(f.getTime())) return '';
  // Local, no ISO: toISOString() se corre un día en zonas al oeste de Greenwich.
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  const dia = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mes}-${dia}`;
};

const hoyInputDate = () => aInputDate(new Date());

// Para la vista previa: la fecha escrita vale hasta el final de ese día, igual que la guarda el
// backend. Sin esto, "vence hoy" se vería como vencida — un "2026-08-03" pelón es medianoche UTC,
// que aquí ya pasó.
const finDelDia = (valor) => (valor ? `${valor}T23:59:59.999` : null);

// Saca los dos colores de un fondo de tema ("linear-gradient(135deg, #00283D 0%, #003049 100%)")
// para poder seguir editándolos con los selectores de color, que solo entienden hex sueltos.
const extraerColoresDeFondo = (fondo = '') => {
  const hex = fondo.match(/#[0-9a-fA-F]{3,8}/g) || [];
  return [hex[0] || '#003049', hex[1] || ''];
};

// Estilo de las píldoras que se eligen (temas e iconos). Va con las variables del tema y no con
// hex fijos porque el panel tiene paletas de accesibilidad: en alto contraste o modo oscuro, un
// café clavado a mano se queda solo en medio de la pantalla.
const seleccionable = (activo) => ({
  borderColor: activo ? 'var(--theme-primary)' : 'var(--theme-card-border)',
  background: activo ? 'var(--theme-primary-light)' : 'var(--theme-card-bg)',
});

// Píldora de un tema: su color de muestra y su nombre.
const BotonTema = ({ tema, activo, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={tema.nombre}
    aria-label={`Tema ${tema.nombre}`}
    aria-pressed={activo}
    className="press flex items-center gap-2 pr-3 pl-1.5 py-1.5 rounded-full border transition-colors"
    style={seleccionable(activo)}
  >
    <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: tema.muestra }} />
    <span className="text-xs font-medium text-gray-700">{tema.nombre}</span>
  </button>
);

const PromotionFormModal = ({ isOpen, onClose, promoData, onSave }) => {
  const isEditing = !!promoData;
  const [form, setForm] = useState({ title: '', promoDescription: '', isActive: true, showBanner: true });
  const [type, setType] = useState('descuento');
  const [items, setItems] = useState([]); // [{ productId, name, discount, fixedPrice, categoryId, categoryName }]
  const [buyQty, setBuyQty] = useState(2);
  const [payQty, setPayQty] = useState(1);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imagenCompleta, setImagenCompleta] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [icono, setIcono] = useState('');
  // Sello del anuncio: "Nuevo", "De la casa"... Solo lo usa el tipo 'anuncio'.
  const [etiqueta, setEtiqueta] = useState('');
  // Alta por categoría completa: cuál y con qué precio/descuento entra.
  const [categoriaElegida, setCategoriaElegida] = useState('');
  const [valorCategoria, setValorCategoria] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Diseño del banner (reemplaza al canvas que armaba la IA).
  const [tema, setTema] = useState('cafe');
  const [colorFondo, setColorFondo] = useState('#003049');
  const [colorFondo2, setColorFondo2] = useState('');
  const [colorTexto, setColorTexto] = useState('#FFFFFF');
  const [colorAcento, setColorAcento] = useState('#DDECF3');
  const [colorFlecha, setColorFlecha] = useState('');
  const { generando, generarPromo } = usePromoAI();

  // De donde salio el ultimo texto: 'ia', 'plantilla' o null si todavia no se ha generado. Se pinta
  // debajo del boton en vez de en un toast que se va solo, para que siga a la vista mientras se
  // revisa lo que escribio.
  const [origenTexto, setOrigenTexto] = useState(null);

  // Pasar a "Personalizado" arranca desde el tema que estaba puesto, no desde el café de siempre.
  // Personalizar es corregir un detalle de algo que ya gustó; obligar a rearmar la paleta desde cero
  // era la razón por la que el editor se sentía limitado.
  const activarPersonalizado = () => {
    if (tema !== 'personalizado') {
      const base = TEMAS.find((t) => t.id === tema) || TEMAS[0];
      const [inicio, fin] = extraerColoresDeFondo(base.fondo);
      setColorFondo(inicio);
      setColorFondo2(fin);
      setColorTexto(base.texto);
      setColorAcento(base.acento);
      setColorFlecha(base.acento);
    }
    setTema('personalizado');
  };

  useEffect(() => {
    if (!isOpen) return;
    productService.getInventario()
      .then((d) => setProductos(Array.isArray(d) ? d.filter((p) => p.isActive !== false) : []))
      .catch(() => {});

    if (promoData) {
      setForm({
        title: promoData.title || '',
        promoDescription: promoData.promoDescription || '',
        isActive: promoData.isActive !== false,
        showBanner: promoData.showBanner !== false,
      });
      setType(promoData.type || 'descuento');
      setBuyQty(promoData.buyQty || 2);
      setPayQty(promoData.payQty || 1);
      setItems((promoData.items || []).map((it) => ({
        productId: typeof it.productId === 'object' ? it.productId?._id : it.productId,
        name: typeof it.productId === 'object' ? it.productId?.name : 'Producto',
        discount: it.discount ?? 0,
        fixedPrice: it.fixedPrice ?? '',
        categoryId: it.categoryId || null,
        categoryName: it.categoryName || null,
      })));
      setPreview(promoData.image || null);
      setImagenCompleta(!!promoData.imagenCompleta);
      setEndsAt(aInputDate(promoData.endsAt));
      setIcono(promoData.icono || '');
      setEtiqueta(promoData.etiqueta || '');
      setTema(promoData.tema || 'cafe');
      setColorFondo(promoData.colorFondo || '#003049');
      setColorFondo2(promoData.colorFondo2 || '');
      setColorTexto(promoData.colorTexto || '#FFFFFF');
      setColorAcento(promoData.colorAcento || '#DDECF3');
      setColorFlecha(promoData.colorFlecha || '');
    } else {
      setForm({ title: '', promoDescription: '', isActive: true, showBanner: true });
      setType('descuento');
      setBuyQty(2); setPayQty(1);
      setItems([]);
      setPreview(null);
      setImagenCompleta(false);
      setEndsAt('');
      setIcono('');
      setEtiqueta('');
      setTema('cafe');
      setColorFondo('#003049');
      setColorFondo2('');
      setColorTexto('#FFFFFF');
      setColorAcento('#DDECF3');
      setColorFlecha('');
    }
    setImagen(null);
    setBusqueda('');
    setCategoriaElegida('');
    setValorCategoria('');
  }, [isOpen, promoData]);

  // El subidor ya nos entrega el archivo y la URL que está mostrando: reusamos esa misma en lugar de
  // crear otra. Dos createObjectURL del mismo archivo son dos blobs vivos y solo uno se llegaría a
  // revocar.
  const onImagen = (file, url) => {
    setImagen(file);
    setPreview(url);
    if (!file) setImagenCompleta(false);
  };

  const addProducto = (p) => {
    if (items.some((it) => it.productId === p._id)) return;
    setItems([...items, { productId: p._id, name: p.name, discount: 0, fixedPrice: p.salePrice ?? 0 }]);
    setBusqueda('');
  };
  const removeItem = (id) => setItems(items.filter((it) => it.productId !== id));
  const updateItem = (id, field, value) => setItems(items.map((it) => (it.productId === id ? { ...it, [field]: value } : it)));

  const disponibles = productos.filter(
    (p) => !items.some((it) => it.productId === p._id) &&
      (p.name || '').toLowerCase().includes(busqueda.toLowerCase().trim())
  );

  // ── Categorías ── Salen de los productos cargados: sin productos no hay qué promocionar.
  // Solo el descuento y el precio fijo piden un número por producto.
  const pideImporte = type === 'descuento' || type === 'precio_fijo';

  const idCategoria = (p) => p.typeId?._id || p.typeId || null;

  const categorias = useMemo(() => {
    const mapa = new Map();
    productos.forEach((p) => {
      const id = idCategoria(p);
      const nombre = p.typeId?.type;
      if (id && nombre && !mapa.has(String(id))) mapa.set(String(id), nombre);
    });
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  // Agrega de un golpe todos los productos de una categoría, con el mismo precio o descuento para
  // todos.
  const agregarCategoria = () => {
    if (!categoriaElegida) return;

    const cat = categorias.find((c) => c.id === categoriaElegida);
    const nuevos = productos.filter(
      (p) => String(idCategoria(p)) === categoriaElegida && !items.some((it) => it.productId === p._id)
    );

    if (nuevos.length === 0) {
      toast('Esa categoría ya está completa en la promoción');
      return;
    }

    const valor = Number(valorCategoria);
    const hayValor = valorCategoria !== '' && !isNaN(valor);

    setItems([
      ...items,
      ...nuevos.map((p) => ({
        productId: p._id,
        name: p.name,
        // Sin valor escrito: descuento 0 y precio actual, para que se note que
        // falta ponerlo en vez de inventar una oferta.
        discount: type === 'descuento' && hayValor ? valor : 0,
        fixedPrice: type === 'precio_fijo' && hayValor ? valor : (p.salePrice ?? 0),
        categoryId: categoriaElegida,
        categoryName: cat?.nombre || '',
      })),
    ]);

    toast.success(`${nuevos.length} ${nuevos.length === 1 ? 'producto agregado' : 'productos agregados'} de ${cat?.nombre}`);
    setCategoriaElegida('');
    setValorCategoria('');
  };

  // Quitar de un tirón todo lo que entró por una categoría.
  const quitarCategoria = (categoryId) => setItems(items.filter((it) => String(it.categoryId) !== String(categoryId)));

  // Resumen "Lácteos · 12" para no mostrar doce filas iguales sin contexto.
  const gruposCategoria = useMemo(() => {
    const mapa = new Map();
    items.forEach((it) => {
      if (!it.categoryId) return;
      const clave = String(it.categoryId);
      const grupo = mapa.get(clave) || { id: clave, nombre: it.categoryName || 'Categoría', cantidad: 0 };
      grupo.cantidad += 1;
      mapa.set(clave, grupo);
    });
    return [...mapa.values()];
  }, [items]);

  // Los pasillos donde va a salir la promo, sacados de los productos elegidos. La tienda muestra
  // cada promo en el pasillo de sus productos (la del pan en Panadería), así que aquí se le adelanta
  // al encargado dónde aparecerá.
  const pasillosPromo = useMemo(() => {
    const nombres = new Set();
    items.forEach((it) => {
      const p = productos.find((x) => x._id === it.productId);
      const nombre = p?.moduleId?.name;
      if (nombre) nombres.add(nombre);
    });
    return [...nombres].sort();
  }, [items, productos]);

  // El precio normal de cada producto, para las reglas del negocio. Vive aquí arriba porque lo miran
  // DOS cosas: el guard de la IA y el de guardar.
  const precios = useMemo(
    () => Object.fromEntries(productos.map((p) => [p._id, Number(p.salePrice) || 0])),
    [productos]
  );

  // La IA solo escribe el TEXTO. El banner se diseña acá con los colores, así que se puede seguir
  // ajustando después sin regenerar nada.
  const onGenerarIA = async () => {
    // SE VALIDA ANTES DE ESCRIBIR, con las mismas reglas que al guardar. Con un descuento en 0 eso
    // producía anuncios absurdos —"Llévese Fresas con 0% de descuento: de $2.50 a $2.50"— que quedaban
    // puestos en el título y la descripción; recién al tocar Guardar aparecía el error.
    const problema = validarPromocion({ tipo: type, items, buyQty, payQty, precios });
    if (problema) { toast.error(problema); return; }

    setOrigenTexto(null);
    const resultado = await generarPromo({ tipo: type, items, buyQty, payQty });
    if (!resultado) return;

    setOrigenTexto(resultado.origen === 'plantilla' ? 'plantilla' : 'ia');

    setForm((prev) => ({
      ...prev,
      title: resultado.title || prev.title,
      promoDescription: resultado.promoDescription || prev.promoDescription,
    }));

    // En un anuncio el sello también lo propone la IA ("Nuevo", "De la casa").
    if (type === 'anuncio' && resultado.badge) setEtiqueta(resultado.badge);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.promoDescription.trim()) { toast.error('La descripción es requerida'); return; }

    // Reglas del negocio según el tipo (descuentos 0-100, precio de oferta menor al normal, y que en
    // un NxM se pague menos de lo que se lleva). Son las MISMAS que revisa el botón de la IA, arriba:
    // si una promo no se puede guardar, tampoco vale la pena redactarla.
    const error = validarPromocion({ tipo: type, items, buyQty, payQty, precios });
    if (error) { toast.error(error); return; }

    // Aviso (no bloqueo) si la promo vende por debajo del costo. Un producto gancho a pérdida puede
    // ser intencional, pero tiene que ser una decisión: un 50% sobre algo con 40% de margen pierde
    // plata en cada venta.
    const costos = Object.fromEntries(productos.map((p) => [p._id, Number(p.priceCost) || 0]));
    const aviso = avisoVentaBajoCosto({ tipo: type, items, buyQty, payQty, costos, precios });
    if (aviso) {
      // Aviso de perder plata: se queda más tiempo y con el triángulo
      // naranja, que se distingue de un "guardado" de un vistazo.
      toast(aviso, { duration: 7000, icon: ICONOS.atencion });
    }

    // Ya no se exige imagen: la tarjeta se dibuja con el texto y los colores. Lo que sí hace falta
    // para anunciarla es un título — sin él el banner saldría con el texto de relleno.
    if (form.showBanner && !form.title.trim()) {
      toast.error('Ponle un título a la promoción, o desmarca "Anunciar en la tienda"');
      return;
    }

    // Una fecha ya pasada es siempre un dedazo: la promo nacería vencida y el gerente la buscaría en
    // la tienda sin encontrarla nunca.
    if (endsAt && endsAt < hoyInputDate()) {
      toast.error('Esa fecha ya pasó. Elige una de hoy en adelante, o déjala vacía.');
      return;
    }

    const itemsPayload = items.map((it) => ({
      productId: it.productId,
      discount: Number(it.discount) || 0,
      fixedPrice: it.fixedPrice === '' || it.fixedPrice === null ? undefined : Number(it.fixedPrice),
      categoryId: it.categoryId || undefined,
      categoryName: it.categoryName || undefined,
    }));

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('promoDescription', form.promoDescription);
    fd.append('type', type);
    fd.append('etiqueta', etiqueta);
    fd.append('isActive', form.isActive);
    fd.append('showBanner', form.showBanner);
    fd.append('buyQty', buyQty);
    fd.append('payQty', payQty);
    fd.append('items', JSON.stringify(itemsPayload));
    fd.append('endsAt', endsAt);
    fd.append('imagenCompleta', imagenCompleta && !!preview);
    // Diseño del banner (solo se usa si no hay imagen propia).
    fd.append('tema', tema);
    fd.append('icono', icono);
    // Quitó la imagen que ya tenía y no puso otra en su lugar. Sin avisarlo, el backend no tiene forma
    // de saberlo —un FormData sin 'image' se lee igual que "no la tocó"— y la foto seguía viva en
    // Cloudinary y en el banner.
    const quitoImagen = isEditing && !!promoData?.image && !preview && !imagen;
    fd.append('removeImage', quitoImagen ? 'true' : 'false');
    if (tema === 'personalizado') {
      fd.append('colorFondo', colorFondo);
      fd.append('colorFondo2', colorFondo2);
      fd.append('colorTexto', colorTexto);
      fd.append('colorAcento', colorAcento);
      fd.append('colorFlecha', colorFlecha);
    }
    if (imagen) fd.append('image', imagen);

    setGuardando(true);
    try {
      await onSave(fd, promoData?._id);
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden relative z-10 max-h-[92vh]"
          >
            <div className="bg-[#00283D] text-white p-5">
              <h2 className="text-2xl font-bold text-center">{isEditing ? 'Editar Promoción' : 'Nueva Promoción'}</h2>
            </div>

            <div className="p-6 bg-[#F1F6F9] flex-1 overflow-y-auto">
              <form id="promo-form" onSubmit={onSubmit} className="space-y-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de promoción</label>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS.map((t) => (
                      <button type="button" key={t.v} onClick={() => setType(t.v)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${type === t.v ? 'bg-[#003049] text-white border-[#003049]' : 'bg-white text-gray-600 border-gray-300'}`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anuncio: no hay importes que pedir, solo el sello. Se explica aquí mismo porque "Solo anunciar"
                   puede leerse como que la promo no hace nada. */}
                {type === 'anuncio' && (
                  <div className="rounded-xl border border-gray-200 bg-[#F1F6F9] p-3">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Sello del anuncio</label>
                    <input
                      value={etiqueta}
                      onChange={(e) => setEtiqueta(e.target.value)}
                      maxLength={14}
                      placeholder="Nuevo"
                      className={inputCls}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Los precios no cambian: esto pone los productos al frente de la tienda con ese sello.
                      Sirve para lo recién llegado o para lo que quiera empujar sin rebajar.
                    </p>
                  </div>
                )}

                {/* NxM */}
                {type === 'nxm' && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="font-bold">Compra</span>
                    <input type="number" min="2" step="1" value={buyQty} onKeyDown={bloquearTeclasNumero} onChange={(e) => setBuyQty(e.target.value)} className="w-16 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-center focus:outline-none focus:border-[#00283D]" />
                    <span className="font-bold">paga</span>
                    <input type="number" min="1" step="1" value={payQty} onKeyDown={bloquearTeclasNumero} onChange={(e) => setPayQty(e.target.value)} className="w-16 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-center focus:outline-none focus:border-[#00283D]" />
                  </div>
                )}

                {/* Banner: se diseña acá mismo, con vista previa en vivo */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Banner — así se verá en la tienda
                  </label>

                  {/* Misma pieza que usa el carrusel del cliente: lo que se ve
                      aquí es exactamente lo que va a ver la gente. */}
                  <PromoCard
                    promo={{ tema, colorFondo, colorFondo2, colorTexto, colorAcento, colorFlecha }}
                    imagen={preview}
                    imagenCompleta={imagenCompleta}
                    title={form.title}
                    descripcion={form.promoDescription}
                    etiqueta={etiquetaPromo({ type, items, buyQty, payQty, etiqueta })}
                    vencimiento={textoVencimiento({ endsAt: finDelDia(endsAt) })}
                    icono={icono}
                  />

                  {/* Los colores pintan la tarjeta salvo que la imagen la ocupe entera */}
                  {!(preview && imagenCompleta) && (
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-gray-600 mb-2">Colores</span>
                      <div className="flex flex-wrap gap-2">
                        {TEMAS_BASE.map((t) => (
                          <BotonTema key={t.id} tema={t} activo={tema === t.id} onClick={() => setTema(t.id)} />
                        ))}

                        <button
                          type="button"
                          onClick={activarPersonalizado}
                          aria-pressed={tema === 'personalizado'}
                          className="press flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors"
                          style={seleccionable(tema === 'personalizado')}
                        >
                          <Palette size={14} className="text-gray-500" />
                          <span className="text-xs font-medium text-gray-700">Personalizado</span>
                        </button>
                      </div>

                      {/* Las de temporada van aparte: se usan tres semanas al año y mezcladas harían buscar "Café" entre
                         nueve píldoras. */}
                      <span className="block text-xs font-bold text-gray-600 mt-3 mb-2">Fechas especiales</span>
                      <div className="flex flex-wrap gap-2">
                        {TEMAS_FESTIVOS.map((t) => (
                          <BotonTema key={t.id} tema={t} activo={tema === t.id} onClick={() => setTema(t.id)} />
                        ))}
                      </div>

                      {tema === 'personalizado' && (
                        <div className="flex flex-wrap gap-4 mt-3 bg-white border border-gray-200 rounded-xl p-3">
                          {[
                            { l: 'Fondo', v: colorFondo, set: setColorFondo },
                            { l: 'Fondo 2', v: colorFondo2 || colorFondo, set: setColorFondo2 },
                            { l: 'Texto', v: colorTexto, set: setColorTexto },
                            { l: 'Etiqueta', v: colorAcento, set: setColorAcento },
                            // La flecha vive con los demás colores; suelta afuera
                            // era un recuadro huérfano que no se entendía.
                            { l: 'Flecha', v: colorFlecha || colorAcento, set: setColorFlecha },
                          ].map((c) => (
                            <label key={c.l} className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="color"
                                value={c.v}
                                onChange={(e) => c.set(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                              />
                              {c.l}
                            </label>
                          ))}

                          {/* El segundo color arma el degradado; quitarlo deja el fondo plano */}
                          {colorFondo2 && (
                            <button
                              type="button"
                              onClick={() => setColorFondo2('')}
                              className="press text-xs text-gray-500 hover:text-red-500 self-center"
                            >
                              Fondo de un solo color
                            </button>
                          )}

                          <p className="text-xs text-gray-400 w-full">
                            "Fondo 2" arma el degradado. Ojo con el contraste: si el fondo es claro, el texto tiene que ser oscuro.
                          </p>
                        </div>
                      )}

                      {/* Iconos: el banner tiene cara sin depender de una foto */}
                      <div className="mt-4">
                        <span className="block text-xs font-bold text-gray-600 mb-2">Icono</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setIcono('')}
                            aria-pressed={!icono}
                            className="press px-3 py-1.5 rounded-full border text-xs font-medium text-gray-700 transition-colors"
                            style={seleccionable(!icono)}
                          >
                            Sin icono
                          </button>

                          {ICONOS_PROMO.map(({ id, nombre, Icono }) => (
                            <button
                              type="button"
                              key={id}
                              onClick={() => setIcono(id)}
                              title={nombre}
                              aria-label={`Icono ${nombre}`}
                              aria-pressed={icono === id}
                              className="press flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border transition-colors"
                              style={seleccionable(icono === id)}
                            >
                              <Icono size={15} style={{ color: 'var(--theme-primary)' }} />
                              <span className="text-xs font-medium text-gray-700">{nombre}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Sale junto al precio y en grande de fondo. Si el título es largo, el de fondo se quita solo para no estorbarlo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Va chiquito a propósito: la vista previa que manda es la PromoCard de arriba, que muestra el
                     banner armado. Esto de acá solo confirma qué archivo se eligió y deja quitarlo. */}
                  <div className="mt-3">
                    <SubidorArchivo
                      accept="image/*"
                      maxMB={8}
                      valorInicial={promoData?.image || null}
                      onArchivo={onImagen}
                      variante="panel"
                      ajuste="cover"
                      alto={100}
                      altoPreview={132}
                      radio={12}
                      titulo="Arrastra la imagen del banner o haz clic para elegirla"
                      ayuda="Opcional"
                      etiquetaAria="Subir la imagen de la promoción"
                    />
                  </div>

                  {/* La foto acompaña al texto por defecto. Ocupar la tarjeta entera se puede, pero eligiéndolo: así
                     nadie pierde el título y el precio sin darse cuenta por subir una foto. */}
                  {preview && (
                    <label className="flex items-start cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={imagenCompleta}
                        onChange={(e) => setImagenCompleta(e.target.checked)}
                        className="mr-2 mt-1"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Usar la imagen como banner completo
                        <span className="block text-xs font-normal text-gray-500">
                          Solo si ya diseñó el banner entero (1200 × 480) con su texto adentro. El título y la fecha dejan de dibujarse.
                        </span>
                      </span>
                    </label>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    {preview
                      ? 'La foto se acomoda a la derecha y se funde con el color; el texto se sigue leyendo.'
                      : 'No hace falta subir imagen: la tarjeta se arma con el texto y los colores que elija.'}
                  </p>
                </div>

                {/* Vencimiento: la promo se apaga sola. Sin esto, apagarla era acordarse un domingo de entrar al
                   sistema — y mientras tanto seguía descontando. */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Vence el (opcional)</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="date"
                      value={endsAt}
                      min={hoyInputDate()}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className={`${inputCls} flex-1 min-w-[170px] cursor-pointer`}
                    />
                    {endsAt && (
                      <button
                        type="button"
                        onClick={() => setEndsAt('')}
                        className="press text-xs text-gray-500 hover:text-red-500 whitespace-nowrap"
                      >
                        Sin vencimiento
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {endsAt
                      ? 'Aplica todo ese día completo. Al día siguiente deja de descontar y sale del carrusel sola.'
                      : 'Sin fecha, la promoción sigue hasta que la apague a mano.'}
                  </p>

                  {/* Al estirarle la fecha a una promo vencida hay que reactivarla */}
                  {isEditing && promoVencida(promoData) && endsAt >= hoyInputDate() && !form.isActive && (
                    <p className="text-xs text-[#003049] mt-2 font-medium">
                      Esta promoción se apagó al vencerse: marque "Activa" abajo para que la nueva fecha sirva de algo.
                    </p>
                  )}
                </div>

                {/* Productos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700">Productos ({items.length})</label>
                  </div>
                  {/* Buscador para agregar */}
                  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto para agregar..." className={`${inputCls} mb-2`} />
                  {busqueda.trim() && (
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white mb-2">
                      {disponibles.length === 0 ? (
                        <p className="text-xs text-gray-400 p-2">Sin resultados.</p>
                      ) : (
                        disponibles.map((p) => (
                          <button type="button" key={p._id} onClick={() => addProducto(p)}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between">
                            <span>{p.name}</span>
                            <span className="text-xs text-[#003049] font-medium">+ Agregar</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Alta por categoría completa. Para una promo de "todos los lácteos" nadie debería buscar treinta
                     productos a mano. */}
                  {categorias.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-[#F1F6F9] p-3 mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers size={15} style={{ color: 'var(--theme-primary)' }} />
                        <span className="text-xs font-bold text-gray-700">O agregue una categoría completa</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={categoriaElegida}
                          onChange={(e) => setCategoriaElegida(e.target.value)}
                          className="flex-1 min-w-[140px] bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-3 py-2 focus:outline-none focus:border-[#00283D] cursor-pointer"
                        >
                          <option value="">Elegir categoría…</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>

                        {pideImporte && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">{type === 'descuento' ? '%' : '$'}</span>
                            <input
                              type="number"
                              min="0"
                              step={type === 'descuento' ? '1' : '0.01'}
                              value={valorCategoria}
                              onKeyDown={bloquearTeclasNumero}
                              onChange={(e) => setValorCategoria(e.target.value)}
                              placeholder={type === 'descuento' ? '20' : '1.25'}
                              className="w-20 bg-white border border-gray-300 rounded-full px-2 py-2 text-sm text-center focus:outline-none focus:border-[#00283D]"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={agregarCategoria}
                          disabled={!categoriaElegida}
                          className="press bg-[#00283D] hover:bg-[#6B4423] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Agregar
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {type === 'nxm'
                          ? 'Entran todos los productos de la categoría con el mismo NxM.'
                          : type === 'anuncio'
                            ? 'Entra la categoría completa al anuncio, sin tocarle el precio a nada.'
                            : `Entran todos con el mismo ${type === 'descuento' ? 'descuento' : 'precio'}; después puede ajustar cualquiera abajo.`}
                      </p>
                    </div>
                  )}

                  {/* Lo que entró por categoría, resumido y quitable de un golpe */}
                  {gruposCategoria.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {gruposCategoria.map((g) => (
                        <span key={g.id} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium pl-3 pr-1.5 py-1 rounded-full">
                          {g.nombre} · {g.cantidad}
                          <button
                            type="button"
                            onClick={() => quitarCategoria(g.id)}
                            className="press text-gray-400 hover:text-red-500"
                            aria-label={`Quitar los productos de ${g.nombre}`}
                          >
                            <X size={13} strokeWidth={2.6} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Lista de productos agregados */}
                  <div className="border border-gray-200 rounded-lg bg-white p-2 space-y-1 max-h-56 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Aún no agregas productos. Búscalos arriba.</p>
                    ) : (
                      items.map((it) => (
                        <div key={it.productId} className="flex items-center gap-2 py-1">
                          <span className="flex-1 text-sm text-gray-700 truncate">{it.name}</span>
                          {type === 'descuento' && (
                            <div className="flex items-center gap-1">
                              <input type="number" min="0" max="100" value={it.discount} onKeyDown={bloquearTeclasNumero} onChange={(e) => updateItem(it.productId, 'discount', e.target.value)}
                                className="w-16 bg-white border border-gray-300 rounded-full px-2 py-1 text-sm text-center focus:outline-none focus:border-[#00283D]" />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          )}
                          {type === 'precio_fijo' && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">$</span>
                              <input type="number" min="0" step="0.01" value={it.fixedPrice} onKeyDown={bloquearTeclasNumero} onChange={(e) => updateItem(it.productId, 'fixedPrice', e.target.value)}
                                className="w-20 bg-white border border-gray-300 rounded-full px-2 py-1 text-sm text-center focus:outline-none focus:border-[#00283D]" />
                            </div>
                          )}
                          <button type="button" onClick={() => removeItem(it.productId)} className="text-red-500 text-sm px-1" aria-label="Quitar">✕</button>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Al hacer click en el banner, la tienda mostrará estos productos con su promo.</p>

                  {/* Dónde va a salir: la tienda muestra cada promo en el pasillo de sus productos. Se le adelanta al
                     encargado para que no se sorprenda de no verla en "toda la tienda" únicamente. */}
                  {pasillosPromo.length > 0 && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl border border-gray-200 bg-[#F1F6F9] p-3">
                      <MapPin size={15} className="mt-0.5 flex-none" style={{ color: 'var(--theme-primary)' }} />
                      <p className="text-xs text-gray-600">
                        Aparecerá en {pasillosPromo.length === 1 ? 'el pasillo' : 'los pasillos'}:{' '}
                        <b className="text-gray-800">{pasillosPromo.join(' · ')}</b>
                        <span className="block text-gray-400 mt-0.5">
                          Y también en la vista de toda la tienda. Si mezclás productos de varios pasillos, saldrá en cada uno.
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* ── EL AYUDANTE DE IA, Y EL TEXTO QUE ESCRIBE ──
                   Este bloque estaba ARRIBA DEL TODO, y los productos abajo. */}
                <div className="rounded-xl border border-[#E4D5C3] bg-[#F1F6F9] p-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onGenerarIA}
                      disabled={generando || items.length === 0}
                      className="hover-scale press flex items-center gap-2 bg-[#00283D] hover:bg-[#6B4423] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* EL CÍRCULO QUE GIRA, y no un aviso arriba a la derecha. El toast salía lejos del botón que se
                         acababa de tocar y se iba solo a los pocos segundos: no había forma de saber si la IA seguía
                         trabajando. El círculo gira exactamente mientras dura el trabajo y está donde se está mirando. */}
                      {generando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {generando ? 'Redactando…' : 'Generar con IA'}
                    </button>

                    <p className="text-xs text-gray-600 flex-1">
                      {generando
                        ? 'Buscando el gancho y escribiendo el anuncio…'
                        : items.length === 0
                          ? 'Elija arriba los productos de la promoción y la IA escribe el anuncio por usted.'
                          : `Redacta el texto con ${items.length === 1 ? 'el producto' : 'los productos'} que eligió.`}
                    </p>
                  </div>

                  {/* De dónde salió el texto. Se queda a la vista mientras se revisa —antes era un toast que
                     desaparecía solo— porque si lo escribió una plantilla y no la IA, eso cambia cuánto hay que
                     revisarlo. */}
                  {!generando && origenTexto && (
                    <div className="flex items-start gap-2 mt-3 pt-3 border-t border-[#E4D5C3]">
                      <Check size={14} className="mt-0.5 flex-none text-green-600" />
                      <p className="text-xs text-gray-600">
                        {origenTexto === 'plantilla'
                          ? 'Texto listo, escrito automáticamente (la IA no estaba disponible).'
                          : 'Texto listo.'}{' '}
                        <b className="text-gray-800">Revíselo aquí abajo antes de guardar.</b>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Título (opcional)</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Ej. Fin de semana dulce" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                  <textarea value={form.promoDescription} onChange={(e) => setForm({ ...form, promoDescription: e.target.value })} rows={2}
                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00283D] resize-none"
                    placeholder="Ej. Promo de quesos seleccionados" />
                </div>

                <div className="pt-1 space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="mr-2" />
                    <span className="text-sm font-medium text-gray-700">Activa (el descuento se aplica)</span>
                  </label>

                  {/* Promo silenciosa: aplica el descuento pero sin anunciarlo */}
                  <label className="flex items-start cursor-pointer">
                    <input type="checkbox" checked={form.showBanner} onChange={(e) => setForm({ ...form, showBanner: e.target.checked })} className="mr-2 mt-1" />
                    <span className="text-sm font-medium text-gray-700">
                      Anunciar en la tienda con banner
                      <span className="block text-xs font-normal text-gray-500">
                        Si lo desmarcas, el descuento se aplica igual pero no aparece en el carrusel.
                      </span>
                    </span>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-4 bg-[#F1F6F9] border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-6 py-2 rounded-full transition-colors">Cancelar</button>
              <button form="promo-form" type="submit" disabled={guardando} className="bg-[#003049] hover:bg-[#00283D] text-white font-medium px-8 py-2 rounded-full transition-colors disabled:opacity-60">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PromotionFormModal;
