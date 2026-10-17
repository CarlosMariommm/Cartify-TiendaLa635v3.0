import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package,
  Shapes, Tag, Blocks, Printer,
  Megaphone, Award, Gift,
  UserSquare2, Users, Truck,
  Library, Store, Contact, Palette,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from './useAuth';

// NAVEGACIÓN DEL PANEL — useSidebarNav.js
// El menú tenía trece entradas planas, todas del mismo tamaño y del mismo peso visual.

// Lo que el encargado abre todos los días: ventas y existencias.
export const ACCESOS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Pedidos', path: '/pedidos', icon: ShoppingBag },
  { name: 'Inventario', path: '/inventario', icon: Package },
];

// Lo demás, agrupado por la pregunta que responde: Catálogo → "¿cómo está organizado lo que
// vendo?" Ventas → "¿cómo hago que compren más?" Personas → "¿con quién trato?"
export const GRUPOS = [
  {
    id: 'catalogo',
    name: 'Catálogo',
    icon: Library,
    items: [
      { name: 'Categorías', path: '/categorias', icon: Shapes },
      { name: 'Marcas', path: '/marcas', icon: Tag },
      { name: 'Módulos', path: '/modulos', icon: Blocks },
      { name: 'Impresiones', path: '/servicios-impresion', icon: Printer },
    ],
  },
  {
    id: 'ventas',
    name: 'Ventas',
    icon: Store,
    items: [
      // Lo que se va a vender y qué pedir: el primer paso para vender mejor.
      { name: 'Pronóstico', path: '/pronostico', icon: TrendingUp },
      { name: 'Promociones', path: '/promociones', icon: Megaphone },
      { name: 'Fidelidad', path: '/fidelidad', icon: Award },
      { name: 'Tarjetas de regalo', path: '/tarjetas', icon: Gift },
      // Cómo se ve la tienda: nombre, logo y orden de la portada. Vive en
      // Ventas porque acomodar la portada es, en el fondo, decidir qué se le
      // enseña primero a quien entra.
      { name: 'Personalización', path: '/personalizacion', icon: Palette },
    ],
  },
  {
    id: 'personas',
    name: 'Personas',
    icon: Contact,
    items: [
      { name: 'Clientes', path: '/clientes', icon: UserSquare2 },
      { name: 'Empleados', path: '/empleados', icon: Users },
      { name: 'Proveedores', path: '/proveedores', icon: Truck },
    ],
  },
];

export const useSidebarNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // Un empleado ve el menú recortado: nada de precios, proveedores, promociones, empleados, clientes
  // ni ajustes de la tienda — esas pantallas ni están en su sidebar (el backend las rechaza igual si
  // las teclea a mano, ver ProtectedRoute soloAdmin).
  const esEmpleado = user?.type === 'employee';
  const accesos = esEmpleado ? ACCESOS.filter((a) => a.path !== '/inventario') : ACCESOS;
  const grupos = esEmpleado ? [] : GRUPOS;

  // Lo que el usuario abrió o cerró a mano; vale más que el automático.
  const [forzados, setForzados] = useState({});

  // Al cambiar de pantalla se olvidan los forzados. Si no, un grupo que se cerró a mano seguiría
  // cerrado al entrar a una de sus pantallas, y el menú mentiría sobre dónde está uno parado.
  const [rutaVista, setRutaVista] = useState(pathname);
  if (rutaVista !== pathname) {
    setRutaVista(pathname);
    setForzados({});
  }

  const esActivo = (path) => pathname.includes(path);
  const tieneActivo = (grupo) => grupo.items.some((i) => esActivo(i.path));

  const estaAbierto = (grupo) => forzados[grupo.id] ?? tieneActivo(grupo);
  const alternar = (grupo) => setForzados((prev) => ({ ...prev, [grupo.id]: !estaAbierto(grupo) }));

  return { accesos, grupos, esActivo, tieneActivo, estaAbierto, alternar };
};
