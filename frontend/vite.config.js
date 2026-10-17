import { defineConfig } from 'vite' // defineConfig ayuda a tener autocompletado y validación de configuración.
import react from '@vitejs/plugin-react' // Plugin oficial para React, soporta JSX y Fast Refresh.
import tailwindcss from '@tailwindcss/vite' // Plugin de Tailwind CSS para integrar estilos de utilidad.
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/ - documentación oficial de configuración.
export default defineConfig({
  // "@/..." apunta a src/. Lo piden los componentes de mapcn (el mapa), que vienen del ecosistema
  // shadcn e importan así (import { cn } from "@/lib/utils"). El mismo alias está en jsconfig.json
  // para que el editor lo entienda.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // MapLibre se carga tarde (solo al abrir un mapa). Sin declararlo aquí, en desarrollo Vite lo
  // descubría recién en ese momento, re-optimizaba y la primera carga del mapa fallaba con "Outdated
  // Optimize Dep".
  optimizeDeps: { include: ['maplibre-gl'] },
  // Escucha en TODA la red local, no solo en localhost. Los correos llevan enlaces a la tienda, y
  // esos correos se abren en el teléfono. Con Vite atado a localhost, "localhost:5173" en el
  // teléfono apunta al propio teléfono y el enlace no lleva a ningún lado.
  server: { host: true },
  plugins: [
    react(), // Activa el soporte React en Vite.
    tailwindcss() // Activa el procesamiento de Tailwind CSS.
  ],
  // Pruebas (npm test). Corren en Node; las que pintan una pantalla piden un navegador de mentira
  // (jsdom) con un comentario arriba del archivo. Ver los *.test.js junto a lo que prueban.
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}', '*.test.js'],
  },
})