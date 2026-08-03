// Design tokens — Living Circle (official brand kit, matched to logo).
// Gradient Violet #7C3AED → Blue #3B82F6 → Teal #14B8A6  |  Sunshine #F5A623
// Deep Navy text #14163A  |  White bg (light theme)
// Typography: Poppins (bold headings / regular body)
export const ACTIVE_CITY = "Bangalore";
export const ACTIVE_LOCALITIES = [
  // Central / Inner ring
  "MG Road", "Residency Road", "Richmond Town", "Lavelle Road",
  "Shivajinagar", "Cubbon Park", "Ulsoor", "Frazer Town", "Cox Town",
  "Cunningham Road", "Cleveland Town",
  // South Bangalore
  "Koramangala", "Indiranagar", "Domlur", "Ejipura", "HAL Layout",
  "HSR Layout", "BTM Layout", "Jayanagar", "JP Nagar", "Banashankari",
  "Basavanagudi", "Padmanabhanagar", "Kanakapura Road",
  "Bannerghatta Road", "Electronic City", "Hosa Road",
  // North Bangalore
  "Hebbal", "Yelahanka", "Banaswadi", "RT Nagar", "HBR Layout",
  "Kalyan Nagar", "New BEL Road", "Vidyaranyapura", "Peenya",
  "Sahakara Nagar", "Nagavara", "Thanisandra",
  // West Bangalore
  "Rajajinagar", "Malleswaram", "Basaveshwara Nagar", "Nagarbhavi",
  "Kengeri", "Mysore Road", "Tumkur Road",
  // East / Outer ring
  "Whitefield", "Marathahalli", "Sarjapur Road", "Bellandur",
  "Old Airport Road", "Viman Nagar", "KR Puram", "Mahadevapura",
  "Brookefield", "ITPL Road", "Kadubeesanahalli",
  // Tech corridors
  "Outer Ring Road", "Silk Board", "Devanahalli",
];

export const C = {
  // Backgrounds — pure white (brand kit, light)
  bg: "#FFFFFF",
  brand: "#7C3AED",          // violet — primary brand accent
  brandTint: "rgba(124,58,237,0.08)",
  onBrand: "#FFFFFF",
  onBrandTint: "#6D28D9",

  // Primary accents (key names kept for compatibility across screens)
  coral: "#7C3AED",          // violet (legacy key)
  onCoral: "#FFFFFF",
  cyan: "#14B8A6",           // ocean teal (legacy key)

  // Gradient pair for buttons / hero — violet → teal
  gradStart: "#7C3AED",
  gradEnd:   "#14B8A6",

  // Brand accent set
  teal: "#14B8A6",
  sky: "#3B82F6",
  violet: "#8B5CF6",
  sunshine: "#F5A623",

  // Surfaces — off-white cards on white bg
  surface: "#FFFFFF",
  surfaceSecondary: "#F5F5FC",
  surfaceTertiary: "#ECEDF7",
  surfaceGlass: "rgba(124,58,237,0.04)",
  surfaceGlassStrong: "rgba(124,58,237,0.08)",

  // Text — deep navy scale
  onSurface: "#14163A",
  onSurfaceSecondary: "#5B5F82",
  onSurfaceTertiary: "#8A8FB0",
  onSurfaceInverse: "#FFFFFF",

  // Semantic
  success: "#14B8A6",
  warning: "#F5A623",
  error: "#E4433B",

  // Borders — translucent navy
  border: "rgba(20,22,58,0.10)",
  borderStrong: "rgba(20,22,58,0.18)",
  borderCyan: "rgba(20,184,166,0.40)",
  borderCoral: "rgba(124,58,237,0.40)",
};

// Brand typography — Poppins (loaded via Google Fonts on web; system fallback on native)
const isWebFont = typeof document !== "undefined";
export const F = {
  heading: isWebFont ? "Poppins" : undefined,
  body: isWebFont ? "Poppins" : undefined,
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 8, md: 16, lg: 24, pill: 99 };

// Neon glows
export const GLOW_CYAN = {
  shadowColor: "#14B8A6",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 14,
  elevation: 6,
};
export const GLOW_CORAL = {
  shadowColor: "#7C3AED",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 14,
  elevation: 6,
};
export const CARD_SHADOW = {
  shadowColor: "#14163A",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 6,
};

// Avatar gradients — brand kit pairs
export const AVATAR_PALETTE: [string, string][] = [
  ["#7C3AED", "#14B8A6"],   // violet → teal (primary)
  ["#14B8A6", "#3B82F6"],   // teal → blue
  ["#8B5CF6", "#3B82F6"],   // violet → blue
  ["#F5A623", "#7C3AED"],   // sunshine → violet
  ["#3B82F6", "#8B5CF6"],   // blue → violet
  ["#7C3AED", "#F5A623"],   // violet → sunshine
  ["#14B8A6", "#8B5CF6"],   // teal → violet
  ["#8B5CF6", "#7C3AED"],   // violet → violet (deep)
];

export function initialsFor(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function paletteFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length] as [string, string];
}
