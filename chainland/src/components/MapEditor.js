'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Leaflet components must be loaded dynamically for Next.js SSR
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const FeatureGroup = dynamic(() => import('react-leaflet').then(m => m.FeatureGroup), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const EditControl = dynamic(() => import('react-leaflet-draw').then(m => m.EditControl), { ssr: false });

// This component uses useMap hook, so it must be rendered inside MapContainer
// We define it as a dynamic import inside the main component to ensure react-leaflet is loaded
function MapAutoZoom({ bounds, L }) {
  // We need to import useMap dynamically or ensure it's available
  const [map, setMap] = useState(null);
  
  // A trick to get the map instance without top-level useMap import
  const MapHookLoader = dynamic(() => import('react-leaflet').then(mod => {
    return function Loader({ bounds, L }) {
      const mapInstance = mod.useMap();
      useEffect(() => {
        if (mapInstance) {
          setTimeout(() => { mapInstance.invalidateSize(); }, 250);
        }
        if (mapInstance && bounds && bounds.length > 0 && L) {
          try {
            const latLngBounds = L.latLngBounds(bounds);
            mapInstance.fitBounds(latLngBounds, { padding: [20, 20] });
          } catch (e) {
            console.error('FitBounds error:', e);
          }
        }
      }, [mapInstance, bounds, L]);
      return null;
    };
  }), { ssr: false });

  return <MapHookLoader bounds={bounds} L={L} />;
}

export default function MapEditor({ onPolygonCreated, initialPolygon, readOnly = false, height = '400px' }) {
  const [L, setL] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        const leafletLib = leaflet.default || leaflet;
        setL(leafletLib);
        // Fix Leaflet marker icons
        delete leafletLib.Icon.Default.prototype._getIconUrl;
        leafletLib.Icon.Default.mergeOptions({
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        });
        import('leaflet-draw');
      });
    }
  }, []);

  if (!isMounted || !L) {
    return (
      <div className="h-[400px] w-full rounded-xl bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
        <p className="text-slate-400 text-sm animate-pulse font-medium">Initializing Satellite Map Engine...</p>
      </div>
    );
  }

  const center = [28.3949, 84.1240];
  const maxBounds = [[26.347, 80.058], [30.447, 88.201]];

  return (
    <div style={{ height }} className="w-full rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner relative">
      <MapContainer 
        center={center} 
        zoom={7} 
        minZoom={7}
        maxZoom={18}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FeatureGroup>
          {!readOnly && (
            <EditControl
              position="topright"
              onCreated={(e) => {
                const layer = e.layer;
                if (layer.getLatLngs) {
                  // Get the coordinates
                  let latlngs = layer.getLatLngs();
                  // Handle different Leaflet latlng structures
                  if (Array.isArray(latlngs[0])) latlngs = latlngs[0];
                  
                  const coords = latlngs.map(ll => [ll.lat, ll.lng]);
                  console.log('Polygon Created:', coords);
                  if (onPolygonCreated) onPolygonCreated(coords);
                }
              }}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  drawError: { color: '#e1e1e1', message: '<strong>Polygon intersections not allowed<strong>' },
                  shapeOptions: { color: '#dc143c' }
                }
              }}
            />
          )}
          {initialPolygon && initialPolygon.length > 0 && (
            <Polygon positions={initialPolygon} color="#dc143c" weight={3} fillOpacity={0.4} />
          )}
        </FeatureGroup>

        <MapAutoZoom bounds={initialPolygon} L={L} />
      </MapContainer>
    </div>
  );
}
