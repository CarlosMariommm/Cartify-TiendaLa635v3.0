import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';
import DataTable from '../components/UI/DataTable';
import { employeeService } from '../api/employeeService';
import toast from 'react-hot-toast';
import EmployeeFormModal from '../components/Admin/EmployeeFormModal';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import TableActions from '../components/UI/TableActions';
import { formatearDui, formatearTelefono } from '../utils/mascaras';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const columns = ['Nombre', 'Número de Teléfono', 'Correo', 'DUI', 'Nombre de Usuario', 'Estatus', 'Acciones'];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [pendingAction, setPendingAction] = useState({ type: null, data: null });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  // Lo más reciente primero: lo que se acaba de agregar. Ver utils/listasPanel.js.
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  // 1- Filtrado de empleados basado en la búsqueda y el estado
  const filteredEmployees = employees.filter(emp => {
    const searchString = searchTerm.toLowerCase();
    const fullName = emp.fullName || emp.name || '';
    const matchesSearch = fullName.toLowerCase().includes(searchString) || 
                          emp.email?.toLowerCase().includes(searchString) ||
                          emp.userName?.toLowerCase().includes(searchString);
    
    if (statusFilter === 'Todos') return matchesSearch;
    if (statusFilter === 'Activo') return matchesSearch && emp.isActive !== false;
    if (statusFilter === 'Inactivo') return matchesSearch && emp.isActive === false;
    
    return matchesSearch;
  });

  // 2- Obtener la lista de empleados (SELECT)
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = () => {
    setCurrentEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditEmployee = (emp) => {
    setCurrentEmployee(emp);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = (emp) => {
    setPendingAction({ type: 'delete', data: emp });
    setIsConfirmOpen(true);
  };

  const handleSaveForm = (savePayload) => {
    setPendingAction({ type: 'save', data: savePayload });
    setIsConfirmOpen(true);
  };

  // 3- Ejecutar la acción confirmada (INSERT, UPDATE o DELETE)
  const handleConfirmAction = async (payload) => {
    try {
      if (pendingAction.type === 'save') {
        if (payload.id) {
          await employeeService.updateEmployee(payload.id, payload.formData);
          toast.success("Empleado actualizado");
        } else {
          await employeeService.createEmployee(payload.formData);
          toast.success("Empleado creado");
        }
      } else if (pendingAction.type === 'delete') {
        await employeeService.deleteEmployee(payload._id);
        toast.success("Empleado eliminado");
      }
      fetchEmployees();
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
      <h1 className="text-4xl font-extrabold text-[#066494] mb-6">Empleados</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">Listado de Empleados</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar empleado..." 
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
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm">
              Descargar todo
            </button>
            <button 
              onClick={handleAddEmployee}
              className="px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
            >
              Añadir Empleados
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando empleados...</p>
        ) : (
          <DataTable 
            columns={columns}
            data={ordenarLista(filteredEmployees, orden, { nombre: (e) => e.fullName || e.name })}
            renderRow={(item) => (
              <>
                <td className="py-4 px-4 text-sm text-gray-800">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img src={item.image} alt={item.fullName} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                    )}
                    {item.fullName || item.name}
                  </div>
                </td>
                {/* Mismo criterio que en Clientes: lo que se guardó sin formato
                    se muestra formateado, para que la columna se lea pareja. */}
                <td className="py-4 px-4 text-sm text-gray-600">{formatearTelefono(item.phoneNumber)}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{item.email}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{formatearDui(item.dui)}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{item.userName}</td>
                <td className={`py-4 px-4 text-sm font-medium ${item.isActive ? 'text-green-500' : 'text-red-500'}`}>
                  {item.isActive ? 'Activo' : 'Inactivo'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-800">
                  <TableActions 
                    onEdit={() => handleEditEmployee(item)} 
                    onDelete={() => handleDeleteEmployee(item)} 
                  />
                </td>
              </>
            )}
          />
        )}
      </div>

      <EmployeeFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        employee={currentEmployee}
        onSave={handleSaveForm}
      />

      <GenericConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        data={pendingAction.data}
        actionType={pendingAction.type}
        entityName="Empleado"
      />
    </div>
  );
};

export default Employees;
