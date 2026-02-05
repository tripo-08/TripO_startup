
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    Star,
    Phone,
    MessageCircle,
    Info,
    Share2,
    ShieldCheck
} from 'lucide-react';

export default function RideDetails() {
    const location = useLocation();
    const navigate = useNavigate();

    // Fallback data if no state is passed
    const passedRide = location.state?.ride;

    const ride = {
        id: passedRide?.id || 1,
        source: passedRide?.source || 'Mumbai',
        destination: passedRide?.destination || 'Pune',
        date: passedRide?.date || 'Today',
        time: passedRide?.time || '6:00 AM',
        duration: passedRide?.duration || '3h 30m',

        // Vehicle & Driver
        vehicleName: passedRide?.vehicleModel || 'Swift Dzire or similar',
        vehicleNumber: passedRide?.vehicleNumber || 'MH 12 AB 1234',
        vehicleColor: 'White',
        seatsAvailable: passedRide?.seatsAvailable || 4,
        amenities: ['AC', '4 Seats'],

        driver: {
            name: passedRide?.driver?.name || 'Rajesh Kumar',
            rating: passedRide?.driver?.rating || '4.8',
            verified: true,
            contact: '+91 98765 43210'
        },

        // Pricing
        currency: passedRide?.currency || '₹',
        basePrice: passedRide?.pricePerSeat || 3131.31,
        gst: 156.50, // Mock 5%
        platformFee: 50.00,

        get totalPrice() {
            return (this.basePrice + this.gst + this.platformFee).toFixed(2);
        }
    };

    const handleShareRide = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Ride with ${ride.driver.name}`,
                    text: `Check out this ride from ${ride.source} to ${ride.destination} on ${ride.date} at ${ride.time}.`,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            alert('Share feature is not supported in this browser.');
        }
    };

    const handleBookRide = () => {
        // In a real app, integrate with payment gateway here
        const confirmed = window.confirm(`Confirm booking for ${ride.currency}${ride.pricePerSeat}?`);
        if (confirmed) {
            alert('Booking feature coming soon!');
            // navigate('/booking-success'); // Todo: Implement success page
        }
    };

    return (
        <div className="min-h-screen bg-white pb-36 font-sans text-gray-900">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 sticky top-0 bg-white z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-900" />
                </button>
                <h1 className="text-xl font-bold">Review ride</h1>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={handleShareRide}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            <div className="px-4 space-y-8">

                {/* 1. Route Section */}
                <div>
                    <h2 className="text-lg font-bold mb-4">One-way trip to {ride.destination.split(' ')[0]}</h2>
                    <div className="flex gap-4 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[7px] top-6 bottom-8 w-0.5 bg-black"></div>

                        <div className="flex flex-col justify-between h-32 py-2">
                            {/* Source Dot */}
                            <div className="w-4 h-4 rounded-sm border-2 border-black bg-white z-10"></div>
                            {/* Dest Dot */}
                            <div className="w-4 h-4 rounded-sm bg-black z-10"></div>
                        </div>

                        <div className="flex flex-col justify-between h-32 pb-1">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Pick-up</p>
                                <h3 className="font-bold text-base leading-tight">{ride.source}</h3>
                                <p className="text-xs text-gray-400">{ride.time}, {ride.date}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Drop-off</p>
                                <h3 className="font-bold text-base leading-tight">{ride.destination}</h3>
                                <p className="text-xs text-gray-400">~ {ride.duration}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* 2. Vehicle & Driver Details */}
                <div>
                    <h2 className="text-lg font-bold mb-4">Driver & Vehicle</h2>

                    {/* Driver Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                                {ride.driver.name.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <h3 className="font-bold text-base">{ride.driver.name}</h3>
                                    <ShieldCheck size={14} className="text-green-600" />
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Star size={12} className="text-yellow-500" fill="currentColor" />
                                    <span>{ride.driver.rating} Rating</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a href={`sms:${ride.driver.contact}`} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                                <MessageCircle size={20} />
                            </a>
                            <a href={`tel:${ride.driver.contact}`} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                                <Phone size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Vehicle Card */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold text-gray-900">{ride.vehicleName}</p>
                                <p className="text-xs text-gray-500">{ride.vehicleColor} • {ride.amenities.join(' • ')}</p>
                            </div>
                            <img src="https://cdn-icons-png.flaticon.com/512/3202/3202926.png" alt="Car" className="w-12 h-12 object-contain opacity-80" />
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Number Plate</p>
                                <p className="font-mono font-medium text-gray-800">{ride.vehicleNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Seats</p>
                                <p className="font-medium text-gray-800">{ride.seatsAvailable} Available</p>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* 3. Price Breakdown */}
                <div>
                    <h2 className="text-lg font-bold mb-4">Price breakdown</h2>
                    <div className="flex items-center gap-1 text-sm text-gray-500 underline mb-4">
                        <Info size={14} />
                        Your charges explained
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Base price</span>
                            <span>{ride.currency}{ride.basePrice}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>GST (5%)</span>
                            <span>{ride.currency}{ride.gst}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Platform fee</span>
                            <span>{ride.currency}{ride.platformFee}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                            <span className="font-bold text-base text-gray-900">Total price</span>
                            <span className="font-bold text-xl text-gray-900">{ride.currency}{ride.totalPrice}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg safe-area-bottom flex flex-col gap-3">
                <button
                    onClick={handleBookRide}
                    className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                    Book Ride
                </button>
                <div
                    onClick={handleShareRide}
                    className="flex items-center justify-center gap-2 text-gray-500 font-medium text-sm cursor-pointer hover:text-gray-900 transition-colors"
                >
                    <Share2 size={16} />
                    Share this ride
                </div>
            </div>
        </div>
    );
}
