import { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Coords, NearbyDog } from '../types/walk';

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%}
  .dog-pin{width:46px;height:46px;border-radius:50%;border:3px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,.35);background:#FFE3D5;overflow:hidden;
    display:flex;align-items:center;justify-content:center;font-size:22px}
  .dog-pin img{width:100%;height:100%;object-fit:cover;display:block}
  .me-pin{width:20px;height:20px;border-radius:50%;background:#2BA7B0;
    border:3px solid #fff;box-shadow:0 0 0 6px rgba(43,167,176,.25)}
</style>
</head><body><div id="map"></div>
<script>
  // Render Hebrew/Arabic map labels in the correct direction.
  try { maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', function(){}, true); } catch(e){}

  var map = new maplibregl.Map({ container:'map', style:'https://tiles.openfreemap.org/styles/bright', center:[34.78,32.08], zoom:13 });

  // Prefer Hebrew place names on every text label (fallback to default name).
  map.on('load', function(){
    try {
      var layers = (map.getStyle().layers)||[];
      layers.forEach(function(layer){
        if(layer.type==='symbol' && layer.layout && layer.layout['text-field']!==undefined){
          map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get','name:he'], ['get','name:latin'], ['get','name']]);
        }
      });
    } catch(e){}
    drawCircle();
  });

  var dogMarkers=[]; var meMarker=null; var centered=false; var lastCenter=null; var lastRadius=0;

  // Recenter the map on the user (triggered by the focus button).
  window.recenter = function(){ if(lastCenter){ map.flyTo({center:[lastCenter.lng,lastCenter.lat], zoom:15, duration:600}); } };

  // Geodesic circle polygon (approx) for the chosen search radius.
  function circlePolygon(lng, lat, radiusM, points){
    points = points||72; var coords=[];
    var dLat = radiusM/110540;
    var dLon = radiusM/(111320*Math.cos(lat*Math.PI/180));
    for(var i=0;i<=points;i++){ var t=(i/points)*2*Math.PI; coords.push([lng+dLon*Math.cos(t), lat+dLat*Math.sin(t)]); }
    return { type:'Feature', geometry:{ type:'Polygon', coordinates:[coords] } };
  }
  function drawCircle(){
    if(!lastCenter || !lastRadius) return;
    if(!map.isStyleLoaded()){ map.once('idle', drawCircle); return; }
    var gj = circlePolygon(lastCenter.lng, lastCenter.lat, lastRadius, 72);
    if(map.getSource('radius')){ map.getSource('radius').setData(gj); }
    else {
      map.addSource('radius', { type:'geojson', data:gj });
      map.addLayer({ id:'radius-fill', type:'fill', source:'radius', paint:{ 'fill-color':'#FF5E8A', 'fill-opacity':0.14 } });
      map.addLayer({ id:'radius-line', type:'line', source:'radius', paint:{ 'line-color':'#F2613B', 'line-width':3, 'line-opacity':0.8 } });
    }
  }

  function meEl(){ var el=document.createElement('div'); el.className='me-pin'; return el; }
  function dogEl(x){
    var el=document.createElement('div'); el.className='dog-pin';
    el.title = (x.name||'') + (x.breed ? ' · ' + x.breed : '');
    if(x.photo_url){
      var img=document.createElement('img');
      img.src=x.photo_url; img.alt=x.name||'';
      img.onerror=function(){ el.removeChild(img); el.textContent='🐕'; };
      el.appendChild(img);
    } else { el.textContent='🐕'; }
    return el;
  }

  window.setData = function(jsonStr){
    try{
      var d = JSON.parse(jsonStr); var c = d.center; var dogs = d.dogs||[];
      if(typeof d.radiusM === 'number'){ lastRadius = d.radiusM; }
      if(c){
        lastCenter = c;
        if(!meMarker){ meMarker = new maplibregl.Marker({element:meEl()}).setLngLat([c.lng,c.lat]).addTo(map); }
        else { meMarker.setLngLat([c.lng,c.lat]); }
        if(!centered){ map.jumpTo({center:[c.lng,c.lat], zoom:14}); centered=true; }
      }
      drawCircle();
      dogMarkers.forEach(function(m){m.remove();}); dogMarkers=[];
      dogs.forEach(function(x){
        var m=new maplibregl.Marker({element:dogEl(x)}).setLngLat([x.lng,x.lat]).addTo(map);
        dogMarkers.push(m);
      });
    }catch(e){}
  };
  document.addEventListener('message', function(ev){ window.setData(ev.data); });
  window.addEventListener('message', function(ev){ window.setData(ev.data); });
</script></body></html>`;

export default function MapWebView({ center, dogs, radiusM = 0, focusNonce = 0 }: { center: Coords | null; dogs: NearbyDog[]; radiusM?: number; focusNonce?: number }) {
  const ref = useRef<WebView>(null);
  const payload = JSON.stringify({ center, dogs, radiusM });
  useEffect(() => {
    ref.current?.injectJavaScript(`window.setData(${JSON.stringify(payload)}); true;`);
  }, [payload]);
  // Recenter when the focus button bumps the nonce.
  useEffect(() => {
    if (focusNonce > 0) ref.current?.injectJavaScript('window.recenter && window.recenter(); true;');
  }, [focusNonce]);
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
