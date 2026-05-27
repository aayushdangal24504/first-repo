import { create } from 'zustand';
import type { AuthUser, LoginInput, RegisterInput } from '@/types/ipc';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

type AuthState = {
  user: AuthUser | null;
  mode: AuthMode;
  loading: boolean;
  error: string | null;
  resetEmail: string;
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
  requestReset: (email: string) => Promise<boolean>;
  resetPassword: (input: { email: string; code: string; password: string }) => Promise<boolean>;
  setMode: (mode: AuthMode) => void;
  clearError: () => void;
};

const message = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  mode: 'login',
  loading: true,
  error: null,
  resetEmail: '',
  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const { user } = await window.avyukta.auth.getSession();
      set({ user, loading: false, mode: user ? 'login' : 'login' });
    } catch (error) {
      set({ user: null, loading: false, error: message(error, 'Could not restore session') });
    }
  },
  login: async (input) => {
    set({ loading: true, error: null });
    try {
      const result = await window.avyukta.auth.login(input);
      set({ user: result.user, loading: false });
      return true;
    } catch (error) {
      set({ error: message(error, 'Login failed'), loading: false });
      return false;
    }
  },
  register: async (input) => {
    set({ loading: true, error: null });
    try {
      const result = await window.avyukta.auth.register(input);
      set({ user: result.user, loading: false });
      return true;
    } catch (error) {
      set({ error: message(error, 'Account creation failed'), loading: false });
      return false;
    }
  },
  logout: async () => {
    await window.avyukta.auth.logout();
    set({ user: null, mode: 'login', error: null });
  },
  requestReset: async (email) => {
    set({ loading: true, error: null });
    try {
      await window.avyukta.auth.requestPasswordReset(email);
      set({ loading: false, mode: 'reset', resetEmail: email });
      return true;
    } catch (error) {
      set({ error: message(error, 'Could not send reset code'), loading: false });
      return false;
    }
  },
  resetPassword: async (input) => {
    set({ loading: true, error: null });
    try {
      await window.avyukta.auth.resetPassword(input);
      set({ loading: false, mode: 'login', resetEmail: input.email });
      return true;
    } catch (error) {
      set({ error: message(error, 'Could not reset password'), loading: false });
      return false;
    }
  },
  setMode: (mode) => set({ mode, error: null }),
  clearError: () => set({ error: null })
}));
