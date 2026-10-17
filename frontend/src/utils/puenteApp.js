// EL PANEL DENTRO DE LA APP — puenteApp.js
// El administrador puede abrir este mismo panel dentro de la app del teléfono
// (movil/src/pages/personal/PanelWeb.js).

// ¿Está el panel abierto dentro de la app?
export const enLaApp = () => typeof window !== 'undefined' && Boolean(window.ReactNativeWebView);

// Un mensaje para la app. Fuera de la app no hace nada.
export const avisarALaApp = (mensaje) => {
  if (!enLaApp()) return;
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify(mensaje));
  } catch {
    // Si la app no lo recibe, el panel sigue funcionando igual.
  }
};
