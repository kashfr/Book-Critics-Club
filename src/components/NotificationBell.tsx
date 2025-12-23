'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedBookId?: string;
  relatedProposalId?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      if (!user) return;
      
      setLoading(true);
      try {
        // Import Firestore functions for client-side read
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');
        
        // Query notifications directly from Firestore (user's subcollection)
        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        
        const fetchedNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Notification));
        
        setNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
        console.log(`Fetched ${fetchedNotifications.length} notifications`);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId?: string) => {
    if (!user) return;

    try {
      // Import Firestore functions for client-side write
      const { doc, updateDoc, collection, getDocs, writeBatch } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');

      if (notificationId) {
        // Mark single notification as read
        const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
        
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        // Mark all notifications as read using batch
        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const snapshot = await getDocs(notificationsRef);
        const batch = writeBatch(db);
        
        snapshot.docs.forEach((docSnap) => {
          if (!docSnap.data().read) {
            batch.update(docSnap.ref, { read: true });
          }
        });
        
        await batch.commit();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell icon */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg
          className="w-5 h-5 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-fuchsia-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 && (
                <div className="p-8 text-center">
                  <div className="animate-pulse h-4 w-24 bg-white/10 rounded mx-auto"></div>
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="text-3xl mb-2">🔔</div>
                  <p className="text-sm">No notifications yet</p>
                </div>
              )}

              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.type === 'proposal_dispute' ? '/proposals' : (notification.relatedBookId ? `/books/${notification.relatedBookId}` : '/proposals')}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    setIsOpen(false);
                  }}
                  className={`block p-4 hover:bg-white/5 transition-colors border-b border-white/5 ${
                    !notification.read ? 'bg-fuchsia-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Notification icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.type === 'proposal_dispute' 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-fuchsia-500/20 text-fuchsia-400'
                    }`}>
                      {notification.type === 'proposal_dispute' ? '⚠️' : '📚'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="w-2 h-2 bg-fuchsia-500 rounded-full flex-shrink-0 mt-1.5"></div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Footer */}
            <Link
              href="/proposals"
              onClick={() => setIsOpen(false)}
              className="block p-3 text-center text-xs text-fuchsia-400 hover:text-fuchsia-300 hover:bg-white/5 transition-colors border-t border-white/10"
            >
              View all activity →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
