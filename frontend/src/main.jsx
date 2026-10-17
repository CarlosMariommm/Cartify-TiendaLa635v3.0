import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
// Poppins sale de la propia tienda y no de Google Fonts: pedirla allá le mandaba a Google la
// dirección IP de cada visita antes de que la persona aceptara nada. Solo el alfabeto latino (trae
// tildes, ñ, ¿ y ¡) y los cinco pesos que usa el diseño. font-display: swap viene de fábrica.
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import './index.css'
import App from './App.jsx'

// Una pestaña abierta antes de publicar una versión nueva. Las pantallas se descargan por partes
// (ver App.jsx y pantallasDiferidas), y cada parte lleva en el nombre una huella de su contenido.
window.addEventListener('vite:preloadError', (evento) => {
  if (!navigator.onLine) return
  const clave = 'la635_recarga_por_version'
  try {
    const ultima = Number(sessionStorage.getItem(clave)) || 0
    // Ya se recargó hace poco y sigue fallando: ya no es la versión vieja,
    // es otra cosa, y recargar otra vez sería un bucle. Lo explica LimiteDeError.
    if (Date.now() - ultima < 10 * 60 * 1000) return
    sessionStorage.setItem(clave, String(Date.now()))
  } catch {
    return
  }
  evento.preventDefault()
  window.location.reload()
})

// MotionConfig con reducedMotion="user": TODAS las animaciones de framer respetan automáticamente
// el "menos movimiento" del sistema operativo. (El CSS equivalente vive en index.css.)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)

