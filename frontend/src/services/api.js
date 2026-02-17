const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

export const api = {
    async get(endpoint, token) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers,
        });
        return handleResponse(response);
    },

    async post(endpoint, data, token) {
        let headers = {};
        let body;

        if (data instanceof FormData) {
            body = data;
            // Let the browser set Content-Type with boundary
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(data);
        }

        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body,
        });
        return handleResponse(response);
    },

    async put(endpoint, data, token) {
        let headers = {};
        let body;

        if (data instanceof FormData) {
            body = data;
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(data);
        }

        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body,
        });
        return handleResponse(response);
    }
};

async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        const error = (data && data.error && typeof data.error === 'object' ? data.error.message : data.error) || (data && data.message) || response.statusText;
        throw new Error(error);
    }
    return data;
}
