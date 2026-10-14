import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';
import DataTable from '../components/UI/DataTable';
import { productTypeService } from '../api/productTypeService';
import { moduleService } from '../api/moduleService';
import { supplierService } from '../api/supplierService';
import toast from 'react-hot-toast';
import CategoryFormModal from '../components/Admin/CategoryFormModal';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import TableActions from '../components/UI/TableActions';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [modules, setModules] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const columns = ['Tipo', 'Módulo', 'Estado', 'Acciones'];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [pendingAction, setPendingAction] = useState({ type: null, data: null });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  // Lo más reciente primero: lo que se acaba de agregar. Ver utils/listasPanel.js.
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  const filteredCategories = categories.filter(category => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = category.type?.toLowerCase().includes(searchString);
    
    if (statusFilter === 'Todos') return matchesSearch;
    if (statusFilter === 'Activo') return matchesSearch && category.isActive !== false;
    if (statusFilter === 'Inactivo') return matchesSearch && category.isActive === false;
    
    return matchesSearch;
  });

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [categoryData, moduleData, supplierData] = await Promise.all([
        productTypeService.getProductTypes(),
        moduleService.getModules(),
        supplierService.getSuppliers()
      ]);
      setCategories(categoryData);
      setModules(moduleData);
      setSuppliers(supplierData.filter(s => s.isActive !== false));
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category) => {
    setCurrentCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteCategory = (category) => {
    setPendingAction({ type: 'delete', data: category });
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
          await productTypeService.updateProductType(payload.id, payload.data);
          toast.success("Categoría actualizada");
        } else {
          await productTypeService.createProductType(payload.data);
          toast.success("Categoría creada");
        }
      } else if (pendingAction.type === 'delete') {
        await productTypeService.deleteProductType(payload._id);
        toast.success("Categoría eliminada");
      }
      
      fetchInitialData();
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

  const getModuleName = (moduleId) => {
    const mod = modules.find(m => m._id === moduleId);
    return mod ? mod.name : 'Desconocido';
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <h1 className="text-4xl font-extrabold text-[#066494] mb-6">Categorías</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">Listado de Categorías</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar categoría..." 
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
              onClick={handleAddCategory}
              className="px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
            >
              Agregar Categoría
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando categorías...</p>
        ) : (
          <DataTable 
            columns={columns}
            data={ordenarLista(filteredCategories, orden, { nombre: (c) => c.type })}
            renderRow={(item) => (
              <>
                <td className="py-4 px-4 text-sm text-gray-800 font-medium">{item.type}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{getModuleName(item.moduleId)}</td>
                <td className={`py-4 px-4 text-sm font-medium ${item.isActive === false ? 'text-red-500' : 'text-green-500'}`}>
                  {item.isActive === false ? 'Inactivo' : 'Activo'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-800">
                  <TableActions 
                    onEdit={() => handleEditCategory(item)} 
                    onDelete={() => handleDeleteCategory(item)} 
                  />
                </td>
              </>
            )}
          />
        )}
      </div>

      <CategoryFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        category={currentCategory}
        onSave={handleSaveForm}
        modules={modules}
        suppliers={suppliers}
      />

      <GenericConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        data={pendingAction.data}
        actionType={pendingAction.type}
        entityName="Categoría"
      />
    </div>
  );
};

export default Categories;
