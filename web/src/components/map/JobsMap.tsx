'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Job {
  id: string;
  title: string;
  category?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
}

const customIcon = new L.Icon({
  iconUrl: '/map-pin.svg',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

export default function JobsMap() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setError('API URL yapılandırılmamış.');
      setLoading(false);
      return;
    }

    fetch(`${apiUrl}/jobs?limit=50`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Job[] | { data?: Job[] }) => {
        const list: Job[] = Array.isArray(data) ? data : (data?.data ?? []);
        const mapped = list.filter(
          (j) => j.latitude != null && j.longitude != null
        );
        setJobs(mapped);
      })
      .catch(() => setError('İlanlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-[480px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center text-gray-400 text-sm">
        Harita yükleniyor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[480px] bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="h-[480px] rounded-2xl overflow-hidden shadow-md">
      <MapContainer
        center={[39.0, 35.0]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {jobs.map((job) => (
          <Marker
            key={job.id}
            position={[job.latitude as number, job.longitude as number]}
            icon={customIcon}
          >
            <Popup>
              <div className="text-sm space-y-0.5">
                <p className="font-semibold text-gray-900">{job.title}</p>
                {job.category && (
                  <p className="text-gray-500">{job.category}</p>
                )}
                {job.location && (
                  <p className="text-gray-400 text-xs">{job.location}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
