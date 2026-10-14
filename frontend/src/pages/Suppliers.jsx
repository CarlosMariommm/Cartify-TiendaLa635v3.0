import { useState, useEffect } from 'react';
import { Search, Wallet, AlertTriangle } from 'lucide-react';
import { useResumenCredito } from '../hooks/useCreditoProveedor';
import CuentaProveedorModal from '../components/Admin/CuentaProveedorModal';
import FilterSelect from '../components/UI/FilterSelect';
import DataTable from '../components/UI/DataTable';
import { supplierService } from '../api/supplierService';
import { brandService } from '../api/brandService';
import toast from 'react-hot-toast';
import SupplierFormModal from '../components/Admin/SupplierFormModal';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import TableActions from '../components/UI/TableActions';
import { nombreDelCanal } from '../utils/pedidoProveedor';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const columns = ['Nombre', 'Teléfono', 'Se le pide por', 'Deuda', 'Estado', 'Acciones'];

  // Deuda de cada proveedor, para verla sin abrir el estado de cuenta.
  const { proveedores: creditos, totales, recargar: recargarCredito } = useResumenCredito();
  const creditoDe = (id) => creditos.find((c) => String(c._id) === String(id));
  const [cuentaAbierta, setCuentaAbierta] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [pendingAction, setPendingAction] = useState({ type: null, data: null });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const filteredSuppliers = suppliers.filter(supplier => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = supplier.name?.toLowerCase().includes(searchString) || 
                          supplier.phoneNumber?.toLowerCase().includes(searchString);
    
    if (statusFilter === 'Todos') return matchesSearch;
    if (statusFilter === 'Activo') return matchesSearch && supplier.isActive !== false;
    if (statusFilter === 'Inactivo') return matchesSearch && supplier.isActive === false;
    
    return matchesSearch;
  });

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [supplierData, brandData] = await Promise.all([
        supplierService.getSuppliers(),
        brandService.getBrands()
      ]);
      setSuppliers(supplierData);
      setBrands(brandData.filter(b => b.isActive !== false)); // Optional filter
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

  const handleAddSupplier = () => {
    setCurrentSupplier(null);
    setIsFormOpen(true);
  };

  const handleEditSupplier = (supplier) => {
    setCurrentSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDeleteSupplier = (supplier) => {
    setPendingAction({ type: 'delete', data: supplier });
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
          await supplierService.updateSupplier(payload.id, payload.data);
          toast.success("Proveedor actualizado");
        } else {
          await supplierService.createSupplier(payload.data);
          toast.success("Proveedor creado");
        }
      } else if (pendingAction.type === 'delete') {
        await supplierService.deleteSupplier(payload._id);
        toast.success("Proveedor eliminado");
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

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <h1 className="text-4xl font-extrabold text-[#066494] mb-6">Proveedores</h1>

      {/*
        Lo vencido, arriba de todo. Es plata que ya se debía pagar y suele venir
        con recargo: si hay que ver una sola cosa al entrar, es esta.
      */}
      {totales.vencido > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-none mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-700">
              ${totales.vencido.toFixed(2)} vencidos con proveedores
            </p>
            <p className="text-sm text-red-600">
              De ${totales.deuda.toFixed(2)} que se deben en total
              {totales.porVencer > 0 && `, y $${totales.porVencer.toFixed(2)} vencen esta semana`}.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">Listado de Proveedores</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar proveedor..." 
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
            <button 
              onClick={handleAddSupplier}
              className="px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
            >
              Agregar Proveedor
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando proveedores...</p>
        ) : (
          <DataTable 
            columns={columns}
            data={filteredSuppliers}
            renderRow={(item) => (
              <>
                <td className="py-4 px-4 text-sm text-gray-800 font-medium">{item.name}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{item.phoneNumber}</td>
                {/* Por dónde se le hacen los pedidos (el botón "Pedir" del pronóstico) */}
                <td className="py-4 px-4 text-sm text-gray-600">
                  {nombreDelCanal(item.pedidos) || <span className="text-gray-300">—</span>}
                </td>
                {/* La deuda abre el estado de cuenta; lo vencido va en rojo */}
                <td className="py-4 px-4 text-sm">
                  {(() => {
                    const cr = creditoDe(item._id);
                    if (!cr || cr.deuda === 0) {
                      return <span className="text-gray-300">—</span>;
                    }
                    return (
                      <button
                        onClick={() => setCuentaAbierta(item)}
                        className="press flex items-center gap-2 hover:underline"
                        title="Ver estado de cuenta"
                      >
                        <span className="font-bold text-gray-800">${cr.deuda.toFixed(2)}</span>
                        {cr.montoVencido > 0 && (
                          <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                            ${cr.montoVencido.toFixed(2)} vencido
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </td>
                <td className={`py-4 px-4 text-sm font-medium ${item.isActive === false ? 'text-red-500' : 'text-green-500'}`}>
                  {item.isActive === false ? 'Inactivo' : 'Activo'}
                </td>
                <td className="py-4 px-4 text-sm">
                  <div className="flex items-center gap-3">
                    {/*
                      Mismo padding/redondeo/sombreado de fondo que Editar y
                      Eliminar (ver TableActions.jsx) — antes solo cambiaba de
                      color al pasar el mouse, y ese cambio de color ni se
                      notaba (ver el fix del hover en index.css), así que el
                      botón parecía no reaccionar a nada.
                    */}
                    <button
                      onClick={() => setCuentaAbierta(item)}
                      className="press p-1.5 rounded-md text-[#003049] hover:text-[#00283D] hover:bg-gray-100 transition-colors"
                      title="Estado de cuenta"
                    >
                      <Wallet size={17} />
                    </button>
                    <TableActions
                      onEdit={() => handleEditSupplier(item)}
                      onDelete={() => handleDeleteSupplier(item)}
                    />
                  </div>
                </td>
              </>
            )}
          />
        )}
      </div>

      <SupplierFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        supplier={currentSupplier}
        onSave={handleSaveForm}
        brands={brands}
        /*
          La marca recién creada desde el formulario se suma a la lista de aquí
          para que aparezca entre las casillas al instante. No se recarga todo:
          el formulario está abierto y con datos a medio escribir.
        */
        onMarcaCreada={(nueva) => setBrands((prev) => [...prev, nueva])}
      />

      <GenericConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        data={pendingAction.data}
        actionType={pendingAction.type}
        entityName="Proveedor"
      />

      <CuentaProveedorModal
        isOpen={!!cuentaAbierta}
        onClose={() => { setCuentaAbierta(null); recargarCredito(); }}
        proveedor={cuentaAbierta}
      />
    </div>
  );
};

export default Suppliers;
