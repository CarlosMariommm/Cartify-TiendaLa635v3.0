import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { modalTransition } from '../../utils/motion';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import SubidorArchivo from '../UI/SubidorArchivo';
import { reglaPrecio, reglaEntero, reglaCodigoBarras, bloquearTeclasNumero, bloquearNoDigitos } from '../../utils/validaciones';
import { flujoDeModulo, iconoDeModulo, modulosVisibles } from '../../utils/modulos';
import { UNIDADES, etiquetaPiezas } from '../../utils/unidades';
import toast from 'react-hot-toast';

// Lo que el producto YA tiene nunca se cae de su desplegable.
const conElActual = (lista, completa, valorActual) => {
  const id = valorActual?._id || valorActual;
  if (!id || lista.some((x) => x._id === id)) return lista;
  const actual = completa.find((x) => x._id === id) || (typeof valorActual === 'object' ? valorActual : null);
  return actual ? [...lista, actual] : lista;
};

// ALTA / EDICIÓN DE PRODUCTO — asistente por pasos.
// Primero DÓNDE se vende (módulo, categoría, proveedor y marca), después QUÉ es, luego CUÁNTO
// cuesta y al final los detalles opcionales.

// A qué paso pertenece cada campo, para que un error mande al paso correcto.
const PASO_DE_CAMPO = {
  moduleId: 0, typeId: 0, supplierId: 0, brandId: 0,
  name: 1, description: 1,
  priceCost: 2, salePrice: 2, stock: 2,
  barCode: 3, piezas: 3,
};

// Los campos que cada paso valida antes de dejar seguir.
const CAMPOS_POR_PASO = [
  ['moduleId', 'typeId', 'supplierId', 'brandId'],
  ['name', 'description'],
  ['priceCost', 'salePrice', 'stock'],
  ['barCode', 'piezas'],
];

