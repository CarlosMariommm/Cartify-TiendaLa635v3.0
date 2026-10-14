import { useState, useEffect } from 'react';
import { alCambiarTiqui, TIPOS_INVENTARIO } from '../utils/cambiosDeTiqui';
import toast from 'react-hot-toast';
import { productService } from '../api/productService';
import { productTypeService } from '../api/productTypeService';
import { brandService } from '../api/brandService';
import { supplierService } from '../api/supplierService';
import { moduleService } from '../api/moduleService';

export const useInventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // from productTypes
  const [categoryNames, setCategoryNames] = useState([]); // for pills
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [modules, setModules] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isLoading, setIsLoading] = useState(false);

  // 1- Obtener datos (SELECT)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        productsRes,
        typesRes,
        brandsRes,
        suppliersRes,
        modulesRes
      ] = await Promise.all([
        productService.getInventario(),
        productTypeService.getProductTypes(),
        brandService.getBrands(),
        supplierService.getSuppliers(),
        moduleService.getModules()
      ]);

      setProducts(productsRes);
      
      setCategories(typesRes);
      const typeNames = typesRes.map(t => t.type);
      setCategoryNames(['Todos', ...typeNames]);
      
      setBrands(brandsRes);
      setSuppliers(suppliersRes);
      setModules(modulesRes);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Tiqui del panel cambió existencias, un precio o un producto: se recarga.
    return alCambiarTiqui(TIPOS_INVENTARIO, () => fetchData());
  }, []);

  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(
        (product) => product.typeId?.type?.toLowerCase() === selectedCategory.toLowerCase()
      );

  // 2- Guardar o Actualizar un Producto (INSERT / UPDATE)
  const saveProduct = async (productData) => {
    setIsLoading(true);
    try {
      if (productData.id) {
        await productService.updateProduct(productData.id, productData.formData);
        toast.success(`Has actualizado el producto`);
      } else {
        await productService.createProduct(productData.formData);
        toast.success(`Has creado el producto`);
      }
      await fetchData(); // Recargar después de guardar
      return true;
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al guardar el producto';
      toast.error(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 3- Eliminar un Producto (DELETE)
  const deleteProduct = async (productId) => {
    setIsLoading(true);
    try {
      await productService.deleteProduct(productId);
      toast.success(`Has eliminado el producto`);
      await fetchData();
      return true;
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al eliminar el producto';
      toast.error(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    products: filteredProducts,
    categories,
    categoryNames,
    brands,
    suppliers,
    modules,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    saveProduct,
    deleteProduct,
    // Para volver a leer todo después de importar desde Excel.
    recargar: fetchData
  };
};
