import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';
import DataTable from '../components/UI/DataTable';
import { moduleService } from '../api/moduleService';
import toast from 'react-hot-toast';
import ModuleFormModal from '../components/Admin/ModuleFormModal';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import TableActions from '../components/UI/TableActions';

const Modules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const columns = ['Nombre', 'Descripción', 'Estado', 'Acciones'];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState(null);
  const [pendingAction, setPendingAction] = useState({ type: null, data: null });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  // Lo más reciente primero: lo que se acaba de agregar. Ver utils/listasPanel.js.
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  const filteredModules = modules.filter(mod => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = mod.name?.toLowerCase().includes(searchString);
    
    if (statusFilter === 'Todos') return matchesSearch;
    if (statusFilter === 'Activo') return matchesSearch && String(mod.isActive) !== 'false';
    if (statusFilter === 'Inactivo') return matchesSearch && String(mod.isActive) === 'false';
    
    return matchesSearch;
  });

  const fetchModules = async () => {
    try {
      setLoading(true);
      const data = await moduleService.getModules();
      setModules(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleAddModule = () => {
    setCurrentModule(null);
    setIsFormOpen(true);
  };

  const handleEditModule = (mod) => {
    setCurrentModule(mod);
    setIsFormOpen(true);
  };

  const handleDeleteModule = (mod) => {
    setPendingAction({ type: 'delete', data: mod });
    setIsConfirmOpen(true);
  };

  const handleSaveForm = (savePayload) => {
    setPendingAction({ type: 'save', data: savePayload });
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async (payload) => {
    try {
      if (pendingAction.type === 'save') {
        if (payload.id) {
          await moduleService.updateModule(payload.id, payload.data);
          toast.success("Módulo actualizado");
        } else {
          await moduleService.createModule(payload.data);
          toast.success("Módulo creado");
        }
      } else if (pendingAction.type === 'delete') {
        await moduleService.deleteModule(payload._id);
        toast.success("Módulo eliminado");
      }
      
      fetchModules();
      setIsConfirmOpen(false);
      setIsFormOpen(false);
      setPendingAction({ type: null, data: null });
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error en la operación';
      toast.error(msg);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <h1 className="text-4xl font-extrabold text-[#066494] mb-6">Módulos</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">Listado de Módulos</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar módulo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] transition-colors w-64 shadow-sm"
              />
            </div>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'Activo', label: 'Activos' },
                { value: 'Inactivo', label: 'Inactivos' },
              ]}
            />
            <OrdenSelect value={orden} onChange={setOrden} />
            <button 
              onClick={handleAddModule}
              className="px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
            >
              Agregar Módulo
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando módulos...</p>
        ) : (
          <DataTable 
            columns={columns}
            data={ordenarLista(filteredModules, orden)}
            renderRow={(item) => (
              <>
                <td className="py-4 px-4 text-sm text-gray-800">{item.name}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{item.description}</td>
                <td className={`py-4 px-4 text-sm font-medium ${item.isActive ? 'text-green-500' : 'text-red-500'}`}>
                  {item.isActive ? 'Activo' : 'Inactivo'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-800">
                  <TableActions 
                    onEdit={() => handleEditModule(item)} 
                    onDelete={() => handleDeleteModule(item)} 
                  />
                </td>
              </>
            )}
          />
        )}
      </div>

      <ModuleFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        moduleData={currentModule}
        onSave={handleSaveForm}
      />

      <GenericConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        data={pendingAction.data}
        actionType={pendingAction.type}
        entityName="Módulo"
      />
    </div>
  );
};

export default Modules;
