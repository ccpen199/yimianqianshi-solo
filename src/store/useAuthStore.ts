import { create } from 'zustand';
import api from '../utils/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  initAuth: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ token, user, isLoading: false });
      } else {
        set({ error: response.data.error || '登录失败', isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.error || '登录失败，请稍后重试',
        isLoading: false
      });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null, isLoading: false });
  },

  initAuth: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }
}));

export default useAuthStore;
