import { useForm } from 'react-hook-form';
import { reglaTelefono, bloquearNoDigitos } from '../../utils/validaciones';
import { formatearTelefono, LARGO_TELEFONO } from '../../utils/mascaras';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { modalTransition } from '../../utils/motion';
import { brandService } from '../../api/brandService';

// Por dónde se le hacen los pedidos a este proveedor: el botón "Pedir" de la compra sugerida
// (pantalla Pronóstico) sale por aquí. Ver utils/pedidoProveedor.js.
const CANALES_DE_PEDIDO = [
  ['', 'Sin definir'],
  ['whatsapp', 'WhatsApp'],
  ['app', 'App o sitio web (BEES…)'],
  ['llamada', 'Llamada'],
];
const SIN_CANAL = { canal: '', whatsapp: '', app: '', enlace: '' };

const SupplierFormModal = ({ isOpen, onClose, supplier, onSave, brands = [], onMarcaCreada }) => {
  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm();

  // ── DAR DE ALTA UNA MARCA SIN SALIRSE DE AQUÍ ──
  // El caso es de todos los días: se está registrando un proveedor nuevo y una de las marcas que
  // distribuye todavía no existe en el sistema.
  const [creandoMarca, setCreandoMarca] = useState(false);
  const [nombreMarca, setNombreMarca] = useState('');
  const [guardandoMarca, setGuardandoMarca] = useState(false);
  
  const isEditing = !!supplier;
  const watchIsActive = watch('isActive');
  const canalDePedido = watch('pedidos.canal') || '';

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        reset({ 
          name: supplier.name || '', 
          phoneNumber: supplier.phoneNumber || '',
          email: supplier.email || '',
          // creditDays queda fuera a propósito: si el formulario lo enviara,
          // sobrescribiría el plazo configurado en el estado de cuenta.
          brandIds: supplier.brandIds || [],
          isActive: supplier.isActive !== false,
          pedidos: { ...SIN_CANAL, ...(supplier.pedidos || {}) },
        });
      } else {
        reset({ 
          name: '', 
          phoneNumber: '',
          email: '',
          brandIds: [],
          isActive: true,
          pedidos: { ...SIN_CANAL },
        });
      }
    }
  }, [isOpen, supplier, reset]);

  const crearMarca = async () => {
    const nombre = nombreMarca.trim();
    if (!nombre) { toast.error('Escriba el nombre de la marca'); return; }
    if (guardandoMarca) return;

    setGuardandoMarca(true);
    try {
      const r = await brandService.createBrand({ name: nombre, isActive: true });
      const nueva = r?.brand;
      if (!nueva?._id) throw new Error('El servidor no devolvió la marca');

      // La lista de marcas vive en la pantalla de Proveedores; se le avisa para
      // que la nueva aparezca entre las casillas sin recargar nada.
      onMarcaCreada?.(nueva);

      // Y queda MARCADA. Nadie crea una marca aquí adentro para después no asociarla: obligar a buscarla
      // y tildarla sería pedir un paso que ya se dijo con el simple hecho de haberla creado.
      setValue('brandIds', [...(getValues('brandIds') || []), nueva._id]);

      toast.success(`Marca "${nueva.name}" creada y asociada`);
      setNombreMarca('');
      setCreandoMarca(false);
    } catch (error) {
      // El aviso del servidor (nombre repetido, por ejemplo) ya lo pintó el
      // interceptor de api.js; aquí solo se deja la cajita abierta para
      // corregir sin volver a escribir todo.
      if (!error?.response) toast.error('No se pudo crear la marca');
    } finally {
      setGuardandoMarca(false);
    }
  };

  const onSubmit = (data) => {
    onSave({ data, id: supplier?._id });
  };

  const onError = (errs) => {
    // Si una regla dejó mensaje concreto (DUI, teléfono...), mostramos ese.
    const primero = Object.values(errs || {}).find((e) => e?.message)?.message;
    if (primero) { toast.error(primero, { duration: 4000 }); return; }
    toast.error('Por favor, completa todos los campos obligatorios', { duration: 4000 });
  };

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
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden relative z-10"
      >
        <div className="bg-[#00283D] text-white p-6">
          <h2 className="text-2xl font-bold text-center">
            {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
        </div>

        <div className="p-6 bg-[#F1F6F9] flex-1 flex flex-col overflow-y-auto">
          <form id="supplier-form" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 flex-1">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Proveedor</label>
                <input 
                  type="text" 
                  {...register('name', { required: true })}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]"
                  placeholder="Distribuidora XYZ..."
                />
              </div>

              {/* Los días de crédito se movieron al estado de cuenta del proveedor, donde van junto al límite:
                 son las dos mitades de la misma condición ("$1000 a 30 días") y tenerlas en pantallas distintas
                 obligaba a acordarse de cambiar las dos. */}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={LARGO_TELEFONO}
                  {...register('phoneNumber', reglaTelefono)}
                  onKeyDown={bloquearNoDigitos}
                  onInput={(e) => { e.target.value = formatearTelefono(e.target.value); }}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]"
                  placeholder="7777-7777"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Correo Electrónico</label>
                <input 
                  type="email" 
                  {...register('email', { required: true })}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]"
                  placeholder="contacto@proveedor.com"
                />
              </div>
            </div>

            {/* Por dónde se le piden los pedidos: lo usa el botón "Pedir" del pronóstico */}
            <div>
              <p className="block text-sm font-bold text-gray-700 mb-1">Cómo se le hacen los pedidos</p>
              <p className="text-xs text-gray-500 mb-3">
                Desde la compra sugerida del pronóstico, el pedido sale por aquí con un toque.
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cómo se le hacen los pedidos">
                {CANALES_DE_PEDIDO.map(([valor, texto]) => (
                  <label
                    key={valor || 'ninguno'}
                    className={`cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium border ${canalDePedido === valor ? 'bg-[#00283D] text-white border-[#00283D]' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    <input type="radio" value={valor} {...register('pedidos.canal')} className="sr-only" />
                    {texto}
                  </label>
                ))}
              </div>

              {canalDePedido === 'whatsapp' && (
                <div className="mt-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={LARGO_TELEFONO}
                    {...register('pedidos.whatsapp')}
                    onKeyDown={bloquearNoDigitos}
                    onInput={(e) => { e.target.value = formatearTelefono(e.target.value); }}
                    aria-label="Número de WhatsApp para pedidos"
                    className="w-full sm:w-1/2 bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]"
                    placeholder="7777-7777"
                  />
                  <p className="text-xs text-gray-500 mt-1">Si lo deja vacío, se usa el teléfono del proveedor. El mensaje con la lista va ya escrito.</p>
                </div>
              )}

              {canalDePedido === 'app' && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    maxLength={30}
                    {...register('pedidos.app')}
                    aria-label="Nombre de la app"
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]"
                    placeholder="BEES"
                  />
                  <input
                    type="url"
                    {...register('pedidos.enlace', {
                      validate: (v, todo) => todo?.pedidos?.canal !== 'app' || /^https?:\/\/\S+\.\S+/.test(v || '') || 'Escriba el enlace de la app o sitio donde se le pide (https://…)',
                    })}
                    aria-label="Enlace de la app o sitio"
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]"
                    placeholder="https://…"
                  />
                  <p className="text-xs text-gray-500 sm:col-span-2">
                    Apps como BEES no permiten recibir pedidos de otro sistema: el botón abre la app y deja la lista copiada para pegarla en el carrito.
                  </p>
                </div>
              )}

              {canalDePedido === 'llamada' && (
                <p className="text-xs text-gray-500 mt-3">Se marca el teléfono del proveedor, con la lista copiada para tenerla a mano.</p>
              )}
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <label className="block text-sm font-bold text-gray-700">Marcas Asociadas</label>

                {/* Crear una marca que todavía no existe, sin perder este formulario. */}
                {!creandoMarca && (
                  <button
                    type="button"
                    onClick={() => setCreandoMarca(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#00283D] hover:underline"
                  >
                    <Plus size={14} /> Nueva marca
                  </button>
                )}
              </div>

              {creandoMarca && (
                <div className="flex items-center gap-2 mb-2 p-3 rounded-xl bg-[#F1F6F9] border border-[#E4D5C3]">
                  <input
                    autoFocus
                    value={nombreMarca}
                    onChange={(e) => setNombreMarca(e.target.value)}
                    // Enter crea la marca y NO envía el formulario del proveedor. Sin el preventDefault, escribir el
                    // nombre y darle Enter guardaba el proveedor a medio llenar.
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); crearMarca(); }
                      if (e.key === 'Escape') { setCreandoMarca(false); setNombreMarca(''); }
                    }}
                    placeholder="Nombre de la marca nueva"
                    className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00283D]"
                  />
                  <button
                    type="button"
                    onClick={crearMarca}
                    disabled={guardandoMarca || !nombreMarca.trim()}
                    className="flex items-center gap-1.5 bg-[#00283D] text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardandoMarca && <Loader2 size={14} className="animate-spin" />}
                    {guardandoMarca ? 'Creando…' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreandoMarca(false); setNombreMarca(''); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="bg-white border border-gray-300 rounded-xl p-4 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {brands.map(brand => (
                    <label key={brand._id} className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        value={brand._id}
                        {...register('brandIds')}
                        className="rounded border-gray-300 text-[#00283D] focus:ring-[#00283D]"
                      />
                      <span className="text-sm text-gray-700">{brand.name}</span>
                    </label>
                  ))}
                  {brands.length === 0 && (
                    <p className="text-sm text-gray-500 italic col-span-3">
                      No hay marcas registradas. Use "Nueva marca" aquí arriba para crear la primera.
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {isEditing && (
              <div className="pt-4 border-t border-gray-100">
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

          </form>
          
          <div className="mt-8 flex justify-end gap-3 w-full">
            <button 
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-6 py-2 rounded-full transition-colors"
            >
              Cancelar
            </button>
            <button 
              form="supplier-form"
              type="submit"
              className="bg-[#00283D] hover:bg-[#003049] text-white font-medium px-8 py-2 rounded-full transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

export default SupplierFormModal;
