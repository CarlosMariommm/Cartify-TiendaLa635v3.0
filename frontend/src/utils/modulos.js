import {
  Store, Croissant, Utensils, BookOpen, Printer, Pill,
  Beef, Carrot, Shirt, Wrench, Cake, Coffee,
} from 'lucide-react';

// MÓDULOS — modulos.js
// Un módulo es un PASILLO de la misma tienda, no otra tienda.

// Iconos elegibles al crear el módulo, para la pantalla de servicios.
export const ICONOS_MODULO = [
  { id: 'tienda', nombre: 'Tienda', Icono: Store },
  { id: 'panaderia', nombre: 'Panadería', Icono: Croissant },
  { id: 'pupuseria', nombre: 'Comida', Icono: Utensils },
  { id: 'libreria', nombre: 'Librería', Icono: BookOpen },
  { id: 'impresiones', nombre: 'Impresiones', Icono: Printer },
  { id: 'farmacia', nombre: 'Farmacia', Icono: Pill },
  { id: 'carniceria', nombre: 'Carnicería', Icono: Beef },
  { id: 'verduleria', nombre: 'Verdulería', Icono: Carrot },
  { id: 'ropa', nombre: 'Ropa', Icono: Shirt },
  { id: 'ferreteria', nombre: 'Ferretería', Icono: Wrench },
  { id: 'pasteleria', nombre: 'Pastelería', Icono: Cake },
  { id: 'cafeteria', nombre: 'Cafetería', Icono: Coffee },
];

export const iconoDeModulo = (modulo) =>
  ICONOS_MODULO.find((i) => i.id === modulo?.icono)?.Icono || Store;

// Qué flujo usa el módulo. El respaldo por nombre existe solo por los módulos que ya están
// cargados en la base sin el campo: sin esto, Impresiones se volvería un pasillo normal y la gente
// compraría "una impresión" sin decir qué imprimir.
export const flujoDeModulo = (modulo) => {
  if (modulo?.flujo) return modulo.flujo;
  return /impres/i.test(modulo?.name || '') ? 'impresiones' : 'estandar';
};

export const esModuloDeTienda = (modulo) => flujoDeModulo(modulo) === 'estandar';

// Activos y en el orden que puso la tienda; a igual orden, alfabético.
export const modulosVisibles = (lista) =>
  (Array.isArray(lista) ? lista : [])
    .filter((m) => String(m.isActive) !== 'false')
    .sort((a, b) => (a.orden || 0) - (b.orden || 0) || (a.name || '').localeCompare(b.name || ''));
