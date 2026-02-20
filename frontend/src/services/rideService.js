import { api } from './api';

export const rideService = {
    async searchRides(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.from) params.append('originCity', filters.from);
            if (filters.to) params.append('destinationCity', filters.to);
            if (filters.date) params.append('departureDate', filters.date);
            if (filters.originCoords?.lat && filters.originCoords?.lng) {
                params.append('originLat', String(filters.originCoords.lat));
                params.append('originLng', String(filters.originCoords.lng));
            }
            if (filters.destinationCoords?.lat && filters.destinationCoords?.lng) {
                params.append('destLat', String(filters.destinationCoords.lat));
                params.append('destLng', String(filters.destinationCoords.lng));
            }
            if (filters.optimizeRoute) params.append('optimizeRoute', 'true');

            const response = await api.get(`/search/rides?${params.toString()}`);

            if (!response.data || !Array.isArray(response.data.rides)) {
                return [];
            }

            return response.data.rides;
        } catch (error) {
            console.error('Search API failed:', error);
            return [];
        }
    }
};
