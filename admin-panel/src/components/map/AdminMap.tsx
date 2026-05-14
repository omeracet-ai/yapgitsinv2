'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapItem {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  items: MapItem[];
  selectedId: string | null;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerClick: (id: string) => void;
}

function makeIcon(color: 'orange' | 'blue') {
  const bg = color === 'blue' ? '#2563eb' : '#f97316';
  const border = color === 'blue' ? '#1d4ed8' : '#c2410c';
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 18px; height: 18px;
      background: ${bg};
      border: 3px solid ${border};
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

const orangeIcon = makeIcon('orange');
const blueIcon   = makeIcon('blue');

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AdminMap({ items, selectedId, onMapClick, onMarkerClick }: Props) {
  const withCoords = items.filter(i => i.latitude != null && i.longitude != null);

  return (
    <MapContainer
      center={[39.0, 35.0]}
      zoom={6}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      {withCoords.map(item => (
        <Marker
          key={item.id}
          position={[item.latitude!, item.longitude!]}
          icon={item.id === selectedId ? blueIcon : orangeIcon}
          eventHandlers={{ click: () => onMarkerClick(item.id) }}
        >
          <Popup>{item.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
