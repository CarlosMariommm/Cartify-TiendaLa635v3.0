import toast from 'react-hot-toast';
import { ICONOS } from './iconosAviso';

// AVISOS DEL CARRITO — avisoCarrito.jsx
// Agregar y quitar del carrito.

const ID = 'carrito';
const DURACION = 2200;

export const avisarAgregado = (texto) => toast.success(texto, { id: ID, duration: DURACION });

export const avisarQuitado = (texto) => toast(texto, { id: ID, duration: DURACION, icon: ICONOS.quitar });

export default avisarAgregado;
