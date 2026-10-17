// SERVICIOS DE API — authApi.js
// Este archivo contiene las funciones que se comunican con las rutas de autenticación del backend.

// A DÓNDE SE LE HABLA AL SERVIDOR: la misma dirección que api.js (VITE_API_URL).
// 1- Paso 1 del login de empleados (2FA): envía correo o usuario para recibir el código.
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const loginStep1 = async (data) => {
  const response = await fetch(`${API}/authFlow/login-step-1`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Error en login');
  }
  return response.json();
};

// 2- Paso 2 del login de empleados (2FA): valida el código OTP y devuelve el token final
export const loginStep2 = async (data) => {
  const response = await fetch(`${API}/authFlow/login-step-2`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Error al verificar');
  }
  return response.json();
};

// 3- Login de administradores, PASO 1: valida correo y contraseña. Si están
// bien, el backend manda un código al correo y responde { needs2FA: true }; la
// sesión todavía NO se abre.
export const loginAdminDB = async (data) => {
  const response = await fetch(`${API}/loginAdmin/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Error en inicio de sesión de admin');
  }
  return response.json();
};

// 3b- Login de administradores, PASO 2: verifica el código del correo. Si
// coincide, el backend abre la sesión y devuelve el token y los datos del admin.
export const verify2FAAdmin = async (data) => {
  const response = await fetch(`${API}/loginAdmin/verify-2fa`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'No se pudo verificar el código');
  }
  return response.json();
};

// 3c- El panel dentro de la app del teléfono: canjea el pase de un solo uso que
// trae la dirección y el backend abre la sesión del administrador, sin pedir
// otra vez contraseña ni código (ver backend/src/utils/pasesPanel.js).
export const canjearPaseApp = async (pase) => {
  const response = await fetch(`${API}/loginAdmin/pase-app/canjear`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pase }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo abrir el panel');
  }
  return response.json();
};

// 4- Login de clientes: valida correo y contraseña. Requiere cuenta verificada y activa.
export const loginClientDB = async (data) => {
  const response = await fetch(`${API}/loginClient/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    const error = new Error(err.message || 'Error en inicio de sesión de cliente');
    // La cuenta es del personal: la pantalla lo lleva a su login (/admin).
    error.esPersonal = !!err.esPersonal;
    throw error;
  }
  return response.json();
};

// 5- Login de clientes con Google: el backend verifica el token y crea o enlaza la cuenta.
// `extra` (consentimiento y teléfono) solo lo manda la pantalla de Registro.
export const googleLoginDB = async (credential, extra = {}) => {
  const response = await fetch(`${API}/loginClient/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, ...extra }),
  });
  if (!response.ok) {
    const err = await response.json();
    const error = new Error(err.message || 'No se pudo iniciar sesión con Google');
    // El detalle viaja PEGADO al error y no se pierde: cuando el servidor responde "esta cuenta es
    // nueva y falta el consentimiento", la pantalla de login necesita saberlo para llevar a
    // registrarse en vez de dejar un aviso rojo que no dice qué hacer.
    error.requiereConsentimiento = !!err.requiereConsentimiento;
    error.sugerido = err.sugerido || null;
    throw error;
  }
  return response.json();
};