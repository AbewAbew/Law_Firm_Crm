import { create } from 'zustand';
import api from '@/lib/axios';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  caseId?: string;
  taskId?: string;
  case?: { id: string; caseName: string };
  task?: { id: string; title: string };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  getUnreadCount: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  
  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/notifications');
      const notifications = response.data;
      const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },
  
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      set({ unreadCount: response.data });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },
  
  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      const { notifications } = get();
      const updated = notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      const unreadCount = updated.filter(n => !n.isRead).length;
      set({ notifications: updated, unreadCount });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },
  
  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      const { notifications } = get();
      const updated = notifications.map(n => ({ ...n, isRead: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },
}));