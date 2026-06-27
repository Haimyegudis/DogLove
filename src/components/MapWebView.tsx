import { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Coords, NearbyDog } from '../types/walk';

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%}</style>
</head><body><div id="map"></div>
<script>
  var map = new maplibregl.Map({ container:'map', style:'https://tiles.openfreemap.org/styles/bright', center:[34.78,32.08], zoom:13, attributionControl:false });
  var dogMarkers=[]; var meMarker=null; var centered=false;
  window.setData = function(jsonStr){
    try{
      var d = JSON.parse(jsonStr); var c = d.center; var dogs = d.dogs||[];
      if(c){
        if(!meMarker){ meMarker = new maplibregl.Marker({color:'#2BA7B0'}).setLngLat([c.lng,c.lat]).addTo(map); }
        else { meMarker.setLngLat([c.lng,c.lat]); }
        if(!centered){ map.jumpTo({center:[c.lng,c.lat], zoom:14}); centered=true; }
      }
      dogMarkers.forEach(function(m){m.remove();}); dogMarkers=[];
      dogs.forEach(function(x){ var m=new maplibregl.Marker({color:'#FF7A4D'}).setLngLat([x.lng,x.lat]).addTo(map); dogMarkers.push(m); });
    }catch(e){}
  };
  document.addEventListener('message', function(ev){ window.setData(ev.data); });
  window.addEventListener('message', function(ev){ window.setData(ev.data); });
</script></body></html>`;

export default function MapWebView({ center, dogs }: { center: Coords | null; dogs: NearbyDog[] }) {
  const ref = useRef<WebView>(null);
  const payload = JSON.stringify({ center, dogs });
  useEffect(() => {
    ref.current?.injectJavaScript(`window.setData(${JSON.stringify(payload)}); true;`);
  }, [payload]);
  return (
    <WebView
      ref={ref}
      style={styles.web}
      originWhitelist={['*']}
      source={{ html: HTML }}
      javaScriptEnabled
      domStorageEnabled
      onLoadEnd={() => ref.current?.injectJavaScript(`window.setData(${JSON.stringify(payload)}); true;`)}
    />
  );
}

const styles = StyleSheet.create({ web: { flex: 1, backgroundColor: '#FFF6EC' } });
