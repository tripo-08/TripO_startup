import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Trash2, Plus, Search } from 'lucide-react';

const libraries = ['places'];

const StopsManagement = () => {
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newStop, setNewStop] = useState({ name: '', lat: '', lng: '' });
    const [submitting, setSubmitting] = useState(false);
    const [searching, setSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState({ lat: 16.0, lng: 73.5 }); // Default
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    // Google Maps Loader
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script-admin',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries
    });

    const mapRef = useRef(null);

    const onLoad = useCallback(function callback(map) {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(function callback(map) {
        mapRef.current = null;
    }, []);

    const fetchStops = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/stops`, {
                headers: { 'Authorization': `Bearer ${token}` }
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

    const handleAddStop = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/stops`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newStop)
            });

            const data = await response.json();
            if (data.success) {
                fetchStops(); // Refresh list
                setNewStop({ name: '', lat: '', lng: '' });
            } else {
                setError(data.error?.message || 'Failed to add stop');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStop = async (id) => {
        if (!window.confirm('Are you sure you want to delete this stop?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${API_URL}/admin/stops/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStops(stops.filter(stop => stop.id !== id));
        } catch (err) {
            alert('Failed to delete stop');
        }
    };

    const handleSearchLocation = async () => {
        if (!newStop.name || newStop.name.length < 3) {
            setError('Please enter at least 3 characters to search.');
            return;
        }

        setSearching(true);
        setError('');

        if (!isLoaded) return;

        try {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: newStop.name }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    const lat = location.lat();
                    const lng = location.lng();

                    setNewStop(prev => ({
                        ...prev,
                        lat: lat.toFixed(6),
                        lng: lng.toFixed(6)
                    }));
                    setMapCenter({ lat, lng });
                    if (mapRef.current) {
                        mapRef.current.panTo({ lat, lng });
                        mapRef.current.setZoom(14);
                    }
                } else {
                    setError('Location not found. Please try specific coords or click map.');
                }
                setSearching(false);
            });
        } catch (err) {
            console.error("Geocoding error:", err);
            setError('Error searching location.');
            setSearching(false);
        }
    };

    const handleMapClick = (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setNewStop(prev => ({
            ...prev,
            lat: lat.toFixed(6),
            lng: lng.toFixed(6)
        }));
    };

    if (!isLoaded) return <div className="p-10 text-white">Loading Maps...</div>;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6">
            {/* Left Panel: Controls & List */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">

                {/* Add Stop Form */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Plus className="text-blue-500" /> Add New Stop
                    </h2>

                    {error && <div className="text-red-400 text-sm mb-4 bg-red-500/10 p-2 rounded">{error}</div>}

                    <form onSubmit={handleAddStop} className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-400">Stop Name</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newStop.name}
                                    onChange={e => setNewStop({ ...newStop, name: e.target.value })}
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-l px-3 py-2 text-white focus:border-blue-500 outline-none"
                                    placeholder="e.g. Bus Stand, Town Square"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={handleSearchLocation}
                                    disabled={searching}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-r border border-l-0 border-gray-600 transition-colors flex items-center justify-center"
                                    title="Search location on map"
                                >
                                    {searching ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    ) : (
                                        <Search size={18} />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Enter name and click search icon to auto-detect location.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newStop.lat}
                                    onChange={e => setNewStop({ ...newStop, lat: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                                    placeholder="Click on map"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newStop.lng}
                                    onChange={e => setNewStop({ ...newStop, lng: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                                    placeholder="Click on map"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Adding...' : 'Add Stop'}
                        </button>
                    </form>
                </div>

                {/* Stops List */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-700">
                        <h2 className="text-lg font-bold text-white">Existing Stops ({stops.length})</h2>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                        {loading ? (
                            <div className="text-center text-gray-400 py-4">Loading...</div>
                        ) : stops.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">No stops added yet.</div>
                        ) : (
                            <div className="space-y-2">
                                {stops.map(stop => (
                                    <div key={stop.id} className="bg-gray-700/50 p-3 rounded flex justify-between items-center group hover:bg-gray-700 transition-colors">
                                        <div>
                                            <p className="font-semibold text-white text-sm">{stop.name}</p>
                                            <p className="text-xs text-gray-400">{Number(stop.lat).toFixed(4)}, {Number(stop.lng).toFixed(4)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteStop(stop.id)}
                                            className="text-red-400 p-1.5 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Stop"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Map */}
            <div className="w-full lg:w-2/3 bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden relative">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={9}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false
                    }}
                >
                    {/* Existing Stops Markers */}
                    {stops.map(stop => (
                        <Marker
                            key={stop.id}
                            position={{ lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) }}
                            title={stop.name}
                        />
                    ))}

                    {/* Pending New Stop Marker (Preview) */}
                    {newStop.lat && newStop.lng && (
                        <Marker
                            position={{ lat: parseFloat(newStop.lat), lng: parseFloat(newStop.lng) }}
                            opacity={0.6}
                            title="New Stop Location"
                        />
                    )}
                </GoogleMap>

                {/* Overlay Instruction */}
                <div className="absolute top-4 right-4 bg-white/90 text-gray-800 px-3 py-1 rounded shadow text-xs font-semibold z-[1000]">
                    Click map to set location
                </div>
            </div>
        </div>
    );
};

export default StopsManagement;
