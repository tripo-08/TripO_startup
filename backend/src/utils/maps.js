const axios = require('axios');
const logger = require('./logger');

class MapsService {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api';
    }

    /**
     * Geocode an address to get coordinates
     * @param {string} address - The address to geocode
     * @returns {Promise<Object>} - Coordinates and formatted address
     */
    async geocodeAddress(address) {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return null;
            }

            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    address,
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    coordinates: {
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng
                    },
                    formattedAddress: result.formatted_address,
                    placeId: result.place_id,
                    addressComponents: result.address_components
                };
            }

            logger.warn(`Geocoding failed for address: ${address}`, response.data);
            return null;

        } catch (error) {
            logger.error('Error geocoding address:', error);
            return null;
        }
    }

    /**
     * Get route information between two points with enhanced features
     * @param {Object} origin - Origin coordinates {lat, lng}
     * @param {Object} destination - Destination coordinates {lat, lng}
     * @param {Array} waypoints - Optional waypoints
     * @param {Object} options - Route options (avoid tolls, highways, etc.)
     * @returns {Promise<Object>} - Enhanced route information
     */
    async getRoute(origin, destination, waypoints = [], options = {}) {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return null;
            }

            const params = {
                origin: `${origin.lat},${origin.lng}`,
                destination: `${destination.lat},${destination.lng}`,
                key: this.apiKey,
                units: 'metric',
                alternatives: options.alternatives || false,
                avoid: options.avoid || '', // tolls, highways, ferries
                departure_time: options.departureTime || 'now'
            };

            if (waypoints.length > 0) {
                params.waypoints = waypoints
                    .map(wp => `${wp.lat},${wp.lng}`)
                    .join('|');
                if (options.optimizeWaypoints) {
                    params.waypoints = 'optimize:true|' + params.waypoints;
                }
            }

            const response = await axios.get(`${this.baseUrl}/directions/json`, {
                params
            });

            if (response.data.status === 'OK' && response.data.routes.length > 0) {
                const routes = response.data.routes.map(route => {
                    const leg = route.legs[0];

                    return {
                        distance: {
                            text: leg.distance.text,
                            value: leg.distance.value // in meters
                        },
                        duration: {
                            text: leg.duration.text,
                            value: leg.duration.value, // in seconds
                            inTraffic: leg.duration_in_traffic || leg.duration
                        },
                        startAddress: leg.start_address,
                        endAddress: leg.end_address,
                        bounds: route.bounds,
                        copyrights: route.copyrights,
                        warnings: route.warnings || [],
                        waypoint_order: route.waypoint_order || [],
                        steps: leg.steps.map(step => ({
                            distance: step.distance,
                            duration: step.duration,
                            instructions: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
                            maneuver: step.maneuver,
                            startLocation: step.start_location,
                            endLocation: step.end_location,
                            polyline: step.polyline.points
                        })),
                        polyline: route.overview_polyline.points,
                        summary: route.summary
                    };
                });

                return {
                    routes,
                    status: response.data.status,
                    geocoded_waypoints: response.data.geocoded_waypoints
                };
            }

            logger.warn('Route calculation failed', response.data);
            return null;

        } catch (error) {
            logger.error('Error calculating route:', error);
            return null;
        }
    }

    /**
     * Get nearby places (for pickup points)
     * @param {Object} location - Center coordinates {lat, lng}
     * @param {number} radius - Search radius in meters
     * @param {string} type - Place type (e.g., 'transit_station', 'gas_station')
     * @returns {Promise<Array>} - Array of nearby places
     */
    async getNearbyPlaces(location, radius = 5000, type = 'point_of_interest') {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return [];
            }

            const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, {
                params: {
                    location: `${location.lat},${location.lng}`,
                    radius,
                    type,
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK') {
                return response.data.results.map(place => ({
                    placeId: place.place_id,
                    name: place.name,
                    vicinity: place.vicinity,
                    coordinates: {
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng
                    },
                    rating: place.rating,
                    types: place.types,
                    openNow: place.opening_hours?.open_now
                }));
            }

            return [];

        } catch (error) {
            logger.error('Error fetching nearby places:', error);
            return [];
        }
    }

    /**
     * Calculate distance between two points using Haversine formula
     * @param {Object} point1 - First point {lat, lng}
     * @param {Object} point2 - Second point {lat, lng}
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(point1, point2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(point2.lat - point1.lat);
        const dLng = this.toRadians(point2.lng - point1.lng);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees to convert
     * @returns {number} - Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get autocomplete suggestions for places
     * @param {string} input - User input
     * @param {Object} location - Bias location {lat, lng}
     * @param {number} radius - Bias radius in meters
     * @returns {Promise<Array>} - Array of place suggestions
     */
    async getPlaceAutocomplete(input, location = null, radius = 50000) {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return [];
            }

            const params = {
                input,
                key: this.apiKey,
                types: '(cities)'
            };

            if (location) {
                params.location = `${location.lat},${location.lng}`;
                params.radius = radius;
            }

            const response = await axios.get(`${this.baseUrl}/place/autocomplete/json`, {
                params
            });

            if (response.data.status === 'OK') {
                return response.data.predictions.map(prediction => ({
                    placeId: prediction.place_id,
                    description: prediction.description,
                    mainText: prediction.structured_formatting.main_text,
                    secondaryText: prediction.structured_formatting.secondary_text,
                    types: prediction.types
                }));
            }

            return [];

        } catch (error) {
            logger.error('Error fetching place autocomplete:', error);
            return [];
        }
    }

    /**
     * Get place details by place ID
     * @param {string} placeId - Google Place ID
     * @returns {Promise<Object>} - Place details
     */
    async getPlaceDetails(placeId) {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return null;
            }

            const response = await axios.get(`${this.baseUrl}/place/details/json`, {
                params: {
                    place_id: placeId,
                    key: this.apiKey,
                    fields: 'name,formatted_address,geometry,place_id,types'
                }
            });

            if (response.data.status === 'OK') {
                const place = response.data.result;
                return {
                    placeId: place.place_id,
                    name: place.name,
                    formattedAddress: place.formatted_address,
                    coordinates: {
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng
                    },
                    types: place.types
                };
            }

            return null;

        } catch (error) {
            logger.error('Error fetching place details:', error);
            return null;
        }
    }

    /**
     * Batch geocode multiple addresses
     * @param {Array} addresses - Array of addresses to geocode
     * @returns {Promise<Array>} - Array of geocoded results
     */
    async batchGeocode(addresses) {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return [];
            }

            const results = [];

            // Process in batches to avoid rate limits
            const batchSize = 10;
            for (let i = 0; i < addresses.length; i += batchSize) {
                const batch = addresses.slice(i, i + batchSize);
                const batchPromises = batch.map(address => this.geocodeAddress(address));
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Add delay between batches
                if (i + batchSize < addresses.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            return results;
        } catch (error) {
            logger.error('Error in batch geocoding:', error);
            return [];
        }
    }

    /**
     * Reverse geocode coordinates to get address
     * @param {Object} coordinates - {lat, lng}
     * @returns {Promise<Object>} - Address information
     */
    async reverseGeocode(coordinates) {
        try {
            // Try Google Maps first if key is present
            if (this.apiKey) {
                const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                    params: {
                        latlng: `${coordinates.lat},${coordinates.lng}`,
                        key: this.apiKey
                    }
                });

                if (response.data.status === 'OK' && response.data.results.length > 0) {
                    const result = response.data.results[0];
                    return {
                        formattedAddress: result.formatted_address,
                        addressComponents: result.address_components,
                        placeId: result.place_id,
                        types: result.types,
                        source: 'google'
                    };
                }
            }

            // Fallback to Nominatim (OpenStreetMap)
            // User-Agent is required by Nominatim policy
            const nominatimResponse = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                params: {
                    format: 'json',
                    lat: coordinates.lat,
                    lon: coordinates.lng,
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'TripO-RideSharingApp/1.0'
                }
            });

            if (nominatimResponse.data && !nominatimResponse.data.error) {
                const data = nominatimResponse.data;
                const address = data.address;

                // Map Nominatim structure to our common structure
                return {
                    formattedAddress: data.display_name,
                    // Synthesize address components if needed or just pass raw address object
                    address: {
                        village: address.village || address.town || address.city || '',
                        city: address.city || address.town || address.village || '',
                        district: address.state_district || address.county || '',
                        state: address.state || '',
                        country: address.country || '',
                        postcode: address.postcode || ''
                    },
                    source: 'nominatim'
                };
            }

            return null;
        } catch (error) {
            logger.error('Error in reverse geocoding:', error);
            return null;
        }
    }

    /**
     * Find optimal pickup points along a route
     * @param {Object} origin - Origin coordinates
     * @param {Object} destination - Destination coordinates
     * @param {Object} userLocation - User's current location
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Array of optimized pickup points
     */
    async findOptimalPickupPoints(origin, destination, userLocation, options = {}) {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return [];
            }

            // Get the main route first
            const mainRoute = await this.getRoute(origin, destination);
            if (!mainRoute || !mainRoute.routes.length) {
                return [];
            }

            const route = mainRoute.routes[0];
            const pickupPoints = [];

            // Find points along the route that are accessible to the user
            const maxWalkingDistance = options.maxWalkingDistance || 1000; // meters
            const searchRadius = options.searchRadius || 500; // meters

            // Sample points along the route polyline
            const routePoints = this.decodePolyline(route.polyline);
            const sampleInterval = Math.max(1, Math.floor(routePoints.length / 20)); // Sample ~20 points

            for (let i = 0; i < routePoints.length; i += sampleInterval) {
                const point = routePoints[i];

                // Calculate walking distance from user location to this point
                const walkingDistance = this.calculateDistance(userLocation, point) * 1000; // Convert to meters

                if (walkingDistance <= maxWalkingDistance) {
                    // Find nearby places that could serve as pickup points
                    const nearbyPlaces = await this.getNearbyPlaces(
                        point,
                        searchRadius,
                        'transit_station|bus_station|subway_station|parking'
                    );

                    for (const place of nearbyPlaces.slice(0, 3)) { // Limit to 3 per route point
                        const walkingTime = await this.getWalkingTime(userLocation, place.coordinates);

                        pickupPoints.push({
                            ...place,
                            walkingDistance: Math.round(walkingDistance),
                            walkingTime,
                            routePosition: i / routePoints.length, // Position along route (0-1)
                            accessibility: this.assessAccessibility(place)
                        });
                    }
                }
            }

            // Sort by optimization score (walking time + accessibility)
            return pickupPoints
                .sort((a, b) => {
                    const scoreA = (a.walkingTime?.value || 600) + (a.accessibility.score * -100);
                    const scoreB = (b.walkingTime?.value || 600) + (b.accessibility.score * -100);
                    return scoreA - scoreB;
                })
                .slice(0, options.maxResults || 10);

        } catch (error) {
            logger.error('Error finding optimal pickup points:', error);
            return [];
        }
    }

    /**
     * Get walking time between two points
     * @param {Object} origin - Origin coordinates
     * @param {Object} destination - Destination coordinates
     * @returns {Promise<Object>} - Walking time and distance
     */
    async getWalkingTime(origin, destination) {
        try {
            if (!this.apiKey) {
                return null;
            }

            const response = await axios.get(`${this.baseUrl}/directions/json`, {
                params: {
                    origin: `${origin.lat},${origin.lng}`,
                    destination: `${destination.lat},${destination.lng}`,
                    mode: 'walking',
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK' && response.data.routes.length > 0) {
                const leg = response.data.routes[0].legs[0];
                return {
                    distance: leg.distance,
                    duration: leg.duration
                };
            }

            return null;
        } catch (error) {
            logger.error('Error getting walking time:', error);
            return null;
        }
    }

    /**
     * Assess accessibility of a pickup point
     * @param {Object} place - Place object
     * @returns {Object} - Accessibility assessment
     */
    assessAccessibility(place) {
        let score = 0;
        const factors = [];

        // Check place types for accessibility indicators
        if (place.types.includes('transit_station')) {
            score += 3;
            factors.push('Public transit access');
        }
        if (place.types.includes('parking')) {
            score += 2;
            factors.push('Parking available');
        }
        if (place.types.includes('bus_station')) {
            score += 2;
            factors.push('Bus station');
        }
        if (place.types.includes('subway_station')) {
            score += 3;
            factors.push('Subway access');
        }

        // Rating bonus
        if (place.rating && place.rating >= 4.0) {
            score += 1;
            factors.push('Highly rated location');
        }

        // Open now bonus
        if (place.openNow) {
            score += 1;
            factors.push('Currently open');
        }

        return {
            score: Math.min(score, 5), // Cap at 5
            factors,
            level: score >= 4 ? 'excellent' : score >= 2 ? 'good' : 'basic'
        };
    }

    /**
     * Decode Google Maps polyline
     * @param {string} polyline - Encoded polyline string
     * @returns {Array} - Array of {lat, lng} coordinates
     */
    decodePolyline(polyline) {
        const points = [];
        let index = 0;
        const len = polyline.length;
        let lat = 0;
        let lng = 0;

        while (index < len) {
            let b;
            let shift = 0;
            let result = 0;

            do {
                b = polyline.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = polyline.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({
                lat: lat / 1e5,
                lng: lng / 1e5
            });
        }

        return points;
    }

    /**
     * Calculate route matrix for multiple origins and destinations
     * @param {Array} origins - Array of origin coordinates
     * @param {Array} destinations - Array of destination coordinates
     * @param {Object} options - Matrix options
     * @returns {Promise<Object>} - Distance matrix results
     */
    async getDistanceMatrix(origins, destinations, options = {}) {
        try {
            if (!this.apiKey) {
                logger.warn('Google Maps API key not configured');
                return null;
            }

            const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
            const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

            const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
                params: {
                    origins: originsStr,
                    destinations: destinationsStr,
                    mode: options.mode || 'driving',
                    units: 'metric',
                    avoid: options.avoid || '',
                    departure_time: options.departureTime || 'now',
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK') {
                return {
                    originAddresses: response.data.origin_addresses,
                    destinationAddresses: response.data.destination_addresses,
                    rows: response.data.rows.map(row => ({
                        elements: row.elements.map(element => ({
                            distance: element.distance,
                            duration: element.duration,
                            durationInTraffic: element.duration_in_traffic,
                            status: element.status
                        }))
                    }))
                };
            }

            return null;
        } catch (error) {
            logger.error('Error getting distance matrix:', error);
            return null;
        }
    }
}

module.exports = new MapsService();