import { useEffect, useSyncExternalStore } from 'react';

// UN AVISO A LA VEZ — turnoPanel.js
// El panel tiene más de una ventanita que sale sola al entrar: el tutorial de cada apartado
// (TutorialApartado) y la invitación a enlazar los proveedores (InvitacionProveedores).

let turno = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((fn) => fn());

const suscribir = (fn) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};

const tomar = (id) => {
  if (turno !== null) return;
  turno = id;
  avisar();
};

const soltar = (id) => {
  if (turno !== id) return;
  turno = null;
  avisar();
};

// `quiere`: si este aviso quiere salir ahora. Devuelve si le toca: solo entonces se dibuja. Al
// dejar de querer (se cerró) o al desmontarse, suelta el turno para el siguiente.
export const useTurno = (id, quiere) => {
  const actual = useSyncExternalStore(suscribir, () => turno, () => null);
  useEffect(() => {
    if (quiere) tomar(id);
    else soltar(id);
  }, [id, quiere, actual]);
  useEffect(() => () => soltar(id), [id]);
  return Boolean(quiere) && actual === id;
};
