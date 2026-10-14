import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { Plus, Search, FileSpreadsheet } from 'lucide-react';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';
import CategoryPills from '../components/Inventory/CategoryPills';
import ProductCard from '../components/Inventory/ProductCard';
import ProductFormModal from '../components/Inventory/ProductFormModal';
import ProductViewModal from '../components/Inventory/ProductViewModal';
import ConfirmActionModal from '../components/Inventory/ConfirmActionModal';
import ImportarExcel from '../components/Inventory/ImportarExcel';
import ConsejoImportar from '../components/Inventory/ConsejoImportar';
// El <Toaster> global vive en App.jsx (uno solo, para que los avisos se cierren bien).

const Inventory = () => {
  const { 
    products, 
    categories,
    categoryNames,
    brands,
    suppliers,
    modules,
    selectedCategory, 
    setSelectedCategory,
    saveProduct,
    deleteProduct,
    recargar
  } = useInventory();

  // Importar desde Excel: la IA completa y busca las fotos. Ver ImportarExcel.
  const [importando, setImportando] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [currentProduct, setCurrentProduct] = useState(null);
  
  const [pendingAction, setPendingAction] = useState({ type: null, data: null });

  const [searchTerm, setSearchTerm] = useState('');

  // ?buscar=… en la dirección: así llega Tiqui del panel ("búscame la leche").
  // Se ajusta en el mismo render al cambiar la dirección, sin un efecto de más.
  const [params] = useSearchParams();
  const [dirLeida, setDirLeida] = useState(null);
  if (params.toString() !== dirLeida) {
    setDirLeida(params.toString());
    if (params.has('buscar')) setSearchTerm(params.get('buscar') || '');
  }
  const [stockFilter, setStockFilter] = useState('Todos');
  // Lo más reciente primero: lo que se acaba de agregar (o importar). Ver utils/listasPanel.js.
  const [orden, setOrden] = useState(ORDEN_INICIAL);
  // Además del stock (las tarjetas del resumen): activos, inactivos, sin foto…
  const [filtro, setFiltro] = useState('Todos');

  /*
   * "Stock bajo" es relativo al máximo de CADA producto, no un número fijo:
   * que queden 10 refrescos de un máximo de 1000 es crítico, pero 10 televisores
   * de un máximo de 12 es normal. Si el producto no tiene máximo, usamos 10.
   */
  const RATIO_BAJO = 0.25;
  const STOCK_BAJO_ABS = 10;
  const esBajo = (p) => {
    // Number() porque algunos productos guardaron estos campos como texto.
    const stock = Number(p.stock) || 0;
    const max = Number(p.maxQuantity) || 0;
    return stock > 0 && (max > 0 ? stock <= max * RATIO_BAJO : stock <= STOCK_BAJO_ABS);
  };

  // Resumen rápido del inventario: lo que el encargado necesita ver de un vistazo.
  const agotados = products.filter((p) => !p.stock).length;
  const bajos = products.filter(esBajo).length;
  const valorInventario = products.reduce((a, p) => a + (p.stock || 0) * (p.salePrice || 0), 0);

  const pasaFiltro = (p) => {
    if (filtro === 'Activos') return p.isActive !== false;
    if (filtro === 'Inactivos') return p.isActive === false;
    if (filtro === 'SinFoto') return !(Array.isArray(p.image) ? p.image[0] : p.image);
    if (filtro === 'PorLibra') return p.unidadVenta === 'libra';
    if (filtro === 'Adultos') return Boolean(p.soloAdultos);
    return true;
  };

  const filtrados = products
    .filter(pasaFiltro)
    .filter(product => {
      const searchString = searchTerm.toLowerCase();
      const matchesSearch = product.name?.toLowerCase().includes(searchString) ||
                            product.description?.toLowerCase().includes(searchString) ||
                            product.barCode?.toLowerCase().includes(searchString);

      if (stockFilter === 'Todos') return matchesSearch;
      if (stockFilter === 'StockBajo') return matchesSearch && esBajo(product);
      if (stockFilter === 'Agotados') return matchesSearch && (!product.stock || product.stock === 0);

      return matchesSearch;
    });
  const filteredProducts = ordenarLista(filtrados, orden, {
    extras: {
      stock: (a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0), // lo que urge, primero
      precio: (a, b) => (b.salePrice || 0) - (a.salePrice || 0),
    },
  });

  const handleAddProduct = () => {
    setCurrentProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setIsFormOpen(true);
  };

  const handleViewProduct = (product) => {
    setCurrentProduct(product);
    setIsViewOpen(true);
  };

  const handleSaveForm = (formData) => {
    setPendingAction({ type: 'save', data: formData });
    setIsConfirmOpen(true);
  };

  const handleDeleteForm = (productData) => {
    setPendingAction({ type: 'delete', data: productData });
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async (data) => {
    let success = false;
    if (pendingAction.type === 'save') {
      success = await saveProduct(data);
    } else if (pendingAction.type === 'delete') {
      success = await deleteProduct(data._id);
    }
    
    setIsConfirmOpen(false);
    
    if (success) {
      setIsFormOpen(false); 
      setPendingAction({ type: null, data: null });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#066494]">Inventario</h1>

        {/*
          Buscador, orden y "Añadir producto" sumaban más de 600px en una fila
          que no envolvía: en teléfono se salían de la pantalla. Ahora la barra
          baja completa debajo del título y el buscador toma el ancho que haya.
        */}
        <div className="flex flex-wrap gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[12rem] sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] transition-colors w-full sm:w-64 shadow-sm"
            />
          </div>
          {/*
            El botón de ordenar heredó la píldora del filtro de stock (que ya
            no está: filtrar ahora se hace clickeando las tarjetas del resumen,
            que además dicen cuántos son antes de que uno filtre).
          */}
          <FilterSelect
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: 'Activos', label: 'Activos' },
              { value: 'Inactivos', label: 'Inactivos' },
              { value: 'SinFoto', label: 'Sin foto' },
              { value: 'PorLibra', label: 'Por libra' },
              { value: 'Adultos', label: 'Solo +18' },
            ]}
          />
          <OrdenSelect
            value={orden}
            onChange={setOrden}
            extras={[
              { value: 'stock', label: 'Ordenar: Menos stock' },
              { value: 'precio', label: 'Ordenar: Mayor precio' },
            ]}
          />
          <button
            onClick={() => setImportando(true)}
            className="flex flex-none items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importar desde Excel
          </button>
          <button
            onClick={handleAddProduct}
            className="flex flex-none items-center gap-2 px-5 sm:px-6 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Añadir producto
          </button>
        </div>
      </div>

      <ConsejoImportar onImportar={() => setImportando(true)} />

      {/*
        Resumen del inventario: contexto antes de la lista, y de paso el filtro.
        Que "Agotados: 7" no se pueda tocar es una crueldad pequeña: el número
        que le preocupa al encargado ya está ahí, lo natural es clickearlo para
        ver cuáles son. Volver a clickear la tarjeta activa quita el filtro.
      */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Productos', valor: products.length, tono: 'text-gray-900', filtro: 'Todos' },
          { label: 'Stock bajo', valor: bajos, tono: bajos > 0 ? 'text-orange-500' : 'text-gray-900', filtro: 'StockBajo' },
          { label: 'Agotados', valor: agotados, tono: agotados > 0 ? 'text-red-500' : 'text-gray-900', filtro: 'Agotados' },
          { label: 'Valor en bodega', valor: `$${valorInventario.toFixed(2)}`, tono: 'text-gray-900' },
        ].map((s) => {
          const activa = s.filtro && stockFilter === s.filtro;
          const base = 'text-left p-4 rounded-2xl shadow-sm border transition-colors';

          // La de "Valor en bodega" no filtra nada: no tiene por qué invitar al click.
          if (!s.filtro) {
            return (
              <div key={s.label} className={`${base} bg-white border-gray-100`}>
                <div className="text-xs font-bold text-gray-500 mb-1">{s.label}</div>
                <div className={`text-2xl font-extrabold ${s.tono}`}>{s.valor}</div>
              </div>
            );
          }

          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setStockFilter(activa ? 'Todos' : s.filtro)}
              aria-pressed={activa}
              title={activa ? 'Quitar el filtro' : `Ver solo: ${s.label}`}
              className={`${base} press ${activa ? 'bg-[#F1F6F9] border-[#003049]' : 'bg-white border-gray-100'}`}
            >
              <div className="text-xs font-bold text-gray-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-extrabold ${s.tono}`}>{s.valor}</div>
            </button>
          );
        })}
      </div>

      <CategoryPills
        categories={categoryNames}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <div>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-6">
          <h2 className="text-2xl font-bold text-[#066494]">{selectedCategory}</h2>
          <span className="text-sm text-gray-500">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProducts.map((product, i) => (
            <ProductCard
              key={product._id}
              index={i}
              product={product}
              onView={handleViewProduct}
              onEdit={handleEditProduct}
              onDelete={handleDeleteForm}
            />
          ))}
          {filteredProducts.length === 0 && (
            /*
              col-span-full y no col-span-2: en teléfono la grilla tiene UNA
              columna, y pedir dos le inventaba una segunda que ensanchaba la
              página aunque estuviera vacía.
            */
            <div className="col-span-full text-center py-14">
              <p className="text-gray-800 font-semibold mb-1">No hay productos que coincidan</p>
              <p className="text-gray-500 text-sm">Prueba con otra búsqueda, categoría o filtro.</p>
            </div>
          )}
        </div>
      </div>

      <ProductFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        product={currentProduct}
        onSave={handleSaveForm}
        onDelete={handleDeleteForm}
        brands={brands}
        suppliers={suppliers}
        categories={categories}
        modules={modules}
      />

      <ConfirmActionModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        product={pendingAction.data}
        actionType={pendingAction.type}
        brands={brands}
        suppliers={suppliers}
        categories={categories}
      />
      <ImportarExcel
        isOpen={importando}
        onClose={() => setImportando(false)}
        onImportado={recargar}
      />

      <ProductViewModal 
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        product={currentProduct}
        modules={modules}
      />

    </div>
  );
};

export default Inventory;
