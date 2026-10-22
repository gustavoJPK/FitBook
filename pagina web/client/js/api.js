/** Cliente HTTP centralizado. La sesión viaja en una cookie httpOnly (no accesible desde JS). */

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

const isDevExternalOrigin =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    (window.location.port && window.location.port !== '3000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')));

const BASE = isDevExternalOrigin
  ? `http://${window.location.hostname || 'localhost'}:3000/api`
  : '/api';

const inflight = new Map(); // deduplica GET idénticos simultáneos
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(method, path, body) {
  const opts = {
    method,
    credentials: isDevExternalOrigin ? 'include' : 'same-origin',
    headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' }
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin JSON */ }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(res.status, data?.error || `Error ${res.status}`, data?.details);
  }
  return data;
}

function get(path, params) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString() : '';
  const url = qs ? `${path}?${qs}` : path;
  if (inflight.has(url)) return inflight.get(url);
  const p = request('GET', url).finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

export const api = {
  // Auth
  me: () => get('/auth/me'),
  login: (data) => request('POST', '/auth/login', data),
  register: (data) => request('POST', '/auth/register', data),
  logout: () => request('POST', '/auth/logout'),
  updateProfile: (data) => request('PUT', '/auth/me', data),
  // Clases
  listClasses: (params) => get('/classes', params),
  getClass: (id) => get(`/classes/${id}`),
  createClass: (data) => request('POST', '/classes', data),
  updateClass: (id, data) => request('PUT', `/classes/${id}`, data),
  deleteClass: (id) => request('DELETE', `/classes/${id}`),
  attendees: (id) => get(`/classes/${id}/attendees`),
  // Reservas
  myBookings: (status) => get('/bookings/me', { status }),
  book: (classId) => request('POST', '/bookings', { class_id: classId }),
  cancelBooking: (id) => request('PATCH', `/bookings/${id}/cancel`),
  // Admin
  stats: () => get('/admin/stats'),
  listUsers: (params) => get('/admin/users', params),
  changeRole: (id, role) => request('PATCH', `/admin/users/${id}/role`, { role }),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`)
};
