import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';
import DataTable from '../components/UI/DataTable';
import { brandService } from '../api/brandService';
import toast from 'react-hot-toast';
import BrandFormModal from '../components/Admin/BrandFormModal';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import TableActions from '../components/UI/TableActions';

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const columns = ['Nombre', 'Estado', 'Acciones'];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [pendingAction, setPendingAction] = useState({ type: null, data: null });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  // Lo más reciente primero: lo que se acaba de agregar. Ver utils/listasPanel.js.
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  const filteredBrands = brands.filter(brand => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = brand.name?.toLowerCase().includes(searchString);
    
    if (statusFilter === 'Todos') return matchesSearch;
    if (statusFilter === 'Activo') return matchesSearch && brand.isActive !== false;
    if (statusFilter === 'Inactivo') return matchesSearch && brand.isActive === false;
    
    return matchesSearch;
  });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const data = await brandService.getBrands();
      setBrands(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleAddBrand = () => {
    setCurrentBrand(null);
    setIsFormOpen(true);
  };

  const handleEditBrand = (brand) => {
    setCurrentBrand(brand);
    setIsFormOpen(true);
  };

  const handleDeleteBrand = (brand) => {
    setPendingAction({ type: 'delete', data: brand });
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
          await brandService.updateBrand(payload.id, payload.data);
          toast.success("Marca actualizada");
        } else {
          await brandService.createBrand(payload.data);
          toast.success("Marca creada");
        }
      } else if (pendingAction.type === 'delete') {
        await brandService.deleteBrand(payload._id);
        toast.success("Marca eliminada");
      }
      
      fetchBrands();
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
      <h1 className="text-4xl font-extrabold text-[#066494] mb-6">Marcas</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">Listado de Marcas</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar marca..." 
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
              onClick={handleAddBrand}
              className="px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
            >
              Agregar Marca
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando marcas...</p>
        ) : (
          <DataTable 
            columns={columns}
            data={ordenarLista(filteredBrands, orden)}
            renderRow={(item) => (
              <>
                <td className="py-4 px-4 text-sm text-gray-800">{item.name}</td>
                <td className={`py-4 px-4 text-sm font-medium ${item.isActive ? 'text-green-500' : 'text-red-500'}`}>
                  {item.isActive ? 'Activo' : 'Inactivo'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-800">
                  <TableActions 
                    onEdit={() => handleEditBrand(item)} 
                    onDelete={() => handleDeleteBrand(item)} 
                  />
                </td>
              </>
            )}
          />
        )}
      </div>

      <BrandFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        brand={currentBrand}
        onSave={handleSaveForm}
      />

      <GenericConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        data={pendingAction.data}
        actionType={pendingAction.type}
        entityName="Marca"
      />
    </div>
  );
};

export default Brands;
