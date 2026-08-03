import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

async function token(): Promise<string | null> {
  return await storage.getItem<string>("lc_token", "");
}

export async function setToken(t: string | null) {
  if (t) await storage.setItem("lc_token", t);
  else await storage.removeItem("lc_token");
}

async function request<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const t = await token();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (t) headers["Authorization"] = t;
  const res = await fetch(`${BASE}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    // Auto-clear token on auth failure so the user lands on the login screen.
    if (res.status === 401) {
      try { await setToken(null); } catch {}
    }
    throw new Error(`${res.status}: ${txt}`);
  }
  return res.json();
}

export const api = {
  sendCode: (email: string) =>
    request<{ sent: boolean; dev_code?: string; hint?: string }>("/auth/send-code", {
      method: "POST",
      body: { email },
    }),
  verifyCode: (email: string, code: string) =>
    request<{ token: string; onboarded: boolean }>("/auth/verify-code", {
      method: "POST",
      body: { email, code },
    }),
  me: () => request("/profiles/me"),
  updateMe: (data: any) => request("/profiles/me", { method: "PUT", body: data }),
  cities: () => request<{ cities: string[]; localities: Record<string, string[]> }>("/meta/cities"),
  discover: (filters: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<any[]>(`/profiles/discover${qs ? `?${qs}` : ""}`);
  },
  profile: (id: string) => request(`/profiles/${id}`),
  swipe: (target_id: string, direction: "like" | "pass") =>
    request<{ ok: boolean; match: any }>("/swipes", {
      method: "POST",
      body: { target_id, direction },
    }),
  matches: () => request<any[]>("/matches"),
  messages: (matchId: string) => request<any[]>(`/messages/${matchId}`),
  sendMessage: (matchId: string, text: string) =>
    request(`/messages/${matchId}`, { method: "POST", body: { text } }),
  block: (id: string) => request(`/users/${id}/block`, { method: "POST", body: {} }),
  report: (id: string) => request(`/users/${id}/report`, { method: "POST", body: {} }),
  safetyReport: (id: string, reason: string, details?: string) =>
    request(`/users/${id}/safety-report`, { method: "POST", body: { reason, details } }),
  unmatch: (matchId: string) => request(`/matches/${matchId}`, { method: "DELETE" }),
  matchLocation: (matchId: string) => request<any>(`/matches/${matchId}/location`),
  requestLocation: (matchId: string) => request<any>(`/matches/${matchId}/request-location`, { method: "POST" }),
  geocode: (address: string) => request<any[]>("/geocode", { method: "POST", body: { address } }),
  testBotMatch: () => request<any>("/matches/test-bot", { method: "POST" }),

  verifyId: (imageBase64: string) =>
    request<any>("/users/verify-id", {
      method: "POST",
      body: JSON.stringify({ image_base64: imageBase64 }),
    }),

  uploadVerificationPhoto: (photoBase64: string) =>
    request<{ ok: boolean }>("/profile/upload-photo", {
      method: "POST",
      body: { photo_base64: photoBase64 },
    }),

  submitMatchVerification: (matchId: string, mediaBase64: string, mediaType: "video" | "photo") =>
    request<{
      ok: boolean; status: "approved" | "pending" | "rejected" | "error"; similarity: number;
      message: string; my_verified: boolean; other_verified: boolean; can_chat: boolean;
    }>(
      "/verification/submit",
      { method: "POST", body: { match_id: matchId, media_base64: mediaBase64, media_type: mediaType } }
    ),

  matchVerificationStatus: (matchId: string) =>
    request<{ my_verified: boolean; other_verified: boolean; can_chat: boolean; other_name?: string }>(
      `/verification/status?match_id=${encodeURIComponent(matchId)}`
    ),

  houseTourRequest: (matchId: string) =>
    request<any>("/house-tour/request", { method: "POST", body: { match_id: matchId } }),

  houseTourRespond: (tourId: string, accept: boolean) =>
    request<{ ok: boolean; status: string }>(`/house-tour/${tourId}/respond`, {
      method: "POST",
      body: { accept },
    }),

  houseTourAddPhoto: (tourId: string, photoBase64: string) =>
    request<any>(`/house-tour/${tourId}/photo`, { method: "POST", body: { photo_base64: photoBase64 } }),

  houseTourDeletePhoto: (tourId: string, photoId: string) =>
    request<{ ok: boolean }>(`/house-tour/${tourId}/photo/${photoId}`, { method: "DELETE" }),

  houseTourComplete: (tourId: string) =>
    request<{ ok: boolean }>(`/house-tour/${tourId}/complete`, { method: "POST" }),

  houseTourForMatch: (matchId: string) =>
    request<any[]>(`/house-tour/match/${matchId}`),

  // ── House Pooling ──────────────────────────────────────────────────────
  poolingCreateListing: (data: {
    address: string; area: string; latitude: number; longitude: number;
    bhk_type: string; rent: number; roommates_needed: number; photos: string[];
    description?: string; move_in_date: string; amenities: string[];
  }) => request<any>("/pooling/listings", { method: "POST", body: data }),

  poolingMyListings: () => request<any[]>("/pooling/my-listings"),

  poolingEditListing: (listingId: string, data: Record<string, any>) =>
    request<any>(`/pooling/listings/${listingId}`, { method: "PUT", body: data }),

  poolingDeleteListing: (listingId: string) =>
    request<{ ok: boolean }>(`/pooling/listings/${listingId}`, { method: "DELETE" }),

  poolingBrowse: (filters: { area?: string; rent_min?: number; rent_max?: number; bhk_type?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])
    ).toString();
    return request<any[]>(`/pooling/listings${qs ? `?${qs}` : ""}`);
  },

  poolingListingDetail: (listingId: string) => request<any>(`/pooling/listings/${listingId}`),

  poolingSendRequest: (listingId: string) =>
    request<{ ok: boolean; request_id: string }>("/pooling/requests", { method: "POST", body: { listing_id: listingId } }),

  poolingMyRequests: () => request<any[]>("/pooling/my-requests"),

  poolingListingRequests: (listingId: string) => request<any[]>(`/pooling/listings/${listingId}/requests`),

  poolingRespondRequest: (requestId: string, accept: boolean) =>
    request<{ ok: boolean; status: string }>(`/pooling/requests/${requestId}/respond`, { method: "POST", body: { accept } }),

  poolingSubmitVerification: (requestId: string, mediaBase64: string) =>
    request<{
      ok: boolean; verified: boolean; status: "approved" | "pending" | "rejected" | "error";
      similarity: number; message: string;
    }>(`/pooling/requests/${requestId}/verify`, {
      method: "POST", body: { media_base64: mediaBase64 },
    }),

  poolingGroup: (listingId: string) => request<any>(`/pooling/groups/${listingId}`),

  poolingGroupMessages: (listingId: string) => request<any[]>(`/pooling/groups/${listingId}/messages`),

  poolingSendGroupMessage: (listingId: string, text: string) =>
    request<any>(`/pooling/groups/${listingId}/messages`, { method: "POST", body: { text } }),

  poolingLeaveGroup: (listingId: string) =>
    request<{ ok: boolean }>(`/pooling/groups/${listingId}/leave`, { method: "POST" }),

  poolingRemoveMember: (listingId: string, memberId: string) =>
    request<{ ok: boolean }>(`/pooling/groups/${listingId}/remove/${memberId}`, { method: "POST" }),

  poolingReportMember: (listingId: string, memberId: string, reason: string, details?: string) =>
    request<{ ok: boolean; report_id: string }>(`/pooling/groups/${listingId}/report/${memberId}`, {
      method: "POST", body: { reason, details },
    }),
};