const ProductFormModal = ({ isOpen, onClose, product, onSave, onDelete, brands = [], suppliers = [], categories = [], modules = [] }) => {
  const { register, handleSubmit, reset, setValue, watch, trigger, formState: { errors } } = useForm();
  const [selectedImage, setSelectedImage] = useState(null);
  // En qué paso del asistente estamos (0..3).
  const [paso, setPaso] = useState(0);

  // 1- Observamos los campos clave para filtrado en cascada
  const watchModuleId = watch('moduleId');
  const watchTypeId = watch('typeId');
  const watchSupplierId = watch('supplierId');
  const watchIsActive = watch('isActive');

  // Cómo se vende: por pieza o por peso. Es la respuesta que cambia el significado del precio y del
  // stock, así que se observa para que las etiquetas de esos dos campos digan la verdad mientras se
  // llena el formulario, y no después. Ver utils/unidades.js.
  const watchUnidad = watch('unidadVenta') || 'unidad';
  const unidad = UNIDADES.find((u) => u.clave === watchUnidad) || UNIDADES[0];
  const porLibra = unidad.clave === 'libra';
  // El campo "piezas" cambia de nombre y de sentido según la unidad.
  const textoPiezas = etiquetaPiezas(unidad.clave);

  const isEditing = !!product;

  // El pasillo del que cuelga todo lo demás, sin esperar al watch. Al editar, el reset() llena el
  // formulario desde un efecto, pero el primer render pasa ANTES: ahí el watch todavía viene vacío y
  // el desplegable de categorías se pintaba sin la opción del producto.
  const idGuardado = (valor) => valor?._id || valor || '';
  const moduleOriginal = idGuardado(product?.moduleId);
  const typeOriginal = idGuardado(product?.typeId);
  const supplierOriginal = idGuardado(product?.supplierId);

  const moduleIdActivo = watchModuleId || moduleOriginal;

  // Las reglas dependen del FLUJO del módulo, no de cómo se llame. El día que la tienda cree
  // "Panadería", el proveedor sigue siendo obligatorio porque su flujo es 'estandar', no porque el
  // nombre diga "tienda".
  const selectedModuleObj = modules.find(m => m._id === moduleIdActivo);
  const isPrintModule = selectedModuleObj ? flujoDeModulo(selectedModuleObj) === 'impresiones' : false;
  const isStoreModule = selectedModuleObj ? !isPrintModule : false;

  // Solo los pasillos que la tienda tiene encendidos.
  const modulosActivos = modulosVisibles(modules);

  const categoriasDelModulo = categories.filter(c => {
    const catModuleId = typeof c.moduleId === 'object' ? c.moduleId?._id : c.moduleId;
    return catModuleId === moduleIdActivo;
  });
  // Lo que ya tenía se conserva SOLO mientras no cambie el de arriba: si el empleado mueve el
  // producto a otro pasillo, la categoría vieja no tiene por qué seguir en la lista.
  const filteredCategories = isEditing && moduleIdActivo === moduleOriginal
    ? conElActual(categoriasDelModulo, categories, product.typeId)
    : categoriasDelModulo;

  // Filtrar Proveedores por la Categoría seleccionada
  const selectedCategoryObj = categories.find(c => c._id === watchTypeId);
  const proveedoresDeLaCategoria = (selectedCategoryObj?.supplierIds && selectedCategoryObj.supplierIds.length > 0)
    ? suppliers.filter(s => selectedCategoryObj.supplierIds.includes(s._id))
    : suppliers;
  const filteredSuppliers = isEditing && watchTypeId === typeOriginal
    ? conElActual(proveedoresDeLaCategoria, suppliers, product.supplierId)
    : proveedoresDeLaCategoria;

  // 2- Marca (Brand) filtrada por Proveedor (Supplier)
  const selectedSupplierObj = suppliers.find(s => s._id === watchSupplierId);
  const marcasDelProveedor = (selectedSupplierObj?.brandIds && selectedSupplierObj.brandIds.length > 0)
    ? brands.filter(b => selectedSupplierObj.brandIds.includes(b._id))
    : brands;
  const filteredBrands = isEditing && watchSupplierId === supplierOriginal
    ? conElActual(marcasDelProveedor, brands, product.brandId)
    : marcasDelProveedor;

  // La imagen que ya tiene el producto, para que al editar se vea la actual. El Array.isArray no es
  // paranoia: image llega como arreglo casi siempre, pero hay productos viejos con la URL suelta, y
  // ahí image[0] devolvía la primera LETRA del enlace.
  const imagenGuardada = Array.isArray(product?.image)
    ? (product.image[0] || null)
    : (product?.image || null);

  // 3- Efecto para rellenar datos si es edición, o limpiar si es creación
  useEffect(() => {
    if (isOpen) {
      // Al abrir siempre se arranca por el primer paso.
      setPaso(0);
      if (product) {
        reset({
          brandId: product.brandId?._id || product.brandId || '',
          name: product.name,
          priceCost: product.priceCost,
          salePrice: product.salePrice,
          supplierId: product.supplierId?._id || product.supplierId || '',
          typeId: product.typeId?._id || product.typeId || '',
          moduleId: product.moduleId?._id || product.moduleId || '',
          description: product.description,
          expirationDate: product.expirationDate ? new Date(product.expirationDate).toISOString().split('T')[0] : '',
          stock: product.stock,
          barCode: product.barCode || '',
          unidadVenta: product.unidadVenta === 'libra' ? 'libra' : 'unidad',
          piezas: product.piezas ?? '',
          soloAdultos: !!product.soloAdultos,
          isActive: product.isActive !== false
        });
        setSelectedImage(null);
      } else {
        reset({
          brandId: '', name: '', priceCost: '', salePrice: '',
          supplierId: '', typeId: '', moduleId: '', description: '',
          expirationDate: '', stock: 0, barCode: '',
          unidadVenta: 'unidad', piezas: '', soloAdultos: false, isActive: true
        });
        setSelectedImage(null);
      }
    }
  }, [isOpen, product, reset]);

  // 4- Efectos para limpiar campos dependientes (Categorías, Proveedores, Marcas) cuando el padre cambia
  useEffect(() => {
    if (isOpen && !isEditing) {
      setValue('typeId', '');
      setValue('supplierId', '');
      setValue('brandId', '');
    }
  }, [watchModuleId, isOpen, isEditing, setValue]);

  useEffect(() => {
    if (isOpen && !isEditing) {
      setValue('brandId', '');
    }
  }, [watchSupplierId, isOpen, isEditing, setValue]);

  // Con un solo pasillo no hay nada que elegir: se marca solo. Obligar a clickear la única opción
  // posible es pedirle al empleado que confirme algo que no puede ser de otra manera.
  useEffect(() => {
    if (!isOpen || isEditing || watchModuleId) return;
    const activos = modulosVisibles(modules);
    if (activos.length === 1) setValue('moduleId', activos[0]._id);
  }, [isOpen, isEditing, watchModuleId, modules, setValue]);

  const PASOS = useMemo(() => ([
    { titulo: 'Dónde se vende', ayuda: 'El pasillo, la categoría y quién lo surte.' },
    { titulo: 'Qué es', ayuda: 'Nombre, foto y descripción.' },
    { titulo: 'Precio y venta', ayuda: 'Cuánto cuesta y cómo se vende.' },
    { titulo: 'Más detalles', ayuda: 'Opcionales: código, vencimiento, restricciones.' },
  ]), []);
  const ultimoPaso = PASOS.length - 1;

  if (!isOpen) return null;

  // 5- Manejar el cambio de la imagen del producto
  const handleImageChange = (file) => setSelectedImage(file);

  // Validación del paso actual antes de dejar avanzar.
  const validarPaso = async (n) => {
    const ok = await trigger(CAMPOS_POR_PASO[n]);
    // La foto es obligatoria para un producto nuevo, y su sitio es el paso 1.
    if (n === 1 && !isEditing && !selectedImage) {
      toast.error('La imagen es obligatoria para un producto nuevo');
      return false;
    }
    if (!ok) {
      const primero = CAMPOS_POR_PASO[n].map((c) => errors[c]).find((e) => e?.message)?.message;
      if (primero) toast.error(primero, { duration: 3500 });
    }
    return ok;
  };

  const siguiente = async () => {
    if (await validarPaso(paso)) setPaso((p) => Math.min(p + 1, ultimoPaso));
  };
  const atras = () => setPaso((p) => Math.max(p - 1, 0));

  // 6- Validar y empaquetar los datos para enviarlos al backend (FormData)
  const onSubmit = (data) => {
    if (!isEditing && !selectedImage) {
      setPaso(1);
      toast.error('La imagen es obligatoria para un producto nuevo');
      return;
    }

    // Código de barras: si lo dejaron vacío, se genera. Media tienda no tiene código impreso —frutas,
    // verduras, queso a granel— y obligar a inventarse uno a mano era una pared para justo esos
    // productos.
    if (!String(data.barCode || '').trim()) {
      data.barCode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    }

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('brandId', data.brandId);
    formData.append('priceCost', data.priceCost);
    formData.append('salePrice', data.salePrice);
    formData.append('supplierId', data.supplierId);
    formData.append('typeId', data.typeId);
    formData.append('moduleId', data.moduleId);
    formData.append('description', data.description);
    formData.append('expirationDate', data.expirationDate);
    formData.append('stock', data.stock);
    formData.append('barCode', data.barCode);
    formData.append('unidadVenta', data.unidadVenta || 'unidad');
    formData.append('piezas', data.piezas ?? '');
    formData.append('soloAdultos', data.soloAdultos ? 'true' : 'false');
    formData.append('isActive', data.isActive);

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    onSave({ formData, id: product?._id, previewData: data, selectedImage, originalImage: product?.image, originalProduct: product });
  };

  const onError = (errs) => {
    // Si lo que falló está en otro paso, el asistente salta a ese paso para que el aviso señale un
    // campo que de verdad está en pantalla.
    const campoFallo = Object.keys(errs || {}).find((c) => c in PASO_DE_CAMPO);
    if (campoFallo) setPaso(PASO_DE_CAMPO[campoFallo]);

    const primero = Object.values(errs || {}).find((e) => e?.message)?.message;
    if (primero) { toast.error(primero, { duration: 4000 }); return; }
    toast.error('Por favor, completa todos los campos obligatorios (Revisa si olvidaste la Marca, Categoría, etc.)', {
      duration: 4000,
    });
  };

  const selectCls = 'w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#00283D] disabled:opacity-50 disabled:bg-gray-100';
  const inputCls = 'w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#00283D]';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={modalTransition}
            /* bg-white → mapea a --theme-card-bg (opaco). Antes usaba
               bg-[#F1F6F9], que el admin-theme convierte en --theme-primary-light
               (un color translúcido) y dejaba ver la tabla a través del modal. */
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden relative z-10 max-h-[92vh]"
          >
            {/* ── Cabecera con el asistente ── */}
            <div className="bg-white border-b border-gray-100 p-5">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
                {isEditing ? 'Editar producto' : 'Nuevo producto'}
              </h2>

              {/* Pasos: número (o palomita si ya se pasó) + título */}
              <ol className="flex items-center gap-1">
                {PASOS.map((p, i) => {
                  const hecho = i < paso;
                  const actual = i === paso;
                  return (
                    <li key={p.titulo} className="flex-1 flex items-center gap-1 min-w-0">
                      <button
                        type="button"
                        // Solo se puede volver a un paso ya visitado; hacia
                        // adelante se avanza validando, no saltando.
                        onClick={() => { if (i <= paso) setPaso(i); }}
                        disabled={i > paso}
                        className="flex items-center gap-2 min-w-0"
                      >
                        <span
                          className="w-7 h-7 flex-none grid place-items-center rounded-full text-xs font-bold border transition-colors"
                          style={{
                            background: hecho || actual ? 'var(--theme-primary, #00283D)' : 'transparent',
                            borderColor: hecho || actual ? 'var(--theme-primary, #00283D)' : 'var(--theme-card-border, #d1d5db)',
                            color: hecho || actual ? 'var(--theme-button-text, #fff)' : 'var(--theme-text-muted, #9ca3af)',
                          }}
                        >
                          {hecho ? <Check className="w-4 h-4" /> : i + 1}
                        </span>
                        <span
                          className={`text-xs font-semibold truncate hidden sm:block ${actual ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                          {p.titulo}
                        </span>
                      </button>
                      {i < PASOS.length - 1 && (
                        <span className="flex-1 h-px bg-gray-200 mx-1 hidden sm:block" />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* ── Cuerpo: solo el paso actual ── */}
            <div className="p-6 flex-1 overflow-y-auto">
              <form id="product-form" onSubmit={handleSubmit(onSubmit, onError)}>
                <p className="text-sm text-gray-500 mb-5">{PASOS[paso].ayuda}</p>

                {/* Los campos de TODOS los pasos siguen montados (para que
                    react-hook-form los registre y valide de una), pero solo se
                    muestra el del paso actual. */}

                {/* ── Paso 1: ¿Dónde se vende? ── */}
                <section className={paso === 0 ? 'space-y-5' : 'hidden'}>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-0.5">
                      ¿En qué parte de la tienda se vende?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      El pasillo donde el cliente lo va a encontrar. Decide todo lo demás.
                    </p>

                    <input type="hidden" {...register('moduleId', { required: true })} />

                    <div className="flex flex-wrap gap-2">
                      {modulosActivos.map((m) => {
                        const activo = moduleIdActivo === m._id;
                        const Icono = iconoDeModulo(m);
                        return (
                          <button
                            type="button"
                            key={m._id}
                            onClick={() => setValue('moduleId', m._id, { shouldValidate: true })}
                            aria-pressed={activo}
                            className="press flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-colors"
                            style={{
                              borderColor: activo ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                              background: activo ? 'var(--theme-primary-light)' : 'var(--theme-card-bg)',
                              color: 'var(--theme-text-primary)',
                            }}
                          >
                            <Icono size={15} style={{ color: 'var(--theme-primary)' }} />
                            {m.name}
                          </button>
                        );
                      })}
                    </div>

                    {isPrintModule && (
                      <p className="text-xs text-gray-500 mt-2">
                        Este pasillo tiene su propia forma de comprarse: el cliente elegirá archivo, tamaño y color al pedirlo.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Categoría (Tipo)</label>
                      <select
                        {...register('typeId', { required: true })}
                        disabled={!moduleIdActivo}
                        className={selectCls}
                      >
                        <option value="">Seleccionar...</option>
                        {filteredCategories.map((c, i) => (
                          <option key={c._id || i} value={c._id || c}>{c.type || c}</option>
                        ))}
                      </select>
                      {moduleIdActivo && filteredCategories.length === 0 && (
                        <span className="text-xs text-gray-500 mt-1 block">
                          Este pasillo todavía no tiene categorías: creá una en <b>Catálogo → Categorías</b> antes de cargarle productos.
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Proveedor {isStoreModule && <span className="text-red-500">*</span>}
                        {isPrintModule && <span className="text-gray-400 font-normal"> (Opcional)</span>}
                      </label>
                      <select
                        {...register('supplierId', { required: isStoreModule })}
                        disabled={!moduleIdActivo}
                        className={`${selectCls} ${errors.supplierId ? 'border-red-500 bg-red-50' : ''}`}
                      >
                        <option value="">Seleccionar...</option>
                        {filteredSuppliers.map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                      {errors.supplierId && (
                        <span className="text-xs text-red-500 mt-1 block">
                          El proveedor es obligatorio en los pasillos de la tienda
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Marca
                      {isStoreModule && !watchSupplierId && (
                        <span className="text-gray-400 font-normal"> — elegí primero el proveedor</span>
                      )}
                    </label>
                    <select
                      {...register('brandId', { required: true })}
                      disabled={!watchSupplierId && isStoreModule}
                      className={selectCls}
                    >
                      <option value="">Seleccionar...</option>
                      {filteredBrands.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* ── Paso 2: ¿Qué es? ── */}
                <section className={paso === 1 ? 'space-y-4' : 'hidden'}>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Nombre del producto</label>
                    <input type="text" {...register('name', { required: true })} className={inputCls} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Imagen {!isEditing && <span className="text-red-500">*</span>}
                    </label>
                    <SubidorArchivo
                      accept="image/*"
                      maxMB={8}
                      valorInicial={imagenGuardada}
                      onArchivo={handleImageChange}
                      variante="panel"
                      ajuste="contain"
                      alto={180}
                      radio={12}
                      titulo="Arrastra la imagen o selecciona de tus archivos"
                      ayuda={isEditing ? '' : 'Obligatoria para un producto nuevo'}
                      etiquetaAria="Subir la imagen del producto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Descripción</label>
                    <textarea
                      {...register('description', { required: true })}
                      rows={3}
                      placeholder="Qué es, para qué sirve, qué trae…"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00283D] resize-none"
                    ></textarea>
                    <p className="text-xs text-gray-500 mt-1">Los saltos de línea se respetan tal como los escriba.</p>
                  </div>
                </section>

                {/* ── Paso 3: Precio y cómo se vende ── */}
                <section className={paso === 2 ? 'space-y-4' : 'hidden'}>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">¿Cómo se vende?</label>
                    <div className="flex gap-2 max-w-xs">
                      {UNIDADES.map((u) => {
                        const activa = watchUnidad === u.clave;
                        return (
                          <button
                            type="button"
                            key={u.clave}
                            onClick={() => setValue('unidadVenta', u.clave, { shouldValidate: true })}
                            aria-pressed={activa}
                            title={u.descripcion}
                            className="press flex-1 px-3 py-2 rounded-full border text-xs font-semibold transition-colors"
                            style={{
                              borderColor: activa ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                              background: activa ? 'var(--theme-primary-light)' : 'var(--theme-card-bg)',
                              color: activa ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                            }}
                          >
                            {u.nombre}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{unidad.descripcion}</p>
                    <input type="hidden" {...register('unidadVenta')} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Costo ($)</label>
                      <input
                        type="number" step="0.01" min="0"
                        onKeyDown={bloquearTeclasNumero}
                        {...register('priceCost', reglaPrecio('El costo'))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {porLibra ? 'Precio x libra ($)' : 'Precio ($)'}
                      </label>
                      <input
                        type="number" step="0.01" min="0"
                        onKeyDown={bloquearTeclasNumero}
                        {...register('salePrice', {
                          ...reglaPrecio('El precio de venta'),
                          // Regla de negocio: nunca vender por debajo del costo.
                          validate: (v, form) => {
                            const base = reglaPrecio('El precio de venta').validate(v);
                            if (base !== true) return base;
                            if (Number(v) < Number(form.priceCost || 0)) {
                              return 'El precio de venta no puede ser menor al costo';
                            }
                            return true;
                          },
                        })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  {(errors.priceCost || errors.salePrice) && (
                    <p className="text-xs text-red-500 -mt-2">
                      {errors.priceCost?.message || errors.salePrice?.message}
                    </p>
                  )}

                  <div className="max-w-xs">
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      {porLibra ? 'Libras en existencia' : 'Stock'}
                    </label>
                    <input
                      type="number" min="0" step={porLibra ? '0.01' : '1'}
                      onKeyDown={bloquearTeclasNumero}
                      {...register('stock', porLibra
                        ? {
                            required: 'Las libras en existencia son obligatorias',
                            validate: (v) => {
                              const n = Number(v);
                              if (!Number.isFinite(n) || n < 0) return 'Las libras deben ser un número de 0 o más';
                              return true;
                            },
                          }
                        : reglaEntero('El stock', 0))}
                      className={`${inputCls} text-center`}
                      placeholder={unidad.existencia}
                    />
                    {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock.message}</p>}
                  </div>
                </section>

                {/* ── Paso 4: Más detalles (opcionales) + estado ── */}
                <section className={paso === 3 ? 'space-y-4' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-bold text-gray-900">Código de barras</label>
                        <button
                          type="button"
                          onClick={() => setValue('barCode', Math.floor(1000000000000 + Math.random() * 9000000000000).toString())}
                          className="text-xs text-[#066494] hover:underline"
                        >
                          Generar
                        </button>
                      </div>
                      <input
                        type="text" inputMode="numeric"
                        onKeyDown={bloquearNoDigitos}
                        {...register('barCode', reglaCodigoBarras)}
                        className={`${inputCls} text-center`}
                        placeholder="Escanear o dejar en blanco"
                      />
                      {errors.barCode
                        ? <p className="text-xs text-red-500 mt-1">{errors.barCode.message}</p>
                        : <p className="text-xs text-gray-500 mt-1">Si lo deja vacío se genera uno interno.</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Fecha de expiración</label>
                      <input type="date" {...register('expirationDate')} className={inputCls} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">
                        {textoPiezas.titulo}{' '}
                        <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                      </label>
                      <input
                        type="number" min="0" step="1"
                        onKeyDown={bloquearTeclasNumero}
                        {...register('piezas')}
                        className={`${inputCls} text-center`}
                        placeholder={textoPiezas.pista}
                      />
                      <p className="text-xs text-gray-500 mt-1">{textoPiezas.ayuda}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Venta restringida</label>
                      <label className="flex items-center gap-2 cursor-pointer py-2">
                        <input
                          type="checkbox"
                          {...register('soloAdultos')}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: 'var(--theme-primary)' }}
                        />
                        <span className="text-sm text-gray-700">Solo para mayores de 18</span>
                      </label>
                      <p className="text-xs text-gray-500">Se marca en la tienda y se pedirá documento al entregar.</p>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="pt-4 border-t border-gray-200">
                      <label className="flex items-center cursor-pointer w-max">
                        <div className="relative">
                          <input type="checkbox" className="sr-only" {...register('isActive')} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${watchIsActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${watchIsActive ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-gray-700">
                          Estado: {watchIsActive ? 'Activo' : 'Inactivo'}
                        </div>
                      </label>
                    </div>
                  )}
                </section>
              </form>
            </div>

            {/* ── Pie: navegación del asistente ── */}
            <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
              {/* Eliminar queda a la izquierda, solo al editar. */}
              <div className="flex-1">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2 rounded-full transition-colors text-sm"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              {paso > 0 && (
                <button
                  type="button"
                  onClick={atras}
                  className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-5 py-2 rounded-full transition-colors text-sm"
                >
                  <ChevronLeft size={16} /> Atrás
                </button>
              )}

              {paso < ultimoPaso ? (
                <button
                  type="button"
                  onClick={siguiente}
                  className="flex items-center gap-1 bg-[#003049] hover:bg-[#00283D] text-white font-medium px-6 py-2 rounded-full transition-colors text-sm"
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  form="product-form"
                  type="submit"
                  className="bg-[#003049] hover:bg-[#00283D] text-white font-medium px-8 py-2 rounded-full transition-colors text-sm"
                >
                  {isEditing ? 'Guardar cambios' : 'Crear producto'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductFormModal;
