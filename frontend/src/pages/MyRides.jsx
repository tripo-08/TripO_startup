import React, { useState } from 'react';
import { ArrowLeft, Clock, MapPin, Search, Filter, Calendar, BarChart3, TrendingUp, Users, Star, AlertCircle, CheckCircle, XCircle, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProviderBottomNav from '../components/layout/ProviderBottomNav';

export default function MyRides() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('statistics'); // statistics is default
    const [viewTitle, setViewTitle] = useState('My Rides');

    // Static data for rides
    const rides = {
        upcoming: [
            { id: 101, from: 'Pune', to: 'Mumbai', date: 'Tomorrow', time: '06:00 AM', status: 'Scheduled', earnings: 4500, seats: '8/40' },
            { id: 102, from: 'Pune', to: 'Nashik', date: 'Fri, 18 Jan', time: '07:00 AM', status: 'Scheduled', earnings: 1200, seats: '2/4' },
        ],
        completed: [
            { id: 201, from: 'Mumbai', to: 'Pune', date: 'Yesterday', time: '08:00 PM', status: 'Completed', earnings: 4200, seats: '35/40' },
            { id: 202, from: 'Pune', to: 'Aurangabad', date: '12 Jan', time: '05:00 AM', status: 'Completed', earnings: 3800, seats: '30/40' },
            { id: 203, from: 'Aurangabad', to: 'Pune', date: '12 Jan', time: '09:00 PM', status: 'Completed', earnings: 3900, seats: '32/40' },
        ],
        cancelled: [
            { id: 301, from: 'Pune', to: 'Satara', date: '10 Jan', time: '10:00 AM', status: 'Cancelled', earnings: 0, seats: '0/4' },
        ]
    };

    // Static data for statistics
    const statsData = {
        totalEarnings: 12500,
        totalRides: 45,
        completedRides: 42,
        cancelledRides: 3,
        pendingRides: 2,
        earningsHistory: [
            { day: 'Mon', amount: 2400, passengers: 12 },
            { day: 'Tue', amount: 3200, passengers: 15 },
            { day: 'Wed', amount: 1800, passengers: 8 },
            { day: 'Thu', amount: 4500, passengers: 22 },
            { day: 'Fri', amount: 3900, passengers: 19 },
            { day: 'Sat', amount: 5200, passengers: 28 },
            { day: 'Sun', amount: 4800, passengers: 25 },
        ],
        passengerBehavior: {
            rating: 4.8,
            totalReviews: 124,
            breakdown: {
                5: 98,
                4: 20,
                3: 4,
                2: 1,
                1: 1
            },
            comments: [
                { id: 1, user: "Rahul K.", rating: 5, comment: "Very punctual and clean vehicle.", date: "2 days ago" },
                { id: 2, user: "Sneha P.", rating: 4, comment: "Good drive, but a bit fast.", date: "1 week ago" }
            ]
        }
    };

    const currentRides = rides[activeTab] || [];

    const handleBack = () => {
        if (activeTab !== 'statistics') {
            setActiveTab('statistics');
            setViewTitle('My Rides');
        } else {
            navigate(-1);
        }
    };

    const handleStatClick = (tab, title) => {
        setActiveTab(tab);
        setViewTitle(title);
    };

    // Simple Bar Chart Component
    const SimpleBarChart = ({ data }) => {
        const maxVal = Math.max(...data.map(d => d.amount));
        return (
            <div className="flex items-end justify-between h-40 gap-2 mt-4">
                {data.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 w-full">
                        <div
                            className="w-full bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-600 relative group"
                            style={{ height: `${(d.amount / maxVal) * 100}%` }}
                        >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                ₹{d.amount} | {d.passengers} pax
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">{d.day}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                            <ArrowLeft size={20} className="text-gray-700" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">{viewTitle}</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {activeTab === 'statistics' ? (
                    <div className="space-y-6 animate-fade-in">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                        <TrendingUp size={16} />
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium">Total Earnings</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">₹{statsData.totalEarnings.toLocaleString()}</h3>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <BarChart3 size={16} />
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium">Total Rides</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{statsData.totalRides}</h3>
                            </div>
                        </div>

                        {/* Ride Status Breakdown */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Ride Overview</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleStatClick('completed', 'Completed Rides')}
                                    className="text-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex justify-center mb-1 text-green-500"><CheckCircle size={18} /></div>
                                    <div className="text-lg font-bold text-gray-900">{statsData.completedRides}</div>
                                    <div className="text-[10px] text-gray-500">Completed</div>
                                </button>
                                <button
                                    onClick={() => handleStatClick('cancelled', 'Cancelled Rides')}
                                    className="text-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex justify-center mb-1 text-red-500"><XCircle size={18} /></div>
                                    <div className="text-lg font-bold text-gray-900">{statsData.cancelledRides}</div>
                                    <div className="text-[10px] text-gray-500">Cancelled</div>
                                </button>
                                <button
                                    onClick={() => handleStatClick('upcoming', 'Upcoming Rides')}
                                    className="text-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex justify-center mb-1 text-orange-500"><AlertCircle size={18} /></div>
                                    <div className="text-lg font-bold text-gray-900">{statsData.pendingRides}</div>
                                    <div className="text-[10px] text-gray-500">Pending</div>
                                </button>
                            </div>
                        </div>

                        {/* Weekly Earnings Chart */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-gray-900">Weekly Performance</h3>
                                <select className="text-xs border-none bg-gray-50 rounded px-2 py-1 text-gray-600 focus:ring-0">
                                    <option>This Week</option>
                                    <option>Last Week</option>
                                </select>
                            </div>
                            <div className="text-xs text-gray-500 mb-4">Earnings & Passengers</div>
                            <SimpleBarChart data={statsData.earningsHistory} />
                        </div>

                        {/* Passenger Behavior */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-900">Passenger Behavior</h3>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded text-yellow-700">
                                    <Star size={14} fill="currentColor" />
                                    <span className="text-xs font-bold">{statsData.passengerBehavior.rating}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        {[5, 4, 3, 2, 1].map((star) => (
                                            <div key={star} className="flex items-center gap-2 mb-1 last:mb-0">
                                                <span className="text-[10px] text-gray-500 w-3">{star}</span>
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-yellow-400 rounded-full"
                                                        style={{
                                                            width: `${(statsData.passengerBehavior.breakdown[star] / statsData.passengerBehavior.totalReviews) * 100}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-center min-w-[80px]">
                                        <div className="text-2xl font-bold text-gray-900">{statsData.passengerBehavior.totalReviews}</div>
                                        <div className="text-[10px] text-gray-500">Total Reviews</div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-50 pt-4 space-y-3">
                                    {statsData.passengerBehavior.comments.map((comment) => (
                                        <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-gray-900">{comment.user}</span>
                                                <span className="text-[10px] text-gray-400">{comment.date}</span>
                                            </div>
                                            <div className="flex items-center gap-0.5 mb-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={10}
                                                        className={i < comment.rating ? "text-yellow-400" : "text-gray-300"}
                                                        fill={i < comment.rating ? "currentColor" : "none"}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-600 italic">"{comment.comment}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {currentRides.length > 0 ? (
                            currentRides.map((ride) => (
                                <div key={ride.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                                    {/* Ride Header */}
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${ride.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                                            ride.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {ride.status}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900">₹{ride.earnings}</span>
                                    </div>

                                    {/* Ride Details */}
                                    <div className="p-4">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                                <div className="w-0.5 h-8 bg-gray-200 my-1"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{ride.from}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{ride.to}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 text-sm text-gray-500 border-t border-gray-50">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>{ride.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                <span>{ride.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* Using text for seats to simplify */}
                                                <span>Seats: {ride.seats}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                    <List size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No rides found</h3>
                                <p className="text-gray-500 text-sm mt-1">There are no {activeTab} rides to show.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ProviderBottomNav />
        </div>
    );
}

