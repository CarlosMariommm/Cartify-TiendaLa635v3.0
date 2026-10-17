// AJUSTES DE LA TIENDA — ajustesApi.js
// Un solo documento en el backend con el nombre de la tienda, su logo, el orden de la portada y el
// tema de temporada. El equivalente de `storeSettingsService.getAjustes` en la web. Solo se lee.

import { peticion } from './api';

export const getAjustes = () => peticion('/storeSettings');

export default getAjustes;
