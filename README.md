# 🛒 Cartify - Tienda La 635

**Cartify** es la plataforma de "Tienda La 635", una tienda de barrio en El Salvador: tienda en línea, panel de administración, app Android y un servicio de pronóstico de ventas. La mascota y asistente de la tienda es **Tiqui**.

El sistema maneja dos grandes áreas (Módulos): **Tienda** (productos físicos) e **Impresiones** (servicios de impresión). Cada una tiene sus propias reglas de negocio.

---

## Qué hay en el repositorio

| Carpeta | Qué es | Dónde corre |
| --- | --- | --- |
| `backend/` | API REST con Node.js, Express y MongoDB | Render |
| `frontend/` | Tienda web y panel de administración (React + Vite) | Vercel |
| `movil/` | App Android (Expo SDK 54): la tienda y el modo personal para el reparto | EAS / Google Play |
| `analitica/` | Servicio de pronóstico en Python (FastAPI + statsmodels), en Docker | Render (Docker) |

La web en Vercel manda todo lo que empieza con `/api` al backend en Render (ver `frontend/vercel.json`). El backend le pide el pronóstico al servicio de `analitica/`.

---

## Características principales

### Tienda en línea (web y app)
- **Catálogo** por secciones, con búsqueda, filtros y promociones (descuento y NxM) en un carrusel que avanza solo.
- **Carrito y pago** con entrega a domicilio o retiro en la tienda. El envío se cobra con una base más un monto por kilómetro desde la ubicación de la tienda. Métodos de pago: efectivo, tarjeta (Wompi) y saldo.
- **Tarjetas de regalo** con código `635-XXXX-XXXX`; los guiones se ponen solos al escribirlo.
- **Puntos de fidelidad** que se ganan con cada compra y se canjean después.
- **Seguimiento del pedido con mapa** (MapLibre + mapas de CARTO):
  - Con el GPS del repartidor: su punto en vivo, la ruta por las calles (OpenRouteService) y cuánto falta.
  - Sin ese GPS: la ruta aproximada desde la tienda y los minutos desde que salió.
  - El cliente recibe un código de entrega para dictárselo al repartidor.
- **"Quien compra esto también lleva"**: recomendaciones a partir de los productos que se compran juntos.
- **Mi cuenta**: pedidos, favoritos, direcciones, métodos de pago, puntos, recibos, avisos por canal (app o correo) y preferencias (modo oscuro e idioma español/inglés).
- **Tiqui, asistente por voz**:
  - Agrega productos, recomienda, cuenta las ofertas y abre secciones.
  - Usa Gemini, con Gemma de respaldo cuando Gemini se satura, y habla con la voz de ElevenLabs.
- **Kiosco**: una pantalla en la tienda que se vincula con el teléfono del cliente por un código QR.
- **Juego del stand** (`/juego`): preguntas sobre el proyecto, con ruleta de premios.
- Inicio de sesión con Google, verificación por correo y recuperación de contraseña.
- La tienda cambia de colores según la temporada, y Tiqui se disfraza.

### Panel de administración
- **Dashboard** con gráficas (Recharts) y reportes PDF (`jsPDF` y `jspdf-autotable`).
- **Inventario**:
  - Productos con imágenes en Cloudinary y código de barras automático.
  - Importar desde Excel: la IA acomoda las columnas y completa datos; las fotos salen de Open Food Facts.
  - Control de stock y de `maxQuantity` (tope inicial).
- **Pedidos**: estados (pagado, preparando, en camino, listo, entregado) y comprobante PDF.
- **Catálogos** de módulos, categorías, marcas, empleados y clientes, cada uno con activación/inactivación (`isActive`). Las listas se pueden buscar y filtrar.
- **Proveedores**:
  - Marcas que surte cada uno, compras, crédito y movimientos.
  - Botón "Pedir" (WhatsApp o llamada) desde la compra sugerida.
