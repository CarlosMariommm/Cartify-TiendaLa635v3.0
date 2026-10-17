import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // Las reglas de react-hooks 7 pensadas para el React Compiler quedan apagadas: la tienda no usa
    // ese compilador.
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      // Solo afecta la recarga en caliente al programar, no a la tienda.
      'react-refresh/only-export-components': 'warn',
      // { quitado, ...resto } para sacar campos antes de guardar es a propósito.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // Cada archivo de contexto exporta su proveedor y el gancho para leerlo, juntos a propósito. Lo
    // único que cambia es que, al programar, editar uno recarga la página entera en vez de solo el
    // componente.
    files: ['src/context/**/*.{js,jsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // El mapa (components/mapcn) es el componente de mapcn copiado tal cual. Se deja igual al original
    // para poder actualizarlo: sus avisos son de esa librería, no de la tienda.
    files: ['src/components/mapcn/**/*.{js,jsx}'],
    rules: {
      'react-hooks/refs': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Lo que corre en Node y no en el navegador: la vista previa de Vercel, la
    // configuración y los scripts. Las pruebas, con lo que traen las de Vitest.
    files: ['middleware.js', 'vite.config.js', 'scripts/**/*.{js,mjs}', '**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
