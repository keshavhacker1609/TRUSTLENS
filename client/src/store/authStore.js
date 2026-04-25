import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    localStorage.setItem('tl_token', token);
    localStorage.setItem('tl_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('tl_token');
    localStorage.removeItem('tl_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    try {
      const token = localStorage.getItem('tl_token');
      const userStr = localStorage.getItem('tl_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      localStorage.removeItem('tl_token');
      localStorage.removeItem('tl_user');
    }
  },
}));

export default useAuthStore;