- **Pronóstico de demanda** (servicio `analitica/`): ventas de las próximas semanas con su rango, compra sugerida y reporte PDF. Mientras la tienda no junte 4 semanas de ventas, muestra una demostración.
- **Promociones, fidelidad, tarjetas de regalo y servicios de impresión.**
- **Personalización**:
  - Nombre, lema, dirección y horario.
  - Ubicación de la tienda y costos de envío.
  - Apariencia de la tienda.
- **Tiqui del panel**: asistente para el administrador, separada de la Tiqui de la tienda. Consulta datos, y solo los cambia con una confirmación.
- **Mini tutorial** la primera vez que el administrador entra a cada apartado.

### App móvil (Android)
- La misma tienda que la web, con notificaciones push del estado del pedido y de las ofertas.
- **Modo personal** para el administrador y los empleados:
  - **Reparto**: los pedidos a domicilio. "Salí a repartir" marca el pedido en camino y comparte el GPS con el cliente.
  - **Panel web dentro de la app**, solo para el administrador.
  - El personal recibe un aviso con cada pedido nuevo.
- Se actualiza por internet con `expo-updates`, sin reinstalar la APK.

### Autenticación y seguridad
- Sesión con JWT en cookies `httpOnly` y roles: **Administrador**, **Empleado** y **Cliente**.
- **Verificación en dos pasos (2FA)** por correo para el personal.
- Límite de peticiones (`express-rate-limit`) en todo el API, con topes propios para los asistentes.
- Validaciones en el backend: duplicados, correos y permisos (cada cliente solo ve sus pedidos).

---

## Tecnologías utilizadas

### Frontend (`frontend/`)
- **React 19 + Vite**, **Tailwind CSS 4** y **React Router DOM**.
- **Framer Motion** para animaciones y transiciones.
- **React Hook Form** para los formularios y **Axios** para hablar con el backend.
- **MapLibre GL** (con componentes de mapcn) y mapas de **CARTO**: sin llave de Google Maps.
- **Recharts**, **jsPDF + AutoTable**, **read-excel-file** y **qrcode**.
- **Lucide React** (iconos), **React Hot Toast** (avisos), **@react-oauth/google** y **Vercel Analytics**.
- **Vitest + Testing Library** y **ESLint**.

### Backend (`backend/`)
- **Node.js 22 + Express 5**, **MongoDB + Mongoose**.
- **jsonwebtoken**, **bcryptjs**, **cookie-parser** y **express-rate-limit**.
- **Cloudinary + Multer** para las imágenes.
- **Mailjet** para los correos: usa su API por HTTPS porque Render bloquea SMTP en el plan gratis.
- **@google/genai** (Gemini y Gemma), **ElevenLabs** (voz de Tiqui) y **OpenRouteService** (rutas por calle).
- **Swagger** con la documentación del API en `/api-docs`.
- **Vitest** para las pruebas y **Nodemon** en desarrollo.

### App móvil (`movil/`)
- **Expo SDK 54 + React Native** con **React Navigation**.
- `expo-location`, `expo-notifications`, `expo-updates`, `expo-speech-recognition` y `expo-audio`.
- Mapas en un **WebView con MapLibre**, los mismos de la web.
- Inicio de sesión con Google y **Vitest** para las pruebas.

### Servicio de análisis (`analitica/`)
- **Python 3.12**, **FastAPI** y **Uvicorn**, empaquetado con **Docker**.
- **Pronóstico de la tienda**: Holt-Winters (statsmodels), con pandas, numpy y scipy.
- **Pronóstico por producto**: TSB, hecho para ventas intermitentes.
- **pytest** para las pruebas.
- `analitica/intenciones/` tiene un clasificador propio de Tiqui (scikit-learn). Viene **apagado**: Tiqui usa Gemini, y se enciende con `TIQUI_IA_PROPIA=1`.

---

## Arquitectura de la base de datos

El proyecto usa referencias (`ObjectId`) entre colecciones de MongoDB para hacer consultas relacionadas:

