'use client';

import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotificationStore } from '@/hooks/useErrorHandler';

/**
 * Notification center component to display all notifications
 * Should be placed at the top level of your app
 */
export function NotificationCenter() {
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationProps {
  notification: ReturnType<typeof useNotificationStore.getState>['notifications'][0];
  onClose: () => void;
}

function Notification({ notification, onClose }: NotificationProps) {
  const iconClassName = 'h-5 w-5 shrink-0';
  const baseClassName = 'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 backdrop-blur-sm';

  const variants = {
    error: {
      container: `${baseClassName} border-red-700 bg-red-900/80`,
      icon: <AlertCircle className={`${iconClassName} text-red-400`} />,
      title: 'text-red-300',
      message: 'text-red-200',
    },
    warning: {
      container: `${baseClassName} border-yellow-700 bg-yellow-900/80`,
      icon: <AlertTriangle className={`${iconClassName} text-yellow-400`} />,
      title: 'text-yellow-300',
      message: 'text-yellow-200',
    },
    success: {
      container: `${baseClassName} border-green-700 bg-green-900/80`,
      icon: <CheckCircle className={`${iconClassName} text-green-400`} />,
      title: 'text-green-300',
      message: 'text-green-200',
    },
    info: {
      container: `${baseClassName} border-blue-700 bg-blue-900/80`,
      icon: <Info className={`${iconClassName} text-blue-400`} />,
      title: 'text-blue-300',
      message: 'text-blue-200',
    },
  };

  const variant = variants[notification.type];

  return (
    <div className={variant.container}>
      <div className="shrink-0">{variant.icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold text-sm mb-1 ${variant.title}`}>{notification.title}</h3>
        <p className={`text-sm ${variant.message}`}>{notification.message}</p>
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="mt-2 text-xs font-medium underline hover:no-underline transition"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 text-current opacity-50 hover:opacity-100 transition p-1"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
