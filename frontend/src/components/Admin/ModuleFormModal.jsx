import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { modalTransition } from '../../utils/motion';
import { ICONOS_MODULO, flujoDeModulo } from '../../utils/modulos';

const ModuleFormModal = ({ isOpen, onClose, moduleData, onSave }) => {
  const { register, handleSubmit, reset, watch, setValue } = useForm();

  const isEditing = !!moduleData;
  const watchIsActive = watch('isActive');
  const watchIcono = watch('icono');

  useEffect(() => {
    if (isOpen) {
      if (moduleData) {
        reset({
          name: moduleData.name,
          description: moduleData.description,
          isActive: moduleData.isActive !== false,
          icono: moduleData.icono || 'tienda',
          // Los módulos viejos no tienen el campo: se deduce del nombre.
          flujo: flujoDeModulo(moduleData),
        });
      } else {
        reset({ name: '', description: '', isActive: true, icono: 'tienda', flujo: 'estandar' });
      }
    }
  }, [isOpen, moduleData, reset]);

  const onError = () => {
    toast.error('Por favor, completa todos los campos obligatorios', { duration: 4000 });
  };

  const onSubmit = (data) => {
    onSave({ data, id: moduleData?._id });
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden relative z-10"
      >
        <div className="bg-[#00283D] text-white p-6">
          <h2 className="text-2xl font-bold text-center">
            {isEditing ? 'Editar Módulo' : 'Nuevo Módulo'}
          </h2>
        </div>

        <div className="p-6 bg-[#F1F6F9] flex-1 flex flex-col">
          <form id="module-form" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 flex-1">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Módulo</label>
              <input 
                type="text" 
                {...register('name', { required: true })}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]"
                placeholder="Ej. Panadería, Pupusería, Librería..."
              />
            </div>

            {/* El icono es la cara del módulo en la pantalla de servicios del cliente: es lo primero que se ve
               al entrar. */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Icono</label>
              <input type="hidden" {...register('icono')} />
              <div className="flex flex-wrap gap-2">
                {ICONOS_MODULO.map(({ id, nombre, Icono }) => {
                  const activo = watchIcono === id;
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setValue('icono', id)}
                      title={nombre}
                      aria-label={`Icono ${nombre}`}
                      aria-pressed={activo}
                      className="press w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
                      style={{
                        borderColor: activo ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                        background: activo ? 'var(--theme-primary-light)' : 'var(--theme-card-bg)',
                      }}
                    >
                      <Icono size={17} style={{ color: 'var(--theme-primary)' }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AQUÍ HABÍA UN SELECTOR DE "¿CÓMO SE COMPRA?" con dos opciones: pasillo normal o pantalla propia
               tipo Impresiones. Se quitó. El motivo: elegir "pide datos antes de comprar" prometía una
               pantalla que NO existe. */}
            <input type="hidden" {...register('flujo')} />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
              <textarea 
                {...register('description', { required: true })}
                rows={4}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00283D] resize-none"
                placeholder="Breve descripción del módulo..."
              ></textarea>
            </div>

            {isEditing && (
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center cursor-pointer">
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
              form="module-form"
              type="submit"
              className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium px-8 py-2 rounded-full transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

export default ModuleFormModal;
