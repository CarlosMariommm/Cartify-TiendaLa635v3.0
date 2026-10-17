// MÓDULOS / PASILLOS — moduleApi.js
// El equivalente móvil de `moduleService.js`: una sola lectura, la lista de pasillos que armó la
// tienda desde el panel.

import { peticion } from './api';

export const getModulos = () => peticion('/module');

export default getModulos;
