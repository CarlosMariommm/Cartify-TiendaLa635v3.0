import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { promotionService } from '../api/promotionService';
import { alCambiarTiqui, TIPOS_PROMOCIONES } from '../utils/cambiosDeTiqui';
import PromotionFormModal from '../components/Admin/PromotionFormModal';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import { etiquetaPromo, textoVencimiento, promoVencida } from '../utils/promos';
import PromoCard from '../components/Store/PromoCard';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { coincide, ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';

const TIPOS = [
  { value: 'descuento', label: 'Descuento %' },
  { value: 'precio_fijo', label: 'Precio fijo' },
  { value: 'nxm', label: 'NxM (2x1)' },
  { value: 'anuncio', label: 'Solo anunciar' },
];

// En qué está cada una, como lo dice su tarjeta.
const estadoDe = (promo) => (promoVencida(promo) ? 'Vencidas' : promo.isActive ? 'Activas' : 'Inactivas');

/*
 * Promociones (Admin) — banners/anuncios de la tienda. El gerente sube una
 * imagen, le pone descuento y elige los productos; en la tienda aparece como
 * banner y al hacer click lleva a esos productos.
 */
// Etiqueta corta del tipo de promo para la tarjeta.
// El ahorro real ("-25%", "$1.25", "2x1") sale del helper compartido, así el
// admin y la tienda muestran siempre lo mismo.

const Promociones = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  // Buscar, filtrar y ordenar (lo más reciente primero). Ver utils/listasPanel.js.
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [tipo, setTipo] = useState('Todos');
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  const visibles = ordenarLista(
    promos.filter((promo) =>
      (estado === 'Todos' || (estado === 'SinAnuncio' ? promo.showBanner === false : estadoDe(promo) === estado))
      && (tipo === 'Todos' || promo.type === tipo)
      && coincide(busqueda, promo.title, promo.promoDescription, promo.etiqueta, ...(promo.items || []).map((i) => i.productId?.name || i.categoryName))),
    orden,
    { nombre: (promo) => promo.title || promo.promoDescription },
  );

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await promotionService.getPromotions();
      setPromos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // Tiqui del panel encendió o apagó una promoción: se recarga.
    return alCambiarTiqui(TIPOS_PROMOCIONES, () => cargar());
  }, []);

  const handleSave = async (formData, id) => {
    try {
      if (id) { await promotionService.updatePromotion(id, formData); toast.success('Promoción actualizada'); }
      else { await promotionService.createPromotion(formData); toast.success('Promoción creada'); }
      setIsFormOpen(false);
      setCurrent(null);
      cargar();
    } catch (error) {
      console.error(error); // el interceptor de Axios ya muestra el toast de error
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await promotionService.deletePromotion(toDelete._id);
      toast.success('Promoción eliminada');
    } catch (error) {
      console.error(error);
    } finally {
      setIsConfirmOpen(false);
      setToDelete(null);
      cargar();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-4xl font-extrabold text-[#066494]">Promociones</h1>
        <button
          onClick={() => { setCurrent(null); setIsFormOpen(true); }}
          className="px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          Agregar Promoción
        </button>
      </div>

      {promos.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar promoción o producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] w-64 shadow-sm"
            />
          </div>
          <FilterSelect
            value={estado}
            onChange={setEstado}
            options={[
              { value: 'Activas', label: 'Activas' },
              { value: 'Inactivas', label: 'Inactivas' },
              { value: 'Vencidas', label: 'Vencidas' },
              { value: 'SinAnuncio', label: 'Sin anuncio' },
            ]}
          />
          <FilterSelect value={tipo} onChange={setTipo} defaultLabel="Todos los tipos" options={TIPOS} />
          <OrdenSelect value={orden} onChange={setOrden} />
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando promociones...</p>
      ) : promos.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
          <p className="text-gray-800 font-semibold mb-1">No hay promociones todavía</p>
          <p className="text-gray-500 text-sm">Crea la primera: elige los productos o una categoría completa, ponle precio y listo — el banner se dibuja solo.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-800 font-semibold mb-1">Ninguna promoción coincide</p>
          <p className="text-gray-500 text-sm">Pruebe con otra búsqueda o quite algún filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibles.map((promo, i) => (
            <div key={promo._id} style={{ '--i': i }} className="card-in bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/*
                La MISMA tarjeta que ve el cliente. Antes esto pintaba la
                imagen a secas y las promos dibujadas con CSS —que ya son la
                mayoría— salían como "Sin banner", aunque en la tienda se
                vieran perfectas.
              */}
              <div className="p-3 pb-0">
                <PromoCard
                  promo={promo}
                  imagen={promo.image}
                  imagenCompleta={promo.imagenCompleta}
                  title={promo.title}
                  descripcion={promo.promoDescription}
                  etiqueta={etiquetaPromo(promo)}
                  vencimiento={textoVencimiento(promo)}
                  icono={promo.icono}
                  mostrarFlecha={false}
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F1F6F9] text-[#003049]">{etiquetaPromo(promo)}</span>
                  <div className="flex items-center gap-2">
                    {/* Promo silenciosa: aplica pero no sale en el carrusel */}
                    {promo.showBanner === false && (
                      <span className="text-xs font-medium text-gray-400" title="No aparece en el carrusel de la tienda">Sin anuncio</span>
                    )}
                    {/* Vencida se dice aparte de inactiva: no es lo mismo que la apagaran */}
                    {promoVencida(promo) ? (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full" title={`Venció el ${new Date(promo.endsAt).toLocaleDateString('es')}`}>
                        Vencida
                      </span>
                    ) : (
                      <span className={`text-xs font-medium ${promo.isActive ? 'text-green-500' : 'text-red-500'}`}>
                        {promo.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    )}
                  </div>
                </div>
                {promo.title && <div className="text-sm font-bold text-gray-800">{promo.title}</div>}
                <p className="text-sm text-gray-600 mb-2">{promo.promoDescription}</p>
                <p className="text-xs text-gray-400 mb-3">
                  {promo.items?.length || 0} productos
                  {promo.endsAt && !promoVencida(promo) && ` · ${textoVencimiento(promo).toLowerCase()}`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCurrent(promo); setIsFormOpen(true); }}
                    className="flex-1 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { setToDelete(promo); setIsConfirmOpen(true); }}
                    className="flex-1 py-1.5 rounded-full border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromotionFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setCurrent(null); }}
        promoData={current}
        onSave={handleSave}
      />

      <GenericConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        data={toDelete}
        actionType="delete"
        entityName="Promoción"
      />
    </div>
  );
};

export default Promociones;
