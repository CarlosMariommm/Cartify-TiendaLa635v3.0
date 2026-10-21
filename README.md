# Cartify · Tienda la 635

**Cartify** es el sistema de **Tienda la 635**, una tienda de barrio en Calle Sevilla 635, Col. Providencia, que ahora también vende por internet. *El súper de la esquina, a un toque.*

Son tres partes que comparten el mismo servidor y la misma base de datos:

- **La tienda web**: para comprar desde el navegador.
- **La app Android**: la misma tienda en el teléfono, más el modo del personal para repartir pedidos.
- **El panel del negocio**: inventario, pedidos, clientes, promociones y la configuración de la tienda.

Detrás, un **servicio de análisis en Python** calcula el pronóstico de ventas que ve el panel.

Y en las tres está **Tiqui**, la mascota de la tienda: una etiqueta de precio con cara que también es la asistente de voz. Arma tu pedido si le hablas, cuenta las ofertas y te acompaña en las pantallas de carga, los errores y las listas vacías.

| | |
|---|---|
| Tienda | https://cartify-tienda-la635.vercel.app |
| Servidor (API) | https://cartify-tiendala635.onrender.com/api |
| Documentación de la API | https://cartify-tiendala635.onrender.com/api-docs |
| Página de presentación | https://cartify-tienda-la635-landingpage.vercel.app |
| Juego del stand | https://cartify-tienda-la635.vercel.app/juego |

---

## Qué hace

### Para quien compra (web y app)

- **Se compra sin cuenta**: la sesión se pide recién al pagar, para entrar a Mi Cuenta o para guardar favoritos. El carrito se queda guardado aunque se vaya el internet.
- **Tiqui, la asistente de voz**: "quiero dos manzanas y una leche" y las pone en el carrito; también cuenta las ofertas, abre secciones y lleva al pago. Recomienda primero lo que conviene mover (lo que vence pronto o casi no se vende) y dice por qué. Entiende con inteligencia artificial (Google Gemini, con Gemma de respaldo y un modelo gratis de OpenRouter si Google se satura) y habla con una voz de ElevenLabs que cambia de ánimo: alegre, asombrada, apenada… En la app se despierta tocándola.
- **Retiro en la tienda o envío a domicilio**, con costo por zonas. El pedido se entrega con un **código de 4 dígitos** que solo ve el cliente.
- **Seguimiento en el mapa**:
  - Con el GPS del repartidor: su punto en vivo, la ruta por las calles que le falta (OpenRouteService) y cuánto tarda en llegar.
  - Si su teléfono no manda la ubicación: la ruta aproximada desde la tienda y los minutos que faltan desde que salió.
- **"Quien compra esto también lleva"**: en la ficha de cada producto, lo que otros clientes llevaron en el mismo pedido.
- **Pagos**: efectivo o tarjeta al recibir o en la tienda, o con el **saldo** de las tarjetas de regalo. Todavía no se cobra en línea (con Wompi solo está la conexión inicial).
- **Puntos de fidelidad** en cada compra, que se canjean como descuento. En el **kiosco** de la tienda se suman escaneando un QR con el teléfono, sin escribir la contraseña en una pantalla pública.
- **Impresiones**: subes tu archivo, eliges el papel y la tienda lo imprime.
- **Mi Cuenta**: pedidos, recibos, favoritos, direcciones, tarjetas (solo se guardan los últimos 4 dígitos), notificaciones, puntos, centro de ayuda y preferencias.
- **Preferencias**: modo claro, oscuro o automático, y español o inglés (el panel del negocio se queda en español).
- **Avisos** del pedido por correo y, en la app, notificaciones push. Cada correo trae su enlace para darse de baja.
- Inicio de sesión con **Google**, confirmación de edad para productos +18, **reseñas**, botón de **WhatsApp** y enlaces de productos que se pueden compartir (con vista previa en WhatsApp y que abren la app si está instalada).
- **Temporadas**: en Navidad, Halloween, la Independencia o San Valentín la tienda cambia de color y Tiqui se disfraza. Las de fábrica se pueden borrar y restaurar desde el panel.
- Las visitas se cuentan de forma anónima y sin cookies, solo si se acepta en el aviso.

### Para el negocio (panel en `/admin`)

