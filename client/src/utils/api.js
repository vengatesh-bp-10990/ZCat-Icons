// In production (Slate), API calls go to the AppSail URL
// In dev, Vite proxy forwards /api to localhost:3000
const APPSAIL_URL = "https://zcat-icons-api-50041188332.development.catalystappsail.in";
const API_BASE = import.meta.env.DEV ? "/api" : `${APPSAIL_URL}/api`;

async function getAuthHeaders() {
  const token = sessionStorage.getItem("zcat_token");
  return {
    Authorization: token ? `Zoho-oauthtoken ${token}` : "",
    "Content-Type": "application/json",
  };
}

export async function fetchIcons({ page = 1, limit = 50, search, category_id, style } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set("search", search);
  if (category_id) params.set("category_id", category_id);
  if (style) params.set("style", style);

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/icons?${params}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch icons");
  return res.json();
}

export async function fetchIcon(slug) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/icons/${slug}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch icon");
  return res.json();
}

export async function uploadIcon(formData, { skipAI = false } = {}) {
  const token = sessionStorage.getItem("zcat_token");
  const url = skipAI ? `${API_BASE}/icons/upload?skip_ai=true` : `${API_BASE}/icons/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: token ? `Zoho-oauthtoken ${token}` : "" },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function analyzeIcon(formData) {
  const token = sessionStorage.getItem("zcat_token");
  const res = await fetch(`${API_BASE}/icons/analyze`, {
    method: "POST",
    headers: { Authorization: token ? `Zoho-oauthtoken ${token}` : "" },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Analysis failed");
  }
  return res.json();
}

export async function deleteIcon(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/icons/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete icon");
  return res.json();
}

export async function fetchCategories() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/categories`, { headers });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function createCategory(name) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function deleteCategory(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete category");
  return res.json();
}

export async function updateIcon(id, data) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/icons/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update icon");
  return res.json();
}

export function getDownloadUrl(iconId, { style = "outlined", format = "svg", size = 24, color } = {}) {
  const params = new URLSearchParams({ style, format, size });
  if (color) params.set("color", color);
  return `${API_BASE}/download/${iconId}?${params}`;
}
