// src/api.js
// Small helper for calling the Django backend with the saved login token.
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Turns DRF errors ({"detail": "..."} or {"field": ["msg"]}) into one message
export function errorText(data) {
  if (!data || typeof data !== "object") return "Something went wrong. Try again.";
  if (typeof data.detail === "string") return data.detail;
  const entries = Object.entries(data.detail || data);
  if (!entries.length) return "Something went wrong. Try again.";
  return entries
    .map(([field, msgs]) => `${field.replace(/_/g, " ")}: ${[].concat(msgs).join(" ")}`)
    .join(" · ");
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Token ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Let the progress timeline know something changed
  if (res.ok && method !== "GET") window.dispatchEvent(new Event("progress-changed"));

  if (res.status === 204) return null; // e.g. after DELETE
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(errorText(data));
    err.status = res.status;
    throw err;
  }
  return data;
}