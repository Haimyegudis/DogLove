import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Coords } from '../types/walk';

function html(initial: Coords | null): string {
  const c = initial ?? { lat: 32.08, lng: 34.78 };
  const hasInit = initial ? 'true' : 'false';
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%}</style>
</head><body><div id="map"></div>
<script>
  try { maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', function(){}, true); } catch(e){}
  var map = new maplibregl.Map({ container:'map', style:'https://tiles.openfreemap.org/styles/bright', center:[${c.lng},${c.lat}], zoom:13 });
  var marker = null;
  function place(lng,lat){
    if(marker){ marker.setLngLat([lng,lat]); } else { marker = new maplibregl.Marker({color:'#FF5E8A'}).setLngLat([lng,lat]).addTo(map); }
    if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({lat:lat,lng:lng})); }
  }
  if(${hasInit}){ place(${c.lng},${c.lat}); }
  map.on('click', function(e){ place(e.lngLat.lng, e.lngLat.lat); });
  // Allow the host to recenter/drop a pin (e.g. "use my location").
  window.setPin = function(lat,lng){ map.flyTo({center:[lng,lat], zoom:15, duration:500}); place(lng,lat); };
</script></body></html>`;
}

export default function MapPicker({ initial, onPick }: { initial: Coords | null; onPick: (c: Coords) => void }) {
  const ref = useRef<WebView>(null);
  return (
    <WebView
      ref={ref}
      style={styles.web}
      originWhitelist={['*']}
      source={{ html: html(initial) }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(e) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (typeof d.lat === 'number' && typeof d.lng === 'number') onPick({ lat: d.lat, lng: d.lng });
        } catch {}
      }}
    />
  );
}

const styles = StyleSheet.create({ web: { flex: 1, backgroundColor: '#FFF6EC' } });
