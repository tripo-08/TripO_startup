const normalizeApiBaseUrl = () => {
    const raw = (import.meta.env.VITE_API_URL || '/api').trim();

    if (!raw) return '/api';
    if (raw.startsWith('/')) return raw.replace(/\/$/, '') || '/api';

    let withProtocol = raw;
    if (!/^https?:\/\//i.test(withProtocol)) {
        withProtocol = `https://${withProtocol}`;
    }

    try {
        const url = new URL(withProtocol);
        const path = url.pathname.replace(/\/$/, '');
        const apiPath = !path || path === '/' ? '/api' : path;
        return `${url.origin}${apiPath}`;
    } catch {
        return '/api';
    }
};

export const API_BASE_URL = normalizeApiBaseUrl();