- Entrada del personal con **verificación en dos pasos** (código de 6 dígitos por correo) y dos roles: **administrador** y **empleado**.
- **Dashboard** con gráficas y reportes en PDF, y **pedidos** con sus estados (pagado, preparando, en camino, listo, entregado, cancelado).
- **Inventario**: los módulos Tienda e Impresiones, categorías, marcas, proveedores con su cuenta de crédito, códigos de barras, fechas de vencimiento y fotos en Cloudinary.
- **Importar desde Excel**: la IA acomoda las columnas y completa lo que falta. Las fotos salen de Open Food Facts, con su crédito en la ficha.
- **Pronóstico** (`/pronostico`):
  - Muestra las ventas de las próximas semanas con su rango, qué productos se van a acabar y cuánto comprar, con reporte en PDF.
  - Mientras la tienda no junte 4 semanas de ventas, muestra una demostración.
- **Pedir a proveedores**: desde la compra sugerida, por WhatsApp, por la app del proveedor o con una llamada.
- **Clientes, empleados, promociones, puntos de fidelidad, tarjetas de regalo y servicios de impresión**. Las listas se buscan y se filtran, y empiezan por lo más reciente.
- **Personalización**: nombre y logo, orden de la portada, temporada, datos del negocio, ubicación de la tienda y zonas de envío.
- **Mini tutorial** la primera vez que el administrador entra a cada apartado.
- **Paletas para cuidar la vista**: Mi marca, Lectura, Contraste reforzado, Modo oscuro, Calma y Calma noche, más opciones de lectura.
- **Tiqui del panel**: la asistente del equipo, aparte de la de los clientes. Responde sobre el negocio, avisa de promociones con pérdida o productos por vencer y compara precios con Walmart, La Despensa de Don Juan y Maxi Despensa. Cambia datos **solo con confirmación**.
- **En la app**, el personal entra en modo personal:
  - El **Reparto**: pedidos a domicilio, "Salí a repartir" (comparte la ubicación con el cliente) y entrega con código.
  - Para el administrador, además, el **panel web** dentro de la app, con su Tiqui.
  - El personal recibe un aviso con cada pedido nuevo.

### El reto de Tiqui (stand de la Expo 2026)

En `/juego`, pensado para una laptop a pantalla completa:

- Tiqui hace preguntas sobre la tienda. Con **3 aciertos antes de 2 errores** se gira una ruleta que da dulce o premio secreto.
- La porción del premio secreto mide exactamente su probabilidad.
- **Panel oculto** para quien atiende el stand: se abre tocando 5 veces "El reto de Tiqui". Ahí se ponen los premios secretos y los dulces que quedan (la probabilidad puede salir sola de esos números), el tiempo por pregunta, la voz, la música y los contadores del día.
- La voz de Tiqui está **grabada** en `frontend/public/juego/voz/`, y la música y los efectos se generan en el navegador: funciona sin internet una vez abierto.

---

## Cómo está hecho

| Parte | Carpeta | Tecnología | Dónde vive |
|---|---|---|---|
| Web | `frontend/` | React 19 + Vite 8, Tailwind CSS 4, Framer Motion, React Router 7, MapLibre, Recharts, jsPDF | Vercel |
| Servidor | `backend/` | Node.js + Express 5, MongoDB (Mongoose 9) en Atlas, sesiones JWT en cookies, bcryptjs, Cloudinary, Mailjet, Google Gemini, ElevenLabs, OpenRouteService, Swagger | Render |
| App | `movil/` | Expo SDK 54 (React Native 0.81), React Navigation, expo-updates, notificaciones con Firebase Cloud Messaging, EAS Build | APK de Android (`com.tiendala635.app`) |
| Análisis | `analitica/` | Python 3.12, FastAPI, statsmodels (Holt-Winters para la tienda, TSB para cada producto), pandas, Docker | Render (Docker) |

```
backend/     servidor: index.js, app.js, config.js y src/ (controller, models, routes, middlewares, utils, docs)
frontend/    web: src/ (pages, components, hooks, context, api, utils, i18n), public/ y scripts/
movil/       app: src/ (pages, components, navigation, context, hooks, api, utils, i18n, theme)
analitica/   pronóstico: app/ (FastAPI), tests/, intenciones/ y Dockerfile
.github/     revisiones automáticas y publicación de la app
```

- La web y la app hablan con el mismo servidor. En producción, la web le pasa a Render todo lo que va a `/api` (ver `frontend/vercel.json`).
- El servidor le pide el pronóstico al servicio de análisis. Los dos comparten una clave (`ANALITICA_CLAVE`).
- En `analitica/intenciones/` está el clasificador propio de Tiqui (scikit-learn). Viene **apagado**, así que todo lo entiende Gemini; `TIQUI_IA_PROPIA=1` lo enciende.
- **StoreSettings**: el documento que vale es el que tiene `clave: "tienda"`. Siempre hay que buscarlo por esa clave.
- La sesión de los clientes y la del personal van por separado: en una misma computadora se puede tener abierta la tienda con una cuenta y el panel con otra.
- El servidor documenta sus rutas con Swagger en `/api-docs`.