1. **Modules**: las dos áreas principales (`Tienda`, `Impresiones`).
2. **ProductTypes (Categorías)**: tienen la referencia a `moduleId` y a los `supplierIds` que las surten.
3. **Brands (Marcas)** y **Suppliers (Proveedores)**: cada proveedor guarda los `brandIds` que distribuye.
4. **Products**: `stock`, `maxQuantity`, `barCode`, `priceCost`, `salePrice`, `expirationDate`, imágenes y sus referencias.
5. **Clients**, **Admins** y **Employees**: las cuentas de cada rol.
6. **Orders**: productos, entrega (dirección y coordenadas), pago, estado y quién lo cambió, código de entrega y el último punto del repartidor. No se guarda el historial de su recorrido.
7. **Promotions**, **Reviews**, **GiftCards**, **LoyaltyConfig** y **LoyaltyLedger** (movimientos de puntos).
8. **Shoppings** (compras a proveedores) y **SupplierMovements** (facturas y pagos del crédito).
9. **PrintServices** y **PrintMaterials** (módulo de Impresiones) y **KioskSessions** (kiosco).
10. **StoreSettings**: la personalización de la tienda. **Ojo:** el documento que vale es el que tiene `clave: "tienda"`, así que siempre hay que filtrar por esa clave.

---

## Convenciones

### Nombres
- **Frontend (React)**:
  - **PascalCase** para componentes y páginas (ej. `BurbujaPedido.jsx`).
  - **camelCase** para funciones y variables.
  - Los hooks empiezan con `use` (ej. `useSeguimientoEnVivo`).
- **Backend (Node.js)**:
  - **camelCase** en archivos, carpetas, funciones y variables (ej. `productType.js`, `rutaReparto.js`).
  - Las variables de entorno van en **UPPER_SNAKE_CASE**, salvo algunas antiguas que conservan su nombre (`JWT_secret_key`, `apikeymail`).
- El código y los comentarios están en español.

### Textos
- Todo lo que lee el cliente (web, app, notificaciones y correos) va en **tú** y sin género.
- El panel de administración y los textos legales van en **usted**.
- Tiqui habla de sí misma en femenino y en primera persona.
- Las traducciones al inglés están en `frontend/src/i18n/en.js` y `movil/src/i18n/en.js`. Una frase nueva necesita su clave en los dos.

### Git
- Las ramas salen de `develop` y vuelven a `develop` con un pull request. `main` recibe a `develop` cuando se publica.
- Nombres de rama descriptivos: `feat/...`, `fix/...`, `docs/...`.
- Formato de los commits: `Tipo(ambito): descripcion`, con el detalle en una lista (ej. `Fix(backend,web): ...`).

---

## Instalación y configuración local

### Requisitos
- **Node.js 22** y **MongoDB** (local o Atlas).
- **Python 3.12**, o **Docker**, solo para el servicio de pronóstico.
- Para la app: **Expo Go**, un emulador de Android o una APK de desarrollo.

### 1. Backend
```bash
cd backend
npm install
```
Crea un archivo `.env` en `backend/`. Lo mínimo para arrancar:
```env
PORT=4000
DB_URI=mongodb://127.0.0.1:27017/cartify
JWT_secret_key=una_clave_larga_y_secreta
```
Lo demás es opcional: sin su variable, esa función se apaga sola y el resto sigue funcionando.

| Variables | Para qué |
| --- | --- |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma (por defecto `localhost:5173` y `5174`) |
| `COOKIES_ENTRE_DOMINIOS=true` | En producción, cuando la web y el API viven en dominios distintos |
| `TIENDA_URL`, `TIENDA_NOMBRE` | Enlaces y nombre que salen en los correos |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Imágenes de los productos |
| `apikeymail`, `apisecretmail`, `MAILJET_FROM_EMAIL`, `MAILJET_FROM_NAME` | Correos (Mailjet) |
| `GOOGLE_CLIENT_ID` | Inicio de sesión con Google (el mismo valor que en el frontend) |
| `GRANT_TYPE`, `AUDIENCE`, `CLIENT_ID`, `CLIENT_SECRET` | Pagos con tarjeta (Wompi) |
| `GEMINI_API_KEY` (y opcionales `GEMINI_MODEL`, `GEMINI_MODEL_RESPALDO`, `GEMINI_MODEL_ASISTENTE_RESPALDO`) | Tiqui y la IA del panel |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL` | La voz de Tiqui |
| `OPENROUTESERVICE_API_KEY` | La ruta por las calles en el seguimiento del pedido |
| `ANALITICA_URL`, `ANALITICA_CLAVE` | El servicio de pronóstico (la clave es la misma en los dos servicios) |
| `PRINTER_EMAIL` | Mandar los trabajos de impresión a la impresora por correo |
| `TIQUI_IA_PROPIA=1` | Encender el clasificador propio de Tiqui (apagado por defecto) |

Inicia el servidor:
```bash
npm run dev
```
La documentación del API queda en `http://localhost:4000/api-docs`.

