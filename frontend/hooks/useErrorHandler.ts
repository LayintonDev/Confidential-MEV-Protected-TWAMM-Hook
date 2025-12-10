'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

/**
 * Global notification store for displaying errors, warnings, and messages
 */
export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = uuidv4();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, newNotification.duration);
    }

    return id;
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));

/**
 * Hook to show errors with automatic retry support
 */
export function useErrorHandler() {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return {
    showError: (error: Error | string, options?: { title?: string; retryable?: boolean; onRetry?: () => void }) => {
      const title = options?.title || 'Error';
      const message = typeof error === 'string' ? error : error.message;

      const notificationId = addNotification({
        type: 'error',
        title,
        message,
        duration: 8000,
        action: options?.retryable && options?.onRetry ? {
          label: 'Retry',
          onClick: () => {
            useNotificationStore.getState().removeNotification(notificationId);
            options.onRetry?.();
          },
        } : undefined,
      });

      return notificationId;
    },
    showWarning: (message: string, title = 'Warning') => {
      return addNotification({
        type: 'warning',
        title,
        message,
        duration: 6000,
      });
    },
    showSuccess: (message: string, title = 'Success') => {
      return addNotification({
        type: 'success',
        title,
        message,
        duration: 4000,
      });
    },
    showInfo: (message: string, title = 'Info') => {
      return addNotification({
        type: 'info',
        title,
        message,
        duration: 5000,
      });
    },
  };
}
