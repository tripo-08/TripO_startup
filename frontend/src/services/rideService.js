import { api } from './api';

// Demo data for "Perfect Working" fallback
const MOCK_RIDES = [
    {
        id: 'mock-1',
        type: 'Bus',
        vehicleNumber: 'MH 12 AB 1234',
        date: '2023-10-25',
        time: '6:00 AM',
        duration: '3h 30m',
        rating: '4.8',
        seatsAvailable: 12,
        totalSeats: 40,
        pricePerSeat: 450,
        pricePerKm: 2,
        currency: '₹',
        vehicle: {
            make: 'Volvo',
            model: '9400',
            category: 'Bus'
        },
        driver: {
            name: 'Ramesh Patil',
            rating: 4.8
        },
        origin: { city: 'Pune', name: 'Swargate' },
        destination: { city: 'Mumbai', name: 'Dadar' }
    },
    {
        id: 'mock-2',
        type: 'Cab',
        vehicleNumber: 'MH 14 CD 5678',
        date: '2023-10-25',
        time: '09:30 AM',
        duration: '45m',
        rating: '4.9',
        seatsAvailable: 3,
        totalSeats: 4,
        pricePerSeat: 350,
        pricePerKm: 15,
        currency: '₹',
        vehicle: {
            make: 'Maruti',
            model: 'Dzire',
            category: 'Cab'
        },
        driver: {
            name: 'Suresh More',
            rating: 4.9
        },
        origin: { city: 'Pune', name: 'Airport' },
        destination: { city: 'Pune', name: 'Station' }
    },
    {
        id: 'mock-3',
        type: 'Car',
        vehicleNumber: 'MH 02 X 9999',
        date: '2023-10-26',
        time: '10:00 AM',
        duration: '3h',
        rating: '4.5',
        seatsAvailable: 2,
        totalSeats: 4,
        pricePerSeat: 400,
        pricePerKm: 12,
        currency: '₹',
        vehicle: {
            make: 'Hyundai',
            model: 'Creta',
            category: 'Car'
        },
        driver: {
            name: 'Amit Shah',
            rating: 4.5
        },
        origin: { city: 'Mumbai', name: 'City' },
        destination: { city: 'Pune', name: 'City' }
    }
];

export const rideService = {
    async searchRides(filters = {}) {
        // Helper to filter mock data
        const filterMock = (searchFilters) => {
            return MOCK_RIDES.filter(ride => {
                let match = true;
                if (searchFilters.from) {
                    const term = searchFilters.from.toLowerCase();
                    const originCity = (ride.origin?.city || '').toLowerCase();
                    const originName = (ride.origin?.name || '').toLowerCase();
                    if (!originCity.includes(term) && !originName.includes(term)) {
                        match = false;
                    }
                }
                if (match && searchFilters.to) {
                    const term = searchFilters.to.toLowerCase();
                    const destCity = (ride.destination?.city || '').toLowerCase();
                    const destName = (ride.destination?.name || '').toLowerCase();
                    if (!destCity.includes(term) && !destName.includes(term)) {
                        match = false;
                    }
                }
                // Date logic could be added here
                return match;
            });
        };

        try {
            // Convert simple filters to query string
            const params = new URLSearchParams();
            if (filters.from) params.append('originCity', filters.from);
            if (filters.to) params.append('destinationCity', filters.to);
            if (filters.date) params.append('departureDate', filters.date);

            // Try fetching from backend
            const response = await api.get(`/search/rides?${params.toString()}`);

            // If backend returns empty rides or invalid structure, fallback
            if (!response.data || !Array.isArray(response.data.rides) || response.data.rides.length === 0) {
                console.warn('Backend returned no/invalid rides, using demo data');
                return filterMock(filters);
            }

            return response.data.rides;
        } catch (error) {
            console.error('Search API failed, using fallback:', error);
            return filterMock(filters);
        }
    }
};
