import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, Users, DollarSign, Car, Route, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { getAuth } from "firebase/auth";

const CreateRideFromRoute = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    
    // Form data
    const [formData, setFormData] = useState({
        sourceName: '',
        destinationName: '',
        selectedRoute: null,
        selectedStops: [],
        rideDate: '',
        rideTime: '',
        availableSeats: '',
        pricePerSeat: '',
        selectedVehicle: null
    });
    
    // Data states
    const [predefinedRoutes, setPredefinedRoutes] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [userProfile, setUserProfile] = useState(null);

    // Authentication check
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                setUser({
                    displayName: firebaseUser.displayName || 'Provider',
                    photoURL: firebaseUser.photoURL,
                    uid: firebaseUser.uid
                });
                setAuthLoading(false);
            } else {
                navigate('/login/provider');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (user && !authLoading) {
            fetchUserProfile();
            fetchVehicles();
        }
    }, [user, authLoading]);

    const fetchUserProfile = async () => {
        try {
            const response = await authService.getProfile();
            if (response.data?.user) {
                setUserProfile(response.data.user);
            }
        } catch (err) {
            console.error('Failed to fetch user profile:', err);
        }
    };

    const fetchVehicles = async () => {
        try {
            const auth = getAuth();
            const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            
            if (!token) {
                setError('Authentication required');
                return;
            }

            const response = await api.get('/vehicles', token);
            if (response.success) {
                setVehicles(response.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch vehicles:', err);
            setError('Failed to load your vehicles');
        }
    };

    const searchPredefinedRoutes = async () => {
        if (!formData.sourceName.trim() || !formData.destinationName.trim()) {
            setError('Please enter both source and destination');
            return;
        }

        if (formData.sourceName.trim().toLowerCase() === formData.destinationName.trim().toLowerCase()) {
            setError('Source and destination cannot be the same');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const auth = getAuth();
            const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            
            if (!token) {
                setError('Authentication required');
                setLoading(false);
                return;
            }

            const queryParams = new URLSearchParams({
                source: formData.sourceName.trim(),
                destination: formData.destinationName.trim()
            });

            const response = await api.get(`/routes/search?${queryParams}`, token);

            if (response.success && response.data?.length > 0) {
                setPredefinedRoutes(response.data);
                setCurrentStep(2);
            } else {
                setError('No predefined route found between entered Source and Destination');
                setPredefinedRoutes([]);
            }
        } catch (err) {
            console.error('Route search error:', err);
            setError('Failed to search routes. Please try again.');
            setPredefinedRoutes([]);
        } finally {
            setLoading(false);
        }
    };

    const selectRoute = (route) => {
        setFormData(prev => ({
            ...prev,
            selectedRoute: route,
            selectedStops: route.stops || [] // Initially select all intermediate stops
        }));
        setCurrentStep(3);
    };

    const toggleStopSelection = (stopIndex) => {
        setFormData(prev => ({
            ...prev,
            selectedStops: prev.selectedStops.map((stop, index) => 
                index === stopIndex ? { ...stop, selected: !stop.selected } : stop
            )
        }));
    };

    const validateRideDetails = () => {
        const { rideDate, rideTime, availableSeats, pricePerSeat } = formData;
        
        if (!rideDate || !rideTime || !availableSeats || !pricePerSeat) {
            setError('Please fill in all ride details');
            return false;
        }

        const selectedDate = new Date(rideDate + 'T' + rideTime);
        if (selectedDate <= new Date()) {
            setError('Ride date and time must be in the future');
            return false;
        }

        if (parseInt(availableSeats) <= 0) {
            setError('Available seats must be greater than 0');
            return false;
        }

        if (parseFloat(pricePerSeat) <= 0) {
            setError('Price per seat must be greater than 0');
            return false;
        }

        return true;
    };

    const validateVehicleSelection = () => {
        if (!formData.selectedVehicle) {
            setError('Please select a vehicle');
            return false;
        }

        const vehicle = vehicles.find(v => v.id === formData.selectedVehicle);
        if (vehicle && parseInt(formData.availableSeats) > vehicle.details?.seats) {
            setError(`Selected vehicle can only accommodate ${vehicle.details?.seats} passengers`);
            return false;
        }

        return true;
    };

    const handleNext = () => {
        setError('');
        
        if (currentStep === 1) {
            searchPredefinedRoutes();
        } else if (currentStep === 3) {
            if (validateRideDetails()) {
                setCurrentStep(4);
            }
        } else if (currentStep === 4) {
            if (validateVehicleSelection()) {
                setCurrentStep(5);
            }
        }
    };

    const handleCreateRide = async () => {
        setLoading(true);
        setError('');

        try {
            const auth = getAuth();
            const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            
            if (!token) {
                setError('Authentication required');
                setLoading(false);
                return;
            }

            const selectedVehicle = vehicles.find(v => v.id === formData.selectedVehicle);
            const selectedStopsData = formData.selectedStops.filter(stop => stop.selected !== false);

            const rideData = {
                source: formData.selectedRoute.source,
                destination: formData.selectedRoute.destination,
                intermediateStops: selectedStopsData,
                rideDate: formData.rideDate,
                rideTime: formData.rideTime,
                availableSeats: parseInt(formData.availableSeats),
                pricePerSeat: parseFloat(formData.pricePerSeat),
                vehicle: {
                    id: selectedVehicle.id,
                    make: selectedVehicle.details?.make,
                    model: selectedVehicle.details?.model,
                    licensePlate: selectedVehicle.details?.licensePlate,
                    seats: selectedVehicle.details?.seats,
                    fuelType: selectedVehicle.details?.fuelType,
                    transmission: selectedVehicle.details?.transmission
                },
                routeId: formData.selectedRoute.id,
                createdFromPredefinedRoute: true
            };

            const response = await api.post('/rides/create-from-route', rideData, token);
            
            if (response.success) {
                setSuccess('Ride created successfully!');
                setTimeout(() => {
                    navigate('/provider-home');
                }, 2000);
            } else {
                setError(response.error?.message || 'Failed to create ride');
            }
        } catch (err) {
            console.error('Create ride error:', err);
            setError('Failed to create ride. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <Route className="mx-auto mb-4 text-blue-600" size={48} />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Predefined Route</h2>
                            <p className="text-gray-600">Enter your source and destination to find available predefined routes</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-green-500" size={20} />
                                    <input
                                        type="text"
                                        value={formData.sourceName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sourceName: e.target.value }))}
                                        placeholder="Enter source location"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-red-500" size={20} />
                                    <input
                                        type="text"
                                        value={formData.destinationName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, destinationName: e.target.value }))}
                                        placeholder="Enter destination location"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Route</h2>
                            <p className="text-gray-600">Choose from available predefined routes</p>
                        </div>

                        <div className="space-y-4">
                            {predefinedRoutes.map((route) => (
                                <div
                                    key={route.id}
                                    onClick={() => selectRoute(route)}
                                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <MapPin size={16} className="text-green-500" />
                                                <span className="font-medium">{route.source.name}</span>
                                                <span className="text-gray-400">→</span>
                                                <MapPin size={16} className="text-red-500" />
                                                <span className="font-medium">{route.destination.name}</span>
                                            </div>
                                            
                                            {route.stops && route.stops.length > 0 && (
                                                <div className="text-sm text-gray-600">
                                                    <span className="font-medium">Stops: </span>
                                                    {route.stops.map((stop, index) => (
                                                        <span key={stop.stopId}>
                                                            {stop.name}
                                                            {index < route.stops.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight className="text-gray-400" size={20} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Customize Route & Ride Details</h2>
                            <p className="text-gray-600">Select stops and set ride details</p>
                        </div>

                        {/* Selected Route Display */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-medium text-blue-900 mb-2">Selected Route</h3>
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-green-500" />
                                <span>{formData.selectedRoute?.source.name}</span>
                                <span className="text-gray-400">→</span>
                                <MapPin size={16} className="text-red-500" />
                                <span>{formData.selectedRoute?.destination.name}</span>
                            </div>
                        </div>

                        {/* Intermediate Stops Selection */}
                        {formData.selectedStops.length > 0 && (
                            <div>
                                <h3 className="font-medium text-gray-900 mb-3">Intermediate Stops (Optional Selection)</h3>
                                <div className="space-y-2">
                                    {formData.selectedStops.map((stop, index) => (
                                        <label key={stop.stopId} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={stop.selected !== false}
                                                onChange={() => toggleStopSelection(index)}
                                                className="rounded text-blue-600"
                                            />
                                            <span className="text-sm text-gray-600">{index + 1}.</span>
                                            <span className="flex-1">{stop.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    You can select partial route by choosing specific stops
                                </p>
                            </div>
                        )}

                        {/* Ride Details */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-900">Ride Details</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
                                        <input
                                            type="date"
                                            value={formData.rideDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, rideDate: e.target.value }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-3 text-gray-400" size={20} />
                                        <input
                                            type="time"
                                            value={formData.rideTime}
                                            onChange={(e) => setFormData(prev => ({ ...prev, rideTime: e.target.value }))}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Available Seats</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-3 text-gray-400" size={20} />
                                        <input
                                            type="number"
                                            value={formData.availableSeats}
                                            onChange={(e) => setFormData(prev => ({ ...prev, availableSeats: e.target.value }))}
                                            placeholder="Enter seats"
                                            min="1"
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Price per Seat (₹)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 text-gray-400" size={20} />
                                        <input
                                            type="number"
                                            value={formData.pricePerSeat}
                                            onChange={(e) => setFormData(prev => ({ ...prev, pricePerSeat: e.target.value }))}
                                            placeholder="Enter price"
                                            min="1"
                                            step="0.01"
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Vehicle</h2>
                            <p className="text-gray-600">Choose a vehicle for this ride</p>
                        </div>

                        {vehicles.length === 0 ? (
                            <div className="text-center py-8">
                                <Car className="mx-auto mb-4 text-gray-400" size={48} />
                                <p className="text-gray-600 mb-4">No vehicles found</p>
                                <button
                                    onClick={() => navigate('/vehicle-information')}
                                    className="text-blue-600 font-medium hover:underline"
                                >
                                    Add a vehicle first
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {vehicles.map((vehicle) => (
                                    <div
                                        key={vehicle.id}
                                        onClick={() => setFormData(prev => ({ ...prev, selectedVehicle: vehicle.id }))}
                                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                            formData.selectedVehicle === vehicle.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Car className="text-gray-600" size={24} />
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{vehicle.details?.make} {vehicle.details?.model}</h3>
                                                    <p className="text-sm text-gray-600">{vehicle.details?.fuelType} • {vehicle.details?.licensePlate}</p>
                                                    <p className="text-sm text-gray-500">Capacity: {vehicle.details?.seats} passengers</p>
                                                </div>
                                            </div>
                                            {formData.selectedVehicle === vehicle.id && (
                                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {parseInt(formData.availableSeats) > vehicle.details?.seats && (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex items-center gap-2">
                                                <AlertCircle size={16} />
                                                <span>This vehicle cannot accommodate {formData.availableSeats} seats (max: {vehicle.details?.seats})</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 5:
                const selectedVehicle = vehicles.find(v => v.id === formData.selectedVehicle);
                const selectedStopsCount = formData.selectedStops.filter(stop => stop.selected !== false).length;
                const totalEarnings = parseFloat(formData.pricePerSeat) * parseInt(formData.availableSeats);

                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Ride Details</h2>
                            <p className="text-gray-600">Review and confirm your ride</p>
                        </div>

                        <div className="space-y-4">
                            {/* Route Summary */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-3">Route</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={16} className="text-green-500" />
                                    <span>{formData.selectedRoute?.source.name}</span>
                                    <span className="text-gray-400">→</span>
                                    <MapPin size={16} className="text-red-500" />
                                    <span>{formData.selectedRoute?.destination.name}</span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {selectedStopsCount} intermediate stops selected
                                </p>
                            </div>

                            {/* Ride Details Summary */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-3">Ride Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Date & Time:</span>
                                        <p className="font-medium">{new Date(formData.rideDate + 'T' + formData.rideTime).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Available Seats:</span>
                                        <p className="font-medium">{formData.availableSeats}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Price per Seat:</span>
                                        <p className="font-medium">₹{formData.pricePerSeat}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Max Earnings:</span>
                                        <p className="font-medium text-green-600">₹{totalEarnings}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Summary */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-3">Vehicle</h3>
                                <div className="flex items-center gap-3">
                                    <Car className="text-gray-600" size={24} />
                                    <div>
                                        <p className="font-medium">{selectedVehicle?.details?.make} {selectedVehicle?.details?.model}</p>
                                        <p className="text-sm text-gray-600">{selectedVehicle?.details?.fuelType} • {selectedVehicle?.details?.licensePlate}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Show loading while checking authentication */}
            {authLoading ? (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/provider-home')}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <ArrowLeft size={24} className="text-gray-700" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Create Ride from Route</h1>
                                <p className="text-sm text-gray-600">Step {currentStep} of 5</p>
                            </div>
                        </div>
                    </header>

            {/* Progress Bar */}
            <div className="bg-white px-4 pb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStep / 5) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="text-red-500" size={20} />
                        <span className="text-red-700">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-green-700">{success}</span>
                    </div>
                )}

                <div className="bg-white rounded-lg p-6">
                    {renderStepContent()}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-4">
                    {currentStep > 1 && (
                        <button
                            onClick={() => setCurrentStep(currentStep - 1)}
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                        >
                            Back
                        </button>
                    )}
                    
                    {currentStep < 5 ? (
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Next'}
                        </button>
                    ) : (
                        <button
                            onClick={handleCreateRide}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Ride'}
                        </button>
                    )}
                </div>
            </div>
            </>
            )}
        </div>
    );
};

export default CreateRideFromRoute;