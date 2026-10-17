// LOS TUTORIALES DEL PANEL — tutorialesPanel.js
// La primera vez que el administrador entra a un apartado, le sale un tutorial corto
// (components/Admin/TutorialApartado.jsx).

const llaveDe = (quien) => `cartify:tutoriales:${quien || 'admin'}`;

const leerEstado = (quien) => {
  try {
    const crudo = JSON.parse(localStorage.getItem(llaveDe(quien)) || '{}');
    return { vistos: Array.isArray(crudo.vistos) ? crudo.vistos : [], apagados: Boolean(crudo.apagados) };
  } catch {
    return { vistos: [], apagados: false };
  }
};

const guardarEstado = (quien, estado) => {
  try {
    localStorage.setItem(llaveDe(quien), JSON.stringify(estado));
  } catch {
    // Sin almacenamiento el tutorial puede volver a salir; nada más.
  }
};

// ¿Hay que mostrarle el tutorial de este apartado?
export const tocaTutorial = (quien, temaId) => {
  const { vistos, apagados } = leerEstado(quien);
  return !apagados && !vistos.includes(temaId);
};

export const marcarVisto = (quien, temaId) => {
  const estado = leerEstado(quien);
  if (!estado.vistos.includes(temaId)) guardarEstado(quien, { ...estado, vistos: [...estado.vistos, temaId] });
};

// "No mostrar más tutoriales": ninguno vuelve a salir solo (la ayuda sigue en el "?").
export const apagarTutoriales = (quien) => guardarEstado(quien, { ...leerEstado(quien), apagados: true });

// Las diapositivas del tutorial: primero para qué sirve el apartado, después cada paso, y al final
// un consejo (el primero de su tema, si tiene).
export const diapositivasDe = (tema) => {
  if (!tema) return [];
  const pasos = tema.pasos || [];
  return [
    { tipo: 'resumen', etiqueta: 'Para qué sirve', texto: tema.resumen },
    ...pasos.map((texto, i) => ({ tipo: 'paso', etiqueta: `Paso ${i + 1} de ${pasos.length}`, texto })),
    ...(tema.consejos?.[0] ? [{ tipo: 'consejo', etiqueta: 'Un consejo', texto: tema.consejos[0] }] : []),
  ];
};
