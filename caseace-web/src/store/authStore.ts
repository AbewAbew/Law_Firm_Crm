// src/store/authStore.ts
import { create } from 'zustand';
import api from '@/lib/axios';

// Define the shape of our user and store state
interface User {
  sub: string;
  userId: string;
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Start in a loading state
  fetchUser: async () => {
    try {
      // Use the /auth/profile endpoint to get the current user's data
      const response = await api.get('/auth/profile');
      console.log('User profile response:', response.data);
      set({ user: response.data, isLoading: false });
    } catch (error) {
      // If the cookie is invalid or expired, this will fail
      console.error('Failed to fetch user', error);
      set({ user: null, isLoading: false });
    }
  },
  logout: () => {
    // We can add a backend /auth/logout endpoint later if needed
    set({ user: null });
  },
}));