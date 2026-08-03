// House Pooling — shared constants used by both the list and join flows.

export const POOLING_AREAS = [
  "Indiranagar", "Whitefield", "Koramangala", "Bellandur", "Sarjapur", "Marathahalli",
  "Yeshwanthpur", "Frazer Town", "MG Road", "Lavelle Road", "Richmond Town", "Residency Road",
  "Benson Town", "Basavanagudi", "Jayanagar", "Banashankari", "Kumara Park", "Vanivilas Road",
  "Malleswaram", "Ulsoor", "Kalyan Nagar", "Ramamurthy Nagar", "Vyalikaval", "RT Nagar",
  "Jeevanbheemanagara", "Sankey Road", "Cubbon Park", "Cantonment", "St. Johns Road",
  "Shoolay Circle", "Ames Layout", "Brigade Road", "Strand Road", "Queen's Road",
  "Cunningham Road", "Kasturba Road", "Museum Road", "Nandini Layout", "HSR Layout",
  "Koramangala Layout", "Garuda Mall Area", "Toorak Village", "Murgeshpalya", "Sadashivnagar",
  "Rajajinagar", "Virupaksha Road", "Langford Town", "Greystone", "Wilson Garden",
  "Sudhama Layout", "Banasavakri Circle", "Halasur", "Domlur", "HAL Layout", "Kamaraj Nagar",
  "Chandra Layout", "Doopanahalli", "Gottigere", "Bommanahalli", "Bannerghatta Road",
];

export const BHK_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK"];

export const POOLING_AMENITIES = [
  "Parking", "Gym", "AC", "WiFi", "Water Supply", "Power Backup",
  "Washing Machine", "Kitchen", "Balcony", "Garden",
];

// Bangalore's approximate centroid — used as a map fallback if geocoding fails.
export const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };
