// PRIMER INGRESO — primerIngreso.js
// Una marca de un solo uso que dice "esta persona acaba de crear su cuenta". Sirve para una cosa
// concreta: que el mapa de bienvenida salga la primera vez y nunca más.

const LLAVE = 'kartify:recien-registrado';

// localStorage puede tirar excepción —modo incógnito de Safari, almacenamiento lleno, permisos—.
// Que el saludo del mapa no salga jamás justifica un aviso; que reviente el registro entero, de
// ninguna manera.
export const marcarRecienRegistrado = () => {
  try {
    localStorage.setItem(LLAVE, '1');
  } catch {
    // Sin marca la persona entra directo a la tienda. Se pierde el saludo, no la cuenta.
  }
};

// Lee Y BORRA. Es de un solo uso a propósito: si solo leyera, alguien que cierra sesión y vuelve a
// entrar en el mismo navegador vería el mapa otra vez, que es exactamente la molestia que esto
// viene a quitar.
export const consumirRecienRegistrado = () => {
  try {
    const marcado = localStorage.getItem(LLAVE) === '1';
    if (marcado) localStorage.removeItem(LLAVE);
    return marcado;
  } catch {
    return false;
  }
};
