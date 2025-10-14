export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function apiFetch(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {};
    
    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }
    
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            ...headers,
            ...options.headers,
        },
        ...options,
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}