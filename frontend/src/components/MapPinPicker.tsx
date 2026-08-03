import { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { C, R } from "@/src/theme/colors";

// Note: pass a `key` that changes when the *initial* center should jump
// (e.g. `key={area}` when the user picks a new area from a dropdown) —
// this component intentionally ignores lat/lng prop updates after mount
// so a drag-in-progress isn't reset; a `key` change forces a fresh mount.
type Props = {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

const MSG_KEY = "lc-pin-picker";

function buildHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#F5F5FC}#map{width:100%;height:100vh}.leaflet-control-attribution{display:none!important}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{center:[${lat},${lng}],zoom:15});
L.tileLayer('https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png',{maxZoom:20}).addTo(map);
var icon=L.divIcon({html:'<div style="width:40px;height:40px;border-radius:50% 50% 50% 0;background:#7C3AED;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 10px rgba(124,58,237,0.55);"><div style="transform:rotate(45deg);font-size:18px;">🏠</div></div>',iconSize:[40,40],iconAnchor:[20,40],className:''});
var marker=L.marker([${lat},${lng}],{icon:icon,draggable:true}).addTo(map);
function post(ll){ window.parent.postMessage(JSON.stringify({key:'${MSG_KEY}',lat:ll.lat,lng:ll.lng}),'*'); }
marker.on('dragend',function(){ post(marker.getLatLng()); });
map.on('click',function(e){ marker.setLatLng(e.latlng); post(e.latlng); });
</script></body></html>`;
}

export function MapPinPicker({ latitude, longitude, onChange, height = 260 }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // The iframe owns pin position once mounted (drag/click updates flow up via
  // postMessage) — remounting on every coordinate change would reset zoom/pan
  // mid-drag, so the initial center is captured once and never re-derived.
  const initial = useRef({ latitude, longitude });

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(String(e.data));
        if (data?.key === MSG_KEY) onChangeRef.current(data.lat, data.lng);
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderEmoji}>🗺️</Text>
        <Text style={styles.placeholderText}>Drag-to-place map available on web</Text>
        <Text style={styles.placeholderCoords}>{latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.mapWrap, { height }]}>
      {/* @ts-ignore */}
      <iframe
        srcDoc={buildHtml(initial.current.latitude, initial.current.longitude)}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Pick your exact location"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { width: "100%", borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  placeholder: {
    width: "100%", borderRadius: R.lg, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surfaceSecondary, alignItems: "center", justifyContent: "center", gap: 6,
  },
  placeholderEmoji: { fontSize: 36 },
  placeholderText: { fontSize: 13, color: C.onSurfaceSecondary },
  placeholderCoords: { fontSize: 12, color: C.onSurfaceTertiary },
});
