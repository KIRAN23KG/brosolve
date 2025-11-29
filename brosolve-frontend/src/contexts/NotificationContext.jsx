// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { AuthContext } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);

      // Show browser push notifications for new unread items
      if (res.data.unreadCount > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const unreadNotifications = res.data.notifications.filter(n => !n.isRead);
        if (unreadNotifications.length > 0 && document.hasFocus()) {
          const latest = unreadNotifications[0];
          new Notification(latest.title || 'New notification', {
            body: latest.body || 'You have a new notification',
            icon: '/favicon.ico'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markComplaintAsRead = async (complaintId) => {
    try {
      await api.patch(`/notifications/complaint/${complaintId}/read`);
      setNotifications(prev => 
        prev.map(n => n.complaint?._id === complaintId ? { ...n, isRead: true } : n)
      );
      // Recalculate unread count
      const updated = notifications.map(n => 
        n.complaint?._id === complaintId ? { ...n, isRead: true } : n
      );
      setUnreadCount(updated.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Error marking complaint notifications as read:', err);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll for notifications every 25 seconds
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        markComplaintAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

