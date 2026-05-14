"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { api, type Job, type User } from "@/lib/api";
import type { MapItem } from "@/components/map/AdminMap";

// Dynamic import — SSR off (Leaflet needs window)
const AdminMap = dynamic(() => import("@/components/map/AdminMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm">
      Harita yükleniyor…
    </div>
  ),
});

type Tab = "jobs" | "users";

interface CoordState {
  lat: string;
  lng: string;
}

export default function HaritaPage() {
  const [tab, setTab] = useState<Tab>("jobs");

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Selection & editing
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coords, setCoords] = useState<CoordState>({ lat: "", lng: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load jobs on mount
  useEffect(() => {
    setJobsLoading(true);
    api
      .getJobs({ limit: 200 })
      .then((r) => setJobs(r.items))
      .catch((e) => setJobsError((e as Error).message))
      .finally(() => setJobsLoading(false));
  }, []);

  // Load users when tab switches to users
  useEffect(() => {
    if (tab === "users" && !usersLoaded) {
      setUsersLoading(true);
      api
        .getUsers({ limit: 200 })
        .then((r) => {
          setUsers(r.items);
          setUsersLoaded(true);
        })
        .catch((e) => setUsersError((e as Error).message))
        .finally(() => setUsersLoading(false));
    }
  }, [tab, usersLoaded]);

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedId(null);
    setCoords({ lat: "", lng: "" });
    setSaveMsg(null);
  }, [tab]);

  // Current list as MapItems
  const items: MapItem[] =
    tab === "jobs"
      ? jobs.map((j) => ({
          id: j.id,
          label: `${j.title} — ${j.location}`,
          latitude: j.latitude ?? null,
          longitude: j.longitude ?? null,
        }))
      : users.map((u) => ({
          id: u.id,
          label: u.fullName,
          latitude: u.latitude ?? null,
          longitude: u.longitude ?? null,
        }));

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  function selectItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSelectedId(id);
    setCoords({
      lat: item.latitude != null ? String(item.latitude) : "",
      lng: item.longitude != null ? String(item.longitude) : "",
    });
    setSaveMsg(null);
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!selectedId) return;
    setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    setSaveMsg(null);
  }, [selectedId]);

  const handleMarkerClick = useCallback((id: string) => {
    selectItem(id);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!selectedId) return;
    const lat = parseFloat(coords.lat);
    const lng = parseFloat(coords.lng);
    if (isNaN(lat) || isNaN(lng)) {
      setSaveMsg("Geçersiz koordinat.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      if (tab === "jobs") {
        await api.setJobLocation(selectedId, lat, lng);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === selectedId ? { ...j, latitude: lat, longitude: lng } : j
          )
        );
      } else {
        await api.setUserLocation(selectedId, lat, lng);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedId ? { ...u, latitude: lat, longitude: lng } : u
          )
        );
      }
      setSaveMsg("Kaydedildi.");
    } catch (e) {
      setSaveMsg("Hata: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isLoading = tab === "jobs" ? jobsLoading : usersLoading;
  const error = tab === "jobs" ? jobsError : usersError;
  const missingCount = items.filter((i) => i.latitude == null).length;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-3.5rem-3rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Harita Yönetimi</h2>
        {missingCount > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
            {missingCount} kayıtta koordinat eksik
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {(["jobs", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "jobs" ? "İlanlar" : "Ustalar"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Split view */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* LEFT: item list */}
        <div className="w-72 shrink-0 flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-400 font-medium uppercase tracking-wide">
            {tab === "jobs" ? "İlanlar" : "Ustalar"} ({items.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-gray-400 animate-pulse">
                Yükleniyor…
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Kayıt bulunamadı.</div>
            ) : (
              items.map((item) => {
                const hasCoords = item.latitude != null && item.longitude != null;
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      isSelected
                        ? "bg-blue-50 border-l-2 border-blue-500"
                        : hasCoords
                        ? "hover:bg-gray-50"
                        : "bg-yellow-50 hover:bg-yellow-100"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                    <p className={`text-xs mt-0.5 ${hasCoords ? "text-gray-400" : "text-yellow-600 font-medium"}`}>
                      {hasCoords
                        ? `${item.latitude!.toFixed(4)}, ${item.longitude!.toFixed(4)}`
                        : "Koordinat eksik"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: map + edit panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Coordinate editor */}
          {selectedItem ? (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                {selectedItem.label}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-gray-500">Enlem</label>
                <input
                  type="number"
                  step="any"
                  value={coords.lat}
                  onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
                  placeholder="39.9334"
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
                <label className="text-xs text-gray-500">Boylam</label>
                <input
                  type="number"
                  step="any"
                  value={coords.lng}
                  onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value }))}
                  placeholder="32.8597"
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
                {saveMsg && (
                  <span
                    className={`text-xs font-medium ${
                      saveMsg.startsWith("Hata") ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {saveMsg}
                  </span>
                )}
              </div>
              <p className="w-full text-xs text-gray-400 mt-0.5">
                Haritaya tıklayarak koordinat seçebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-400 text-center">
              Listeden bir kayıt seçin, ardından haritaya tıklayarak koordinat belirleyin.
            </div>
          )}

          {/* Map */}
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 min-h-[400px]">
            <AdminMap
              items={items}
              selectedId={selectedId}
              onMapClick={handleMapClick}
              onMarkerClick={handleMarkerClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
