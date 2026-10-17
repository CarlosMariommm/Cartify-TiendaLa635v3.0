// PUNTOS DE FIDELIDAD — fidelidadApi.js
// Los dos endpoints que la web junta en `useLoyalty`: GET /loyalty/:clienteId/summary saldo
// disponible y vencimientos GET /loyaltyConfig la tasa y los meses de vencimiento

import { peticion } from './api';

export const getResumenPuntos = (clienteId) => peticion(`/loyalty/${clienteId}/summary`);

export const getConfigFidelidad = () => peticion('/loyaltyConfig');