---

## Correrlo en tu computadora

Hace falta **Node.js 22** y npm. El servicio de análisis necesita, además, **Python 3.12** o **Docker**.

> **Ojo:** si en `DB_URI` pones la base de Atlas que usa la tienda publicada, todo lo que hagas en local (pedidos, cambios en el inventario) le pasa a la tienda real.

### 1. Servidor

```bash
cd backend
npm install
npm run dev
```

Queda en `http://localhost:4000/api`, con la documentación en `http://localhost:4000/api-docs`. Necesita un archivo `backend/.env` con estas variables (los valores no van en el repositorio):

| Variable | Para qué |
|---|---|
| `DB_URI` | La base de datos MongoDB |
| `JWT_secret_key` | Firmar las sesiones |
| `PORT` | El puerto (4000 si no está) |
| `CORS_ORIGINS` | Desde qué páginas se puede llamar al servidor, separadas por coma (en local, `http://localhost:5173`) |
| `COOKIES_ENTRE_DOMINIOS` | `true` cuando la web y el servidor están en dominios distintos (en producción) |
| `TIENDA_URL`, `TIENDA_NOMBRE` | La dirección y el nombre de la tienda en los correos |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Las fotos de productos y logos |
| `apikeymail`, `apisecretmail`, `MAILJET_FROM_EMAIL`, `MAILJET_FROM_NAME` | Mandar correos con Mailjet |
| `PRINTER_EMAIL` | El correo de la impresora, para las impresiones |
| `GOOGLE_CLIENT_ID` | Inicio de sesión con Google (el mismo de la web) |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MODEL_RESPALDO`, `GEMINI_MODEL_ASISTENTE_RESPALDO` | La inteligencia artificial de Tiqui |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL` | La voz de Tiqui (sin ellas, Tiqui habla con la voz del navegador o del teléfono) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODELOS` | El respaldo de Tiqui cuando Gemini se satura (modelos gratis de OpenRouter) |
| `LLMGATEWAY_API_KEY`, `LLMGATEWAY_MODELOS` | La otra pasarela posible, si no hay llave de OpenRouter (cobra créditos) |
| `TIQUI_IA_PROPIA` | `1` enciende el clasificador propio de Tiqui (apagado si no está) |
| `OPENROUTESERVICE_API_KEY` | La ruta por las calles en el seguimiento del pedido (sin ella, el mapa sale sin la línea) |
| `ANALITICA_URL`, `ANALITICA_CLAVE` | El servicio de pronóstico y la clave que comparte con el servidor |
| `GRANT_TYPE`, `AUDIENCE`, `CLIENT_ID`, `CLIENT_SECRET` | La conexión con Wompi |

Las de IA, voz, rutas, pronóstico y Wompi son opcionales: sin ellas el resto funciona y solo esa parte no.

### 2. Web

```bash
cd frontend
npm install
npm run dev
```

Queda en `http://localhost:5173`. Las variables van en `frontend/.env` (ver `frontend/.env.example`):

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | El servidor (si no está, `http://localhost:4000/api`) |
| `VITE_GOOGLE_CLIENT_ID` | El botón de Google |
| `VITE_WHATSAPP` | El botón de WhatsApp (503 + los 8 dígitos) |
| `VITE_LANDING_URL` | El enlace a la página de presentación |

### 3. App

```bash
cd movil
npm install
npx expo start
```

- Las variables van en `movil/.env` (ver `movil/.env.example`): `EXPO_PUBLIC_WHATSAPP` y `EXPO_PUBLIC_EAS_PROJECT_ID`, que hace falta para las notificaciones.
- La app usa el servidor de Render. Para usar uno local, pon su dirección en `HOST_MANUAL` (`movil/src/api/api.js`). En el emulador de Android, `localhost` es `10.0.2.2`.
- Usa módulos nativos (Google, reconocimiento de voz, notificaciones), así que en el teléfono se prueba con una compilación propia y no con Expo Go: `npx expo run:android` o la APK de EAS.

### 4. Servicio de análisis (opcional)

```bash
cd analitica
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn app.main:app --port 8600
```

En macOS o Linux, `.venv/bin/` en vez de `.venv/Scripts/`. También corre con Docker:

```bash
docker build -t analitica-la635 .
docker run -p 8000:8000 -e ANALITICA_CLAVE=una-clave analitica-la635
```

Luego, en `backend/.env`, `ANALITICA_URL` apunta a ese servicio y `ANALITICA_CLAVE` lleva la misma clave. Sin él, el pronóstico avisa que no está conectado.

---

## Pruebas y revisión automática

