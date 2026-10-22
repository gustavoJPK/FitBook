/** Estado global mínimo: usuario autenticado y suscriptores. */
const listeners = new Set();
let currentUser = null;

export const auth = {
  get user() { return currentUser; },
  get isLogged() { return !!currentUser; },
  get isAdmin() { return currentUser?.role === 'admin'; },
  set(user) {
    currentUser = user;
    listeners.forEach((fn) => fn(currentUser));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
