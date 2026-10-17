import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// HOOK PERSONALIZADO — useAuth.js
// Un "hook" en React es una función reutilizable que encapsula lógica de estado.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }

  // ¿Esta sesión es de un CLIENTE, o de alguien del personal? La pregunta parece de más —quien
  // entró, entró— pero no lo es: las pantallas del cliente (direcciones, favoritos, puntos, métodos
  // de pago) piden datos a /client/:id, y ese endpoint solo conoce clientes.
  const esCliente = context.user?.type === 'client' && !!context.user?.id;

  return { ...context, esCliente };
};
