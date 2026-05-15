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
  overlayItems?: MapItem[];
  overlayLabel?: string;
}

function makeIcon(color: 'orange' | 'blue' | 'green' | 'purple') {
  const cfg: Record<string, [string, string]> = {
    orange: ['#f97316', '#c2410c'],
    blue:   ['#2563eb', '#1d4ed8'],
    green:  ['#16a34a', '#15803d'],
    purple: ['#9333ea', '#7e22ce'],
  };
  const [bg, border] = cfg[color];
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

const icons = {
  orange: makeIcon('orange'),
  blue:   makeIcon('blue'),
  green:  makeIcon('green'),
  purple: makeIcon('purple'),
};

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function AdminMap({
  items,
  selectedId,
  onMapClick,
  onMarkerClick,
  overlayItems = [],
  overlayLabel = 'Ek Katman',
}: Props) {
  const primary = items.filter(i => i.latitude != null && i.longitude != null);
  const overlay = overlayItems.filter(i => i.latitude != null && i.longitude != null);

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

      {/* Overlay items — green, read-only */}
      {overlay.map(item => (
        <Marker
          key={`ov-${item.id}`}
          position={[item.latitude!, item.longitude!]}
          icon={icons.green}
          eventHandlers={{ click: () => onMarkerClick(item.id) }}
        >
          <Popup>
            <span className="text-xs text-green-700 font-semibold">{overlayLabel}</span>
            <br />{item.label}
          </Popup>
        </Marker>
      ))}

      {/* Primary items — orange (normal) / blue (selected) */}
      {primary.map(item => (
        <Marker
          key={item.id}
          position={[item.latitude!, item.longitude!]}
          icon={item.id === selectedId ? icons.blue : icons.orange}
          eventHandlers={{ click: () => onMarkerClick(item.id) }}
        >
          <Popup>{item.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