La web, el servidor y la app tienen sus pruebas con Vitest:

```bash
npm test
```

El servicio de análisis, con pytest (desde `analitica/`, con su entorno activado):

```bash
pytest
```

En la web, además, el linter tiene que quedar en 0 avisos:

```bash
npm run lint
```

En GitHub (`.github/workflows/`) hay tres flujos:

- **Pruebas** (`pruebas.yml`): en cada pull request y al llegar a `develop` o `main`, prueba las cuatro partes por separado.
  - Web: linter, pruebas y construcción.
  - Servidor: pruebas.
  - Análisis: pruebas con pytest.
  - App: pruebas y revisión de Expo.
- **Actualizar la app** (`actualizar-app.yml`): cuando a `main` llega un cambio en `movil/`, corre las pruebas y publica la actualización con `eas update`. Las APK instaladas la bajan solas al abrirse. Necesita el secreto `EXPO_TOKEN` en GitHub.
- **Despertar servidor** (`despertar-servidor.yml`): cada 10 minutos le toca la puerta al servidor, porque Render, en el plan gratis, lo duerme tras 15 minutos sin visitas.

---

## Publicar

- **Web**: Vercel publica sola lo que llega a `main`.
- **Servidor**: en Render, revisa que el último despliegue sea el de `main`. Si no, usa "Manual Deploy" con el último commit.
- **Servicio de análisis**: Render lo construye con su `Dockerfile`. En el plan gratis tarda más de un minuto en despertar; mientras tanto el panel dice "calculando" y espera.
- **App**: lo que es solo código llega por `eas update` (el flujo de GitHub). Un cambio nativo, como una librería nueva con código nativo o un cambio de permisos o de `app.json`, cambia la "huella" de la app y necesita una APK nueva:

  ```bash
  cd movil
  npx eas-cli build -p android --profile preview
  ```

- **Voz del juego del stand**: solo si cambia alguna frase. Graba únicamente lo que falta y gasta créditos de ElevenLabs:

  ```bash
  cd frontend
  npm run voz-juego:grabar
  ```

  Sin `:grabar` (`npm run voz-juego`) solo cuenta lo que falta, sin gastar nada.

---

## Cómo trabajamos

### Ramas

- Cada cambio sale de `develop` en su propia rama, con un nombre que diga qué se hizo: `feat/juego-tiqui-stand`, `fix/huella-app-saltos-de-linea`, `hotfix/...`.
- Vuelve a `develop` por pull request.
- `main` recibe a `develop` cuando está listo para publicarse.

### Commits

Un título `Tipo(ambito): descripcion` y un `-m` por cada punto, sin tildes:

```bash
git commit -m "Fix(web,movil): la direccion de la tienda en el carrito" -m "- El carrito decia Mejicanos; ahora muestra Calle Sevilla 635" -m "- Web: sale de los datos del negocio, la misma del pie"
```

### Código

- El código nuevo se escribe en español: nombres, comentarios y mensajes.
- Los comentarios dicen, en máximo 3 líneas, qué hace cada parte. Solo los de Swagger (que arman `/api-docs`) pueden ser más largos.
- **Componentes y páginas de React**: PascalCase (`ShoppingCart.jsx`, `JuegoTiqui.jsx`).
- **Hooks**: camelCase con `use` (`useJuegoTiqui`).
- **Funciones y variables**: camelCase.
- **Servidor**: archivos y funciones en camelCase. Los modelos de Mongoose se nombran en PascalCase.
- **Variables de entorno**: MAYÚSCULAS_CON_GUION_BAJO. Quedan algunas viejas con otro formato, como `JWT_secret_key` y `apikeymail`.

### Textos

- Todo lo que lee el cliente va en **tú y sin género** ("Te agregué 2 manzanas", nunca "usted" ni "listo/lista"), en la web, la app, los avisos y los correos.
- **Tiqui es ella**: habla en primera persona y tutea.
- El nombre de la tienda en voz alta es "la seis tres cinco".
- El panel y los documentos legales quedan en español.
- Todo texto nuevo de la tienda pasa por `t()` y lleva su entrada en `i18n/en.js`. Una prueba avisa si falta.

### Diseño

- Los colores de la casa son el azul marino `#003049` y el celeste `#009AEB`. Las temporadas cambian los colores de la tienda, nunca los de Tiqui.
- La letra es Poppins.
- **Sin recuadros decorativos**: el contenido va sobre el fondo, separado con aire y líneas finas.
- Todo tiene que verse bien también en **modo oscuro**, y las animaciones respetan a quien pide movimiento reducido.

---

Proyecto de la Expo 2026 · Instituto Ricaldone
