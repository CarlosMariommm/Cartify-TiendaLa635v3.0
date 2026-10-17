// MAPA PARA MARCAR LA DIRECCIÓN — la página que corre DENTRO del WebView
// El mismo mapa de la web (MapLibre, CARTO y el pin de gota) en HTML plano, que le avisa a la
// pantalla dónde quedó el pin.

import { MAPLIBRE_CSS, MAPLIBRE_JS, JS_PLEGAR_CREDITO, cssComun, estiloMapa } from './mapaMapLibre';

export const crearHtmlMapa = ({ colorPin, centro, oscuro = false }) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="${MAPLIBRE_CSS}" />
  <style>${cssComun(colorPin, oscuro)}</style>
</head>
<body>
  <div id="mapa"></div>
  <script src="${MAPLIBRE_JS}"></script>
  <script>
    ${JS_PLEGAR_CREDITO}

    var mapa = new maplibregl.Map({
      container: 'mapa',
      style: '${estiloMapa(oscuro)}',
      center: [${centro.lng}, ${centro.lat}],
      zoom: 13,
      attributionControl: { compact: true },
      // Girar el mapa con dos dedos desorienta al marcar un portón.
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    plegarCredito(mapa);

    var marcador = null;

    function avisarPosicion(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
      }
    }

    function crearPin() {
      var caja = document.createElement('div');
      caja.className = 'pin-gota-caja';
      var gota = document.createElement('div');
      gota.className = 'pin-gota';
      caja.appendChild(gota);
      return caja;
    }

    function ponerPin(lat, lng) {
      if (marcador) {
        marcador.setLngLat([lng, lat]);
      } else {
        marcador = new maplibregl.Marker({ element: crearPin(), anchor: 'bottom', draggable: true })
          .setLngLat([lng, lat])
          .addTo(mapa);
        marcador.on('dragend', function () {
          var p = marcador.getLngLat();
          avisarPosicion(p.lat, p.lng);
        });
      }
      mapa.easeTo({ center: [lng, lat], zoom: Math.max(mapa.getZoom(), 16), duration: 400 });
    }

    // Tocar el mapa mueve el pin. Es la forma natural de decir "aquí".
    mapa.on('click', function (e) {
      ponerPin(e.lngLat.lat, e.lngLat.lng);
      avisarPosicion(e.lngLat.lat, e.lngLat.lng);
    });

    // Ver el comentario grande de arriba: esto lo llama RN, el mapa no lo llama solo.
    window.marcarPinExterno = function (lat, lng) {
      ponerPin(lat, lng);
    };
  </script>
</body>
</html>`;
