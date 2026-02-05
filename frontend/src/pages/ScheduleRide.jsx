import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { ArrowLeft, MapPin, Navigation, Calendar, Clock, Briefcase, Users } from 'lucide-react';
import { authService } from '../services/auth';
import { api } from '../services/api';

const libraries = ['places'];

export default function ScheduleRide() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Route, 2: Details

    // Google Maps Loader
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
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

    // User/Provider Data
    const [providerProfile, setProviderProfile] = useState(null);
    const [vehicleType, setVehicleType] = useState('');

    // Vehicle State
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');

    // Route State
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [sourceCoords, setSourceCoords] = useState(null);
    const [destCoords, setDestCoords] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

    // Address Suggestions
    const [sourceSuggestions, setSourceSuggestions] = useState([]);
    const [destSuggestions, setDestSuggestions] = useState([]);

    // Ride Details State
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        seats: 1,
        priceBySeat: 0,
        priceTotal: 0,
        luggageAllowed: false,
        luggageCapacity: 0,
        description: ''
    });

    useEffect(() => {
        const init = async () => {
            const user = await authService.waitForAuth();
            if (user) {
                fetchProviderProfile();
                fetchVehicles();
            } else {
                navigate('/login/provider');
            }
        };
        init();
    }, []);

    const fetchProviderProfile = async () => {
        try {
            const response = await authService.getProfile();
            if (response.data && response.data.user) {
                setProviderProfile(response.data.user);
            }
        } catch (error) {
            console.error('Failed to fetch profile', error);
        }
    };

    const fetchVehicles = async () => {
        try {
            const token = await authService.getToken();
            const response = await api.get('/rides/provider/available-vehicles', token);
            const vehicleList = Array.isArray(response) ? response : (response.data || []);

            setVehicles(vehicleList);

            if (vehicleList.length > 0) {
                const defaultVehicle = vehicleList.find(v => v.status === 'active') || vehicleList[0];
                setSelectedVehicleId(defaultVehicle._id);
                updateVehicleType(defaultVehicle);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
        }
    };

    const updateVehicleType = (vehicle) => {
        if (!vehicle) return;
        const make = vehicle.make || vehicle.details?.make || '';
        const model = vehicle.model || vehicle.details?.model || '';
        const seats = vehicle.seats || vehicle.details?.seats;

        const type = (make + ' ' + model).toLowerCase();
        setVehicleType(type);
        setFormData(prev => ({
            ...prev,
            seats: seats ? Math.max(1, seats - 1) : 1
        }));
    };

    const handleVehicleChange = (e) => {
        const vId = e.target.value;
        setSelectedVehicleId(vId);
        const vehicle = vehicles.find(v => v._id === vId);
        updateVehicleType(vehicle);
    };

    // Admin Stops State
    const [adminStops, setAdminStops] = useState([]);

    useEffect(() => {
        const loadStops = async () => {
            try {
                const response = await api.get('/stops');
                const stopList = Array.isArray(response) ? response : (response.data || []);
                setAdminStops(stopList);
            } catch (err) {
                console.error("Failed to load admin stops", err);
            }
        };
        loadStops();
    }, []);

    // Filter Admin Stops
    const searchAddress = (query, setSuggestions) => {
        if (!query) {
            setSuggestions([]);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const filtered = adminStops.filter(stop =>
            stop.name.toLowerCase().includes(lowerQuery)
        );
        setSuggestions(filtered);
    };

    const handleSelectLocation = (item, type) => {
        const coords = { lat: parseFloat(item.lat), lon: parseFloat(item.lng) };

        const locationData = {
            address: item.name,
            city: item.name,
            ...coords
        };

        if (type === 'source') {
            setSource(item.name);
            setSourceCoords(locationData);
            setSourceSuggestions([]);
        } else {
            setDestination(item.name);
            setDestCoords(locationData);
            setDestSuggestions([]);
        }
    };

    const processGoogleRoute = (route) => {
        const leg = route.legs[0];

        // Extract basic info
        const distance = leg.distance.value; // meters
        const duration = leg.duration.value; // seconds
        const viaName = route.summary;

        // Extract Stops
        // Google steps are navigation instructions. We can try to extract "Major" turns?
        // For now, let's keep it simple and just show Start/End in the timeline unless we parse complex steps
        const usefulStops = [];

        usefulStops.push({
            name: leg.start_address.split(',')[0],
            timeOffset: 0,
            distance: 0
        });

        // Simplified stop logic for Google Maps
        // We could iterate `leg.steps` but they are very granular "Turn right onto X"
        // Let's just add the destination for now, or maybe only very long steps?

        usefulStops.push({
            name: leg.end_address.split(',')[0],
            timeOffset: duration,
            distance: distance
        });

        return {
            ...route,
            distance, // Normalized prop name
            duration, // Normalized prop name
            via: { name: viaName },
            stops: usefulStops,
            // Decode overview_poly for rendering if not already available in a friendly format
            // route.overview_path is available in the object returned by JS API
            path: route.overview_path
        };
    };

    // Routing (Google)
    useEffect(() => {
        if (isLoaded && sourceCoords && destCoords) {
            const directionsService = new window.google.maps.DirectionsService();

            directionsService.route({
                origin: { lat: sourceCoords.lat, lng: sourceCoords.lon },
                destination: { lat: destCoords.lat, lng: destCoords.lon },
                travelMode: window.google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true
            }, (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    const processed = result.routes.map(processGoogleRoute);
                    setRoutes(processed);
                    setSelectedRouteIndex(0);

                    // Fit bounds
                    if (mapRef.current && result.routes[0] && result.routes[0].bounds) {
                        mapRef.current.fitBounds(result.routes[0].bounds);
                    }
                } else {
                    console.error(`error fetching directions ${status}`);
                    alert("Failed to fetch routes. Please verify location coordinates.");
                }
            });
        }
    }, [isLoaded, sourceCoords, destCoords]);


    const handleSubmit = async () => {
        if (!source || !destination || !formData.date || !formData.time || !selectedVehicleId) {
            alert("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const currentRoute = routes[selectedRouteIndex];

            // Encode geometry for backend if needed. 
            // OSRM sent a GeoJSON or Polyline string. 
            // Google gives an array of LatLngs in overview_path.
            // We should probably convert this to GeoJSON LineString format for consistency with backend expectation
            // if the backend uses it for spatial queries or display.
            const coordinates = currentRoute.path.map(p => [p.lng(), p.lat()]); // GeoJSON is [lng, lat]

            const payload = {
                origin: {
                    address: source,
                    city: sourceCoords.city,
                    lat: sourceCoords.lat,
                    lng: sourceCoords.lon
                },
                destination: {
                    address: destination,
                    city: destCoords.city,
                    lat: destCoords.lat,
                    lng: destCoords.lon
                },
                vehicleId: selectedVehicleId,
                departureDate: formData.date,
                departureTime: formData.time,
                totalSeats: parseInt(formData.seats),
                pricePerSeat: parseFloat(formData.priceBySeat),
                preferences: {
                    luggageAllowed: formData.luggageAllowed,
                    luggageCapacity: parseInt(formData.luggageCapacity),
                    description: formData.description
                },
                route: {
                    distance: currentRoute.distance,
                    duration: currentRoute.duration,
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates
                    }
                }
            };

            const token = await authService.getToken();
            await api.post('/rides', payload, token);
            alert("Ride Scheduled Successfully!");
            navigate('/provider-home');
        } catch (error) {
            console.error("Failed to schedule ride:", error);
            const errorMessage = error.response?.data?.error || error.message || "Failed to schedule ride.";

            if (errorMessage.includes('Vehicle not found')) {
                alert("Selected vehicle is invalid or not verified.");
            } else {
                alert(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const isBike = vehicleType.includes('bike') || vehicleType.includes('scooter') || vehicleType.includes('motorcycle');

    if (!isLoaded) return <div className="flex justify-center items-center h-screen">Loading Maps...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={20} className="text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">{step === 1 ? 'Plan Route' : 'Ride Details'}</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative overflow-auto">
                {step === 1 ? (
                    <div className="flex flex-col h-full">
                        {/* Map Area */}
                        <div className="flex-1 relative bg-gray-200 min-h-[500px] z-0">
                            <GoogleMap
                                mapContainerStyle={{ width: '100%', height: '100%', minHeight: '500px' }}
                                center={{ lat: 18.5204, lng: 73.8567 }}
                                zoom={10}
                                onLoad={onLoad}
                                onUnmount={onUnmount}
                                options={{
                                    mapTypeControl: false,
                                    streetViewControl: false,
                                    fullscreenControl: false
                                }}
                            >
                                {sourceCoords && <Marker position={{ lat: sourceCoords.lat, lng: sourceCoords.lon }} />}
                                {destCoords && <Marker position={{ lat: destCoords.lat, lng: destCoords.lon }} />}

                                {adminStops.map(stop => (
                                    <Marker
                                        key={stop.id}
                                        position={{ lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) }}
                                        opacity={0.6}
                                        title={stop.name}
                                    />
                                ))}

                                {routes.map((route, idx) => {
                                    const isSelected = selectedRouteIndex === idx;
                                    return (
                                        <Polyline
                                            key={idx}
                                            path={route.path}
                                            options={{
                                                strokeColor: isSelected ? "#2563EB" : "#9CA3AF",
                                                strokeWeight: isSelected ? 6 : 4,
                                                strokeOpacity: isSelected ? 1 : 0.6,
                                                zIndex: isSelected ? 100 : 1,
                                                clickable: true
                                            }}
                                            onClick={() => setSelectedRouteIndex(idx)}
                                        />
                                    );
                                })}
                            </GoogleMap>
                        </div>

                        {/* Search & Route Selection Panel */}
                        <div className="bg-white p-4 rounded-t-2xl shadow-lg -mt-4 z-20 relative">
                            <div className="space-y-4 mb-6">
                                {/* From Input */}
                                <div className="relative">
                                    <div className="absolute left-3 top-3 text-blue-600"><MapPin size={18} /></div>
                                    <input
                                        type="text"
                                        placeholder="From (Start Location)"
                                        value={source}
                                        onChange={(e) => {
                                            setSource(e.target.value);
                                            searchAddress(e.target.value, setSourceSuggestions);
                                        }}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {sourceSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full bg-white shadow-xl rounded-b-xl mt-1 border border-gray-100 max-h-48 overflow-y-auto">
                                            {sourceSuggestions.map((item, idx) => (
                                                <div key={idx} onClick={() => handleSelectLocation(item, 'source')} className="p-3 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0">
                                                    {item.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* To Input */}
                                <div className="relative">
                                    <div className="absolute left-3 top-3 text-red-600"><MapPin size={18} /></div>
                                    <input
                                        type="text"
                                        placeholder="To (Destination)"
                                        value={destination}
                                        onChange={(e) => {
                                            setDestination(e.target.value);
                                            searchAddress(e.target.value, setDestSuggestions);
                                        }}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {destSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full bg-white shadow-xl rounded-b-xl mt-1 border border-gray-100 max-h-48 overflow-y-auto">
                                            {destSuggestions.map((item, idx) => (
                                                <div key={idx} onClick={() => handleSelectLocation(item, 'destination')} className="p-3 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0">
                                                    <MapPin size={14} className="inline mr-2 text-gray-400" />
                                                    {item.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Route Selection */}
                            {routes.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    <h3 className="text-sm font-bold text-gray-900">Select Route ({routes.length} Found)</h3>
                                    {routes.map((route, idx) => {
                                        const isFastest = idx === routes.reduce((iMin, x, i, arr) => x.duration < arr[iMin].duration ? i : iMin, 0);
                                        const isShortest = idx === routes.reduce((iMin, x, i, arr) => x.distance < arr[iMin].distance ? i : iMin, 0);

                                        const hrs = Math.floor(route.duration / 3600);
                                        const mins = Math.round((route.duration % 3600) / 60);
                                        const timeString = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedRouteIndex(idx)}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRouteIndex === idx ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-full ${selectedRouteIndex === idx ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                            <Navigation size={16} />
                                                        </div>
                                                        <span className={`font-bold text-sm ${selectedRouteIndex === idx ? 'text-blue-900' : 'text-gray-900'}`}>
                                                            {route.via?.name ? `Via ${route.via.name}` : `Route ${idx + 1}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {isFastest && <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">FASTEST</span>}
                                                        {isShortest && <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">SHORTEST</span>}
                                                    </div>
                                                </div>

                                                <div className="flex items-baseline gap-4 ml-9 mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-medium">Distance</p>
                                                        <p className="text-sm font-bold text-gray-700">{(route.distance / 1000).toFixed(1)} km</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-gray-200"></div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-medium">Est. Time</p>
                                                        <p className={`text-sm font-bold ${isFastest ? 'text-green-600' : 'text-gray-700'}`}>
                                                            {timeString}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <button
                                onClick={() => setStep(2)}
                                disabled={routes.length === 0}
                                className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${routes.length > 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                Continue to Details
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 space-y-6 max-w-lg mx-auto">
                        {/* Vehicle Selection */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase size={20} className="text-blue-600" />
                                Vehicle
                            </h2>
                            {vehicles.length > 0 ? (
                                <select
                                    value={selectedVehicleId}
                                    onChange={handleVehicleChange}
                                    className="w-full p-2.5 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    {vehicles.map(v => (
                                        <option key={v.id || v._id} value={v.id || v._id}>
                                            {v.make || v.details?.make} {v.model || v.details?.model} ({v.licensePlate || v.details?.licensePlate})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-red-500 text-sm">No confirmed vehicles found. Please add a vehicle first.</p>
                            )}
                        </div>

                        {/* Ride Details Form */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase size={20} className="text-blue-600" />
                                Ride Details
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Date</label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Time</label>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                Passengers & Pricing
                            </h2>

                            {/* Seat Count - Only if NOT a bike */}
                            {!isBike ? (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Available Seats</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, seats: Math.max(1, p.seats - 1) }))}
                                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200"
                                        >-</button>
                                        <span className="text-xl font-bold text-gray-900 w-8 text-center">{formData.seats}</span>
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, seats: Math.min(10, p.seats + 1) }))}
                                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200"
                                        >+</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-yellow-50 text-yellow-700 text-xs rounded-lg">
                                    Bike rides allow 1 passenger by default.
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Price per Seat (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 font-bold text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.priceBySeat}
                                        onChange={(e) => setFormData({ ...formData, priceBySeat: e.target.value })}
                                        className="w-full pl-8 pr-3 py-2.5 bg-gray-50 rounded-lg text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Recommended: ₹{(routes[selectedRouteIndex]?.distance / 1000 * 5).toFixed(0)} based on distance</p>
                            </div>
                        </div>

                        {/* Luggage - Only if NOT a bike */}
                        {!isBike && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Briefcase size={20} className="text-blue-600" />
                                        Luggage
                                    </h2>
                                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input
                                            type="checkbox"
                                            name="toggle"
                                            id="toggle"
                                            checked={formData.luggageAllowed}
                                            onChange={(e) => setFormData({ ...formData, luggageAllowed: e.target.checked })}
                                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                            style={{ right: formData.luggageAllowed ? '0' : 'auto', left: formData.luggageAllowed ? 'auto' : '0' }}
                                        />
                                        <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.luggageAllowed ? 'bg-green-400' : 'bg-gray-300'}`}></label>
                                    </div>
                                </div>

                                {formData.luggageAllowed && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Max Weight (kg)</label>
                                        <input
                                            type="number"
                                            placeholder="10"
                                            value={formData.luggageCapacity}
                                            onChange={(e) => setFormData({ ...formData, luggageCapacity: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`w-full bg-blue-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-800 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Publishing...' : 'Publish Ride'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Add simple switch CSS via style tag
const style = document.createElement('style');
style.textContent = `
.toggle-checkbox:checked {
  right: 0;
  border-color: #68D391;
}
.toggle-checkbox {
  right: auto;
  left: 0;
  transition: all 0.3s;
}
`;
document.head.appendChild(style);
