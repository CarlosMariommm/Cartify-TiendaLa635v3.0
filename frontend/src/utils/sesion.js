// LOS DOS CAJONES DE SESIÓN — sesion.js
// Dónde vive cada sesión y qué área manda en cada ruta.

export const CAJON = {
  personal: 'sesion:personal',
  cliente: 'sesion:cliente',
};

// La bandera del viejo "Estoy trabajando" de Mi Cuenta, que mezclaba en el mismo navegador la
// sesión de cliente y la de personal de una persona.
export const LLAVE_MODO_TRABAJO = 'sesion:trabajando';

// Las rutas del panel. Todo lo demás —la tienda, Mi Cuenta, los logins de cliente— es área de
// cliente.
export const RUTAS_DEL_PANEL = [
  '/admin',
  '/dashboard',
  '/inventario',
  '/pedidos',
  '/modulos',
  '/marcas',
  '/empleados',
  '/clientes',
  '/proveedores',
  '/categorias',
  '/fidelidad',
  '/promociones',
  '/pronostico',
  '/servicios-impresion',
  '/tarjetas',
  '/personalizacion',
  '/cuenta',
  '/ayuda',
];

export const areaDeRuta = (pathname = '') =>
  RUTAS_DEL_PANEL.some((r) => pathname === r || pathname.startsWith(`${r}/`))
    ? 'personal'
    : 'cliente';
