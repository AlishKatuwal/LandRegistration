'use client';
import { useAuth } from '@/context/AuthContext';
import { Bell, Check, CheckCircle, Trash2, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';

const typeConfig = {
  tiro: { bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-400', label: 'Tiro' },
  application: { bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-400', label: 'Application' },
  dispute: { bg: 'bg-purple-50', border: 'border-purple-100', dot: 'bg-purple-400', label: 'Dispute' },
  transfer: { bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-400', label: 'Transfer' },
  system: { bg: 'bg-slate-50', border: 'border-slate-100', dot: 'bg-slate-400', label: 'System' },
};

export default function NotificationsPage() {
  const { user, t, notifications, setNotifications } = useAuth();
  const [filter, setFilter] = useState('all');

  const markAllRead = async () => {
    if (!user?.lin) return;
    try {
      const res = await fetch(`http://localhost:5001/api/notifications/read-all?userLin=${user.lin}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } else {
        console.error('Failed to mark all as read:', await res.text());
      }
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  const markAsRead = async (id) => {
    if (!user?.lin) return;
    try {
      const res = await fetch(`http://localhost:5001/api/notifications/${id}/read?userLin=${user.lin}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      } else {
        console.error('Failed to mark as read:', await res.text());
      }
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications.filter(n => n.type === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{t('Notifications', 'सूचनाहरू')}</h1>
            {unreadCount > 0 && (
              <span className="bg-crimson-100 text-crimson-700 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} {t('new', 'नयाँ')}</span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{t('Stay updated on your land activities', 'तपाईंका जग्गा गतिविधिहरू बारे जानकारी')}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-4 py-2 text-xs text-crimson-600 font-bold bg-crimson-50 rounded-xl hover:bg-crimson-100 transition-all flex items-center gap-2">
            <CheckCircle size={14} /> {t('Mark all as read', 'सबै पढिएको')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ['all', 'All', 'सबै'],
          ['unread', `Unread (${unreadCount})`, `नपढिएको (${unreadCount})`],
          ['application', 'Applications', 'आवेदन'],
          ['tiro', 'Tiro', 'तिरो'],
          ['transfer', 'Transfers', 'हस्तान्तरण'],
          ['dispute', 'Disputes', 'विवाद'],
        ].map(([val, en, np]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filter === val
                ? 'bg-crimson-600 text-white shadow-sm'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-crimson-200 hover:text-crimson-600'
            }`}
          >
            {t(en, np)}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Bell size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-500 font-medium">{t('No notifications', 'कुनै सूचना छैन')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('You\'re all caught up!', 'सबै अपडेट भइसकेको छ!')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(n => {
              const config = typeConfig[n.type] || typeConfig.system;
              return (
                <div key={n.id} onClick={() => !n.is_read && markAsRead(n.id)} className={`flex items-start gap-3.5 px-5 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/20 border-l-2 border-l-crimson-500' : 'border-l-2 border-l-transparent'}`}>
                  <div className={`w-10 h-10 rounded-xl ${config.bg} ${config.border} border flex items-center justify-center text-lg shrink-0`}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-semibold ${!n.is_read ? 'text-slate-900' : 'text-slate-600'}`}>{t(n.title, n.title_np)}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.border} border`}>{config.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{t(n.message, n.message_np)}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-crimson-500 mt-2 shrink-0 ring-2 ring-crimson-100" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
