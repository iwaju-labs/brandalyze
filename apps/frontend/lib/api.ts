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

// Brand voice analysis functions
export interface BrandVoiceAnalysisResponse {
  name: string;
  voice_analysis: {
    tone: string;
    style: string;
    personality_traits: string[];
    communication_patterns: string[];
    content_themes: string[];
    brand_recommendations: string[];
    emotional_indicators: Record<string, number>;
  };
  confidence_score: number;
  samples_analyzed: number;
  total_text_length: number;
  emotional_indicators: Record<string, number>;
  brand_recommendations: string[];
  can_save: boolean;
  subscription_tier: string;
}

export async function analyzeBrandVoice(
  brandSamples: string[],
  emotionalIndicators: string[],
  name: string,
  getToken: () => Promise<string | null>,
): Promise<{ success: boolean; data: BrandVoiceAnalysisResponse; message: string }> {
  return authenticatedFetch("/analyze/brand-voice", getToken, {
    method: "POST",
    body: JSON.stringify({
      brand_samples: brandSamples,
      emotional_indicators: emotionalIndicators,
      name,
    }),
  });
}

export interface SaveBrandVoiceRequest {
  name: string;
  voice_analysis: Record<string, unknown>;
  emotional_indicators: Record<string, number>;
  brand_recommendations: string[];
  confidence_score: number;
  samples_analyzed: number;
  total_text_length: number;
  brand_samples?: string[];
  use_for_audits?: boolean;
}

export async function saveBrandVoiceAnalysis(
  data: SaveBrandVoiceRequest,
  getToken: () => Promise<string | null>,
) {
  return authenticatedFetch("/analyze/brand-voice/save", getToken, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface BrandVoiceAnalysisListItem {
  id: number;
  name: string;
  brand_id: number | null;
  confidence_score: number;
  voice_analysis: {
    tone: string;
    style: string;
    personality_traits: string[];
    communication_patterns: string[];
    content_themes: string[];
  };
  emotional_indicators: Record<string, number>;
  brand_recommendations: string[];
  samples_analyzed: number;
  total_text_length: number;
  use_for_audits: boolean;
  created_at: string;
  updated_at: string;
}

export async function listBrandVoiceAnalyses(
  getToken: () => Promise<string | null>,
): Promise<{ success: boolean; data: { analyses: BrandVoiceAnalysisListItem[]; total_count: number }; message: string }> {
  return authenticatedFetch("/analyze/brand-voice/list", getToken, {
    method: "GET",
  });
}

export async function deleteBrandVoiceAnalysis(
  analysisId: number,
  getToken: () => Promise<string | null>,
) {
  return authenticatedFetch(`/analyze/brand-voice/${analysisId}/delete`, getToken, {
    method: "DELETE",
  });
}
