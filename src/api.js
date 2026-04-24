// Thin wrapper around fetch() that adds the auth header and
// parses JSON responses (throwing on non-2xx).
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("recon_token") || "";
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const tok = getToken();
  if (tok) headers.set("Authorization", `Bearer ${tok}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(BASE + path, { ...options, headers });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && data.detail) || (typeof data === "string" ? data : `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/api/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request("/api/me"),
  users: () => request("/api/users"),

  accounts: () => request("/api/accounts"),
  createAccount: (data) =>
    request("/api/accounts", { method: "POST", body: JSON.stringify(data) }),
  updateAccount: (id, data) =>
    request(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  patchAccountTemplate: (id, template) =>
    request(`/api/accounts/${id}/template`, { method: "PATCH", body: JSON.stringify({ template }) }),
  deleteAccount: (id) => request(`/api/accounts/${id}`, { method: "DELETE" }),
  autoCertify: (period) =>
    request(`/api/auto-certify?period=${encodeURIComponent(period)}`, { method: "POST" }),

  autoRules: () => request("/api/auto-rules"),
  setAutoRule: (id, enabled) =>
    request(`/api/auto-rules/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }),

  periodStatuses: () => request("/api/period-statuses"),
  setPeriodStatus: (period, status) =>
    request(`/api/period-statuses/${encodeURIComponent(period)}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  dataSources: () => request("/api/data-sources"),
  dataSource: (id) => request(`/api/data-sources/${id}`),
  createDataSource: (data) =>
    request("/api/data-sources", { method: "POST", body: JSON.stringify(data) }),
  updateDataSource: (id, data) =>
    request(`/api/data-sources/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDataSource: (id) => request(`/api/data-sources/${id}`, { method: "DELETE" }),
  runDataSource: (id) => request(`/api/data-sources/${id}/run`, { method: "POST" }),
  testDataSource: (id) => request(`/api/data-sources/${id}/test`, { method: "POST" }),

  upload: (file, period, classify) => {
    const fd = new FormData();
    fd.append("file", file);
    if (period) fd.append("period", period);
    if (classify) fd.append("classify", "true");
    return request("/api/upload", { method: "POST", body: fd });
  },
  imports: () => request("/api/imports"),
  periods: () => request("/api/periods"),

  summary: (period) => request(`/api/summary?period=${encodeURIComponent(period)}`),
  reconciliations: (period) =>
    request(`/api/reconciliations?period=${encodeURIComponent(period)}`),
  reconciliation: (rid) => request(`/api/reconciliations/${rid}`),

  addItem: (rid, data) =>
    request(`/api/reconciliations/${rid}/items`, { method: "POST", body: JSON.stringify(data) }),
  extractInvoice: (rid, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request(`/api/reconciliations/${rid}/extract-invoice`,
                   { method: "POST", body: fd });
  },
  updateItem: (rid, iid, data) =>
    request(`/api/reconciliations/${rid}/items/${iid}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteItem: (rid, iid) =>
    request(`/api/reconciliations/${rid}/items/${iid}`, { method: "DELETE" }),

  addComment: (rid, text) =>
    request(`/api/reconciliations/${rid}/comments`, { method: "POST", body: JSON.stringify({ text }) }),

  certify: (rid) => request(`/api/reconciliations/${rid}/certify`, { method: "POST" }),
  approve: (rid) => request(`/api/reconciliations/${rid}/approve`, { method: "POST" }),
  reject: (rid, reason) =>
    request(`/api/reconciliations/${rid}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),

  uploadDoc: (rid, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request(`/api/reconciliations/${rid}/documents`, { method: "POST", body: fd });
  },
  // Include the token as a query param so clicking a plain <a href> works —
  // <a> links cannot add Authorization headers.
  docUrl: (did) => `${BASE}/api/documents/${did}?token=${encodeURIComponent(getToken())}`,
  deleteDoc: (did) => request(`/api/documents/${did}`, { method: "DELETE" }),

  // Account groups
  groups: () => request("/api/groups"),
  createGroup: (data) =>
    request("/api/groups", { method: "POST", body: JSON.stringify(data) }),
  updateGroup: (gid, data) =>
    request(`/api/groups/${gid}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGroup: (gid) => request(`/api/groups/${gid}`, { method: "DELETE" }),
  assignGroupMembers: (gid, account_ids) =>
    request(`/api/groups/${gid}/members`, {
      method: "POST", body: JSON.stringify({ account_ids }),
    }),
  certifyGroup: (gid, period) =>
    request(`/api/groups/${gid}/certify?period=${encodeURIComponent(period)}`, { method: "POST" }),
  approveGroup: (gid, period) =>
    request(`/api/groups/${gid}/approve?period=${encodeURIComponent(period)}`, { method: "POST" }),
  rejectGroup: (gid, period, reason) =>
    request(`/api/groups/${gid}/reject?period=${encodeURIComponent(period)}`, {
      method: "POST", body: JSON.stringify({ reason }),
    }),

  reset: () => request("/api/reset", { method: "POST" }),
};

export function saveToken(tok) {
  if (tok) localStorage.setItem("recon_token", tok);
  else localStorage.removeItem("recon_token");
}

export function saveUser(u) {
  if (u) localStorage.setItem("recon_user", JSON.stringify(u));
  else localStorage.removeItem("recon_user");
}

export function loadUser() {
  try { return JSON.parse(localStorage.getItem("recon_user") || "null"); }
  catch { return null; }
}
