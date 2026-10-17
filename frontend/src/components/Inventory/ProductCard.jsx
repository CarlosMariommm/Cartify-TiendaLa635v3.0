import { motion } from 'framer-motion';
import TableActions from '../UI/TableActions';
import { formatearFecha } from '../../utils/fechas';
import { unidadDe, esPorLibra, cantidadConUnidad, piezasEnTexto, esSoloAdultos } from '../../utils/unidades';

const ProductCard = ({ product, onEdit, onDelete, onView, index = 0 }) => {
  // Calcular porcentaje para la barra de cantidades (asumimos maximo de 100 si no existe)
  const maxStock = product.maxQuantity || 100;
  const currentStock = product.stock || 0;
  const quantityPercentage = Math.min(100, Math.max(0, (currentStock / maxStock) * 100));

  const imageUrl = Array.isArray(product.image) ? product.image[0] : product.image;

  // Hay productos que no vencen (o a los que nadie les puso fecha). Si no hay fecha se dice, no se
  // inventa una.
  const vence = formatearFecha(product.expirationDate);

  // Por unidad o por libra: cambia cómo se lee el precio y la existencia.
  const unidad = unidadDe(product);
  const porLibra = esPorLibra(product);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 8) * 0.045 }}
      className="flex bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover-lift"
    >
      <div className="w-1/3 bg-[#00283D] text-white p-4 flex flex-col items-center justify-between relative rounded-l-xl">
        <div className="w-full text-left">
          <p className="text-[10px] uppercase tracking-wider opacity-80">{product.brandId?.name}</p>
          <h3 className="text-xl font-bold leading-tight">{product.name}</h3>
          {/* +18 junto al nombre: quien revisa el inventario tiene que verlo
              sin abrir la ficha. */}
          {esSoloAdultos(product) && (
            <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25">
              +18
            </span>
          )}
        </div>
        
        <div className="flex-1 flex items-center justify-center py-4 w-full">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={product.name} 
              className="max-h-32 max-w-full object-contain filter drop-shadow-lg"
            />
          )}
        </div>
        
        {/* El "/lb" no es adorno: sin él, "$1.25" en un tomate se lee como el
            precio del tomate y no el de la libra. */}
        <div className="text-xs text-center border-t border-white/20 pt-2 w-full">
          Costo: ${product.priceCost?.toFixed(2)} | Precio: ${product.salePrice?.toFixed(2)}{porLibra && '/lb'}
        </div>
      </div>

      <div className="w-2/3 p-4 flex flex-col relative">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-xs text-gray-500">Proveedor: {product.supplierId?.name}</p>
            <h4 className="text-lg font-bold text-gray-900">{product.typeId?.type}</h4>
          </div>
          
          <div className="text-right">
            <p className="text-xs font-medium text-gray-700 mb-1">{unidad.existencia}</p>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#009AEB]" 
                style={{ width: `${quantityPercentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {cantidadConUnidad(product, currentStock)} de {maxStock}
            </p>
            {/* Las piezas van debajo y más chicas: son un apunte de bodega,
                no el número por el que se cobra. */}
            {piezasEnTexto(product) && (
              <p className="text-[10px] text-gray-400">en {piezasEnTexto(product)}</p>
            )}
          </div>
        </div>

        {/* Aquí el pre-line convive con line-clamp: se respetan los enter, y
            si la descripción es larga se corta a los tres renglones igual. */}
        <p className="text-xs text-gray-600 line-clamp-3 mb-4 leading-relaxed whitespace-pre-line">
          {product.description}
        </p>

        <div className="mt-auto flex justify-between items-end">
          {vence ? (
            <p className="text-xs font-medium text-gray-800">Fecha de exp: {vence}</p>
          ) : (
            <p className="text-xs text-gray-400">Sin fecha de vencimiento</p>
          )}
          <TableActions 
            onView={onView ? () => onView(product) : undefined}
            onEdit={() => onEdit(product)}
            onDelete={() => onDelete && onDelete(product)}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
