import api from './api';

// MATERIALES DE IMPRESIÓN — printMaterialService.js El papel y la tinta con los que se imprime.
// JSON.
export const printMaterialService = {
  getMaterials: async () => (await api.get('/printMaterial')).data,
  createMaterial: async (data) => (await api.post('/printMaterial', data)).data,
  updateMaterial: async (id, data) => (await api.put(`/printMaterial/${id}`, data)).data,
  ajustarExistencia: async (id, existencia) =>
    (await api.patch(`/printMaterial/${id}/existencia`, { existencia })).data,
  deleteMaterial: async (id) => (await api.delete(`/printMaterial/${id}`)).data,
};