### 2. Frontend
```bash
cd frontend
npm install
```
Copia `.env.example` como `.env`. `VITE_API_URL` apunta por defecto a `http://localhost:4000/api`, y las demás variables son opcionales: `VITE_GOOGLE_CLIENT_ID`, `VITE_WHATSAPP` y `VITE_LANDING_URL`.
```bash
npm run dev
```
Abre `http://localhost:5173`. El panel de administración está en `/admin`.

### 3. App móvil
```bash
cd movil
npm install
npx expo start
```
La app usa el backend publicado en Render. Para usar tu backend local:
1. Pon su dirección en `HOST_MANUAL`, en `movil/src/api/api.js` (en el emulador de Android: `http://10.0.2.2:4000/api`).
2. Al terminar, déjalo otra vez en `null`.

### 4. Servicio de pronóstico (opcional)
```bash
cd analitica
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn app.main:app --port 8600
```
(En macOS o Linux, `.venv/bin/` en vez de `.venv/Scripts/`.) También se puede correr con Docker:
```bash
docker build -t analitica-la635 .
docker run -p 8000:8000 -e ANALITICA_CLAVE=una-clave analitica-la635
```
Luego, en el `.env` del backend, `ANALITICA_URL` apunta a ese servicio y `ANALITICA_CLAVE` lleva la misma clave.

---

## Pruebas

| Parte | Comando |
| --- | --- |
| Backend | `cd backend && npm test` |
| Frontend | `cd frontend && npm run lint && npm test` |
| App móvil | `cd movil && npm test` |
| Análisis | `cd analitica && pytest` |

GitHub Actions (`.github/workflows/pruebas.yml`) corre todas las pruebas, el linter y la construcción de la web en cada pull request y en cada push a `develop` y `main`.

---

## Despliegue

- **Web** (`frontend/`): Vercel. `vercel.json` manda `/api/*` al backend y el resto a la SPA.
- **Backend** (`backend/`): Render (`https://cartify-tiendala635.onrender.com`). El plan gratis se duerme, así que `despertar-servidor.yml` lo visita cada 10 minutos.
- **Análisis** (`analitica/`): Render con Docker. La primera respuesta después de dormir puede tardar más de un minuto; el panel lo espera.
- **App** (`movil/`):
  - Se compila con EAS Build (perfiles `development`, `preview` y `production` en `eas.json`).
  - Los cambios que son solo de JavaScript se publican con `eas update`. `actualizar-app.yml` lo hace solo en cada push a `main` que toque `movil/`.
  - Un cambio nativo (un módulo nuevo de Expo, por ejemplo) necesita compilar una APK nueva.

---

## Decisiones de diseño (UI/UX)
- Paleta cálida en tonos tierra, con un color de marca que cambia según la temporada. Hay modo oscuro en la tienda, el panel y la app.
- El contenido fluye sobre el fondo, sin encerrarlo en tarjetas o recuadros decorativos.
- Bordes redondeados en botones y modales, y animaciones suaves con **Framer Motion** que respetan la preferencia de reducir movimiento.
- Tiqui, de estilo plano, acompaña los estados del pedido, los avisos y el asistente.
- La web y la app se ven y se comportan igual: lo que cambia en una, se cambia en la otra.

---

*Desarrollado con amor para Tienda La 635*
