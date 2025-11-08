export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string,
) {
  const headers: Record<string, string> = {};

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add authorization header if token is provided
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...headers,
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${res.status}`);
  }
  return res.json();
}

// Helper for authenticated API calls - to be used with Clerk's getToken from useAuth hook
export async function authenticatedFetch(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {},
) {
  const token = await getToken();

  if (!token) {
    throw new Error("User not authenticated");
  }

  return apiFetch(path, options, token);
}

// Helper for authenticated streaming API calls - returns raw Response for streaming
export async function authenticatedFetchStream(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {},
) {
  const token = await getToken();

  if (!token) {
    throw new Error("User not authenticated");
  }

  const headers: Record<string, string> = {};

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add authorization header
  headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...headers,
      ...options.headers,
    },
    ...options,
  });

  // Return raw response for streaming, don't parse as JSON
  return res;
}

// Authenticated brand alignment function
export async function analyzeBrandAlignment(
  text: string,
  brandSamples: string[],
  getToken: () => Promise<string | null>,
) {
  return authenticatedFetch("/analyze/brand-alignment", getToken, {
    method: "POST",
    body: JSON.stringify({
      text,
      brand_samples: brandSamples,
    }),
  });
}
