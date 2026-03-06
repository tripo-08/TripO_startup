import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Plus, Search } from 'lucide-react';

// Ola Maps via window.OlaMaps

const StopsManagement = () => {
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newStop, setNewStop] = useState({ name: '', lat: '', lng: '' });
    const [submitting, setSubmitting] = useState(false);
    const [searching, setSearching] = useState(false);
    const [mapCenter] = useState([73.5, 16.0]); // [lng, lat]
    const [error, setError] = useState('');
    const [mapError, setMapError] = useState('');

    // ✅ Correct backend base URL (Render)
    const API = import.meta.env.VITE_API_URL;
    const OLA_MAPS_API_KEY = import.meta.env.VITE_OLA_MAPS_API_KEY;

    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const olaMapsRef = useRef(null);
    const markersRef = useRef([]);
    const newStopMarkerRef = useRef(null);

    // ================= INIT MAP =================
    useEffect(() => {
        const initMap = () => {
            if (mapInstanceRef.current || !mapContainerRef.current) return true;

            if (!OLA_MAPS_API_KEY) {
                setMapError('Missing VITE_OLA_MAPS_API_KEY in deployment environment.');
                return false;
            }

            const OlaMaps = window.OlaMaps;
            if (!OlaMaps) return false;

            setMapError('');
            olaMapsRef.current = new OlaMaps({ apiKey: OLA_MAPS_API_KEY });

            const myMap = olaMapsRef.current.init({
                style: "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
                container: mapContainerRef.current,
                center: mapCenter,
                zoom: 9
            });

            mapInstanceRef.current = myMap;
            myMap.on('click', handleMapClick);
            return true;
        };

        if (initMap()) return;

        const scriptId = 'olamaps-web-sdk';
        let pollTimer = null;
        let sdkScript = document.getElementById(scriptId);

        if (!sdkScript) {
            sdkScript = document.createElement('script');
            sdkScript.id = scriptId;
            sdkScript.src = 'https://unpkg.com/olamaps-web-sdk@latest/dist/olamaps-web-sdk.umd.js';
            sdkScript.async = true;
            sdkScript.onload = () => initMap();
            sdkScript.onerror = () => setMapError('Unable to load Ola Maps SDK from CDN.');
            document.head.appendChild(sdkScript);
        } else {
            pollTimer = setInterval(() => {
                if (initMap()) {
                    clearInterval(pollTimer);
                    pollTimer = null;
                }
            }, 250);
        }

        return () => {
            if (pollTimer) clearInterval(pollTimer);
            if (mapInstanceRef.current?.off) {
                mapInstanceRef.current.off('click', handleMapClick);
            }
        };
    }, [mapCenter, OLA_MAPS_API_KEY]);

    // ================= FETCH STOPS =================
    const fetchStops = async () => {
        try {
            const token = localStorage.getItem('adminToken');

            const response = await fetch(`${API}/api/admin/stops`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setStops(data.data);
            }
        } catch (err) {
            console.error('Error fetching stops:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStops();
    }, []);

    // ================= ADD STOP =================
    const handleAddStop = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const lat = Number(newStop.lat);
            const lng = Number(newStop.lng);

            if (!newStop.name?.trim()) {
                setError('Stop name is required');
                setSubmitting(false);
                return;
            }

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                setError('Please provide valid latitude and longitude');
                setSubmitting(false);
                return;
            }

            const token = localStorage.getItem('adminToken');

            const response = await fetch(`${API}/api/admin/stops`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newStop.name,
                    lat,
                    lng
                })
            });

            const data = await response.json();

            if (data.success) {
                fetchStops();
                setNewStop({ name: '', lat: '', lng: '' });
            } else {
                setError(data.error?.message || 'Failed to add stop');
            }

        } catch {
            setError('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    // ================= DELETE STOP =================
    const handleDeleteStop = async (id) => {
        if (!window.confirm('Are you sure you want to delete this stop?')) return;

        try {
            const token = localStorage.getItem('adminToken');

            await fetch(`${API}/api/admin/stops/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setStops(stops.filter(stop => stop.id !== id));

        } catch {
            alert('Failed to delete stop');
        }
    };

    // ================= SEARCH LOCATION =================
    const handleSearchLocation = async () => {

        if (!newStop.name || newStop.name.length < 3) {
            setError('Please enter at least 3 characters to search.');
            return;
        }

        setSearching(true);
        setError('');

        try {
            const response = await fetch(
                `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(newStop.name)}&api_key=${OLA_MAPS_API_KEY}`
            );

            const data = await response.json();

            if (data.status === 'ok' && data.geocodingResults?.length > 0) {

                const location = data.geocodingResults[0].geometry.location;

                const lat = location.lat;
                const lng = location.lng;

                setNewStop(prev => ({
                    ...prev,
                    lat: lat.toFixed(6),
                    lng: lng.toFixed(6)
                }));

                mapInstanceRef.current?.flyTo({
                    center: [lng, lat],
                    zoom: 14
                });

                updateNewStopMarker(lat, lng);

            } else {
                setError('Location not found.');
            }

        } catch {
            setError('Error searching location.');
        }

        setSearching(false);
    };

    // ================= LOCATE VIA LAT/LNG =================
    const handleLocateByCoordinates = () => {
        setError('');

        const lat = Number(newStop.lat);
        const lng = Number(newStop.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            setError('Please enter valid latitude and longitude');
            return;
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            setError('Latitude must be [-90, 90] and longitude must be [-180, 180]');
            return;
        }

        mapInstanceRef.current?.flyTo({
            center: [lng, lat],
            zoom: 14
        });
        updateNewStopMarker(lat, lng);
    };

    // ================= MAP CLICK =================
    const handleMapClick = (e) => {

        const { lng, lat } = e.lngLat;

        setNewStop(prev => ({
            ...prev,
            lat: lat.toFixed(6),
            lng: lng.toFixed(6)
        }));

        updateNewStopMarker(lat, lng);
    };

    // ================= NEW STOP MARKER =================
    const updateNewStopMarker = (lat, lng) => {

        if (!mapInstanceRef.current || !olaMapsRef.current) return;

        if (newStopMarkerRef.current) {

            newStopMarkerRef.current.setLngLat([lng, lat]);

        } else {

            newStopMarkerRef.current =
                olaMapsRef.current
                    .addMarker({ color: 'red', anchor: 'bottom' })
                    .setLngLat([lng, lat])
                    .addTo(mapInstanceRef.current);
        }
    };

    // ================= EXISTING MARKERS =================
    useEffect(() => {

        if (!mapInstanceRef.current || !olaMapsRef.current) return;

        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        stops.forEach(stop => {

            const lat = Number(stop.lat);
            const lng = Number(stop.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const marker =
                olaMapsRef.current
                    .addMarker({ color: 'blue', anchor: 'bottom' })
                    .setLngLat([lng, lat])
                    .addTo(mapInstanceRef.current);

            markersRef.current.push(marker);
        });

    }, [stops]);

    // ================= UI =================
    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6">

            {/* LEFT PANEL */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">

                {/* ADD FORM */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">

                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Plus className="text-blue-500"/> Add New Stop
                    </h2>

                    {error &&
                        <div className="text-red-400 text-sm mb-4">
                            {error}
                        </div>
                    }

                    <form onSubmit={handleAddStop} className="space-y-4">

                        <input
                            value={newStop.name}
                            onChange={e =>
                                setNewStop({...newStop, name: e.target.value})
                            }
                            placeholder="Stop name"
                            className="w-full p-2 bg-gray-700 text-white"
                        />

                        <button
                            type="button"
                            onClick={handleSearchLocation}
                            disabled={searching}
                            className="bg-gray-600 p-2"
                        >
                            <Search size={18}/>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                step="any"
                                value={newStop.lat}
                                onChange={e =>
                                    setNewStop({ ...newStop, lat: e.target.value })
                                }
                                placeholder="Latitude"
                                className="w-full p-2 bg-gray-700 text-white"
                            />
                            <input
                                type="number"
                                step="any"
                                value={newStop.lng}
                                onChange={e =>
                                    setNewStop({ ...newStop, lng: e.target.value })
                                }
                                placeholder="Longitude"
                                className="w-full p-2 bg-gray-700 text-white"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleLocateByCoordinates}
                            className="bg-indigo-600 p-2 w-full"
                        >
                            Locate on Map
                        </button>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-blue-600 p-2 w-full"
                        >
                            Add Stop
                        </button>

                    </form>
                </div>

                {/* LIST */}
                <div className="bg-gray-800 p-4">

                    {stops.map(stop => (
                        <div key={stop.id} className="flex justify-between">

                            {stop.name}

                            <button onClick={() =>
                                handleDeleteStop(stop.id)
                            }>
                                <Trash2 size={16}/>
                            </button>

                        </div>
                    ))}

                </div>

            </div>

            {/* MAP */}
            <div className="flex-1">
                {mapError && (
                    <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                        {mapError}
                    </div>
                )}

                <div
                    ref={mapContainerRef}
                    className="w-full rounded-lg border border-gray-700"
                    style={{ height: '100%', minHeight: '420px' }}
                />

            </div>

        </div>
    );
};

export default StopsManagement;
