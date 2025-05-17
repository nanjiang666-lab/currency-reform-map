// src/components/Map.js
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function Map({ selectedYear, onSelectCountry }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return; // 已初始化
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 20],
      zoom: 1.5,
    });
    map.on('load', () => {
      map.addSource('countries', {
        type: 'geojson',
        data: '/countries.geojson'
      });
      map.addLayer({
        id: 'country-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': '#627BC1',
          'fill-opacity': 0.5
        }
      });
      map.addLayer({
        id: 'country-border',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#ffffff',
          'line-width': 0.5
        }
      });
    });
    map.on('click', 'country-fill', e => {
      onSelectCountry(e.features[0].properties.ADMIN);
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);

  // 如果要根据 selectedYear 改颜色，可在这里加逻辑

  return <div ref={mapContainer} style={{ width: '100%', height: '600px' }} />;
}
