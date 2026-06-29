'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Mountain, LayoutDashboard, MapPin, FileText, ArrowLeftRight, FolderCheck, Scale, Coins, Bell, BarChart3, Settings, LogOut, Globe, ChevronLeft, Menu, Blocks, Activity, Fingerprint } from 'lucide-react';

const navItems = [
  { href: '/officer', icon: LayoutDashboard, label: 'Dashboard', labelNp: 'ड्यासबोर्ड' },
  { href: '/officer/registration', icon: FileText, label: 'Land Registration', labelNp: 'भूमि दर्ता' },
  { href: '/officer/transfers', icon: ArrowLeftRight, label: 'Transfer Applications', labelNp: 'हस्तान्तरण' },
  { href: '/officer/documents', icon: FolderCheck, label: 'Document Verification', labelNp: 'कागजात प्रमाणीकरण' },
  { href: '/officer/parcels', icon: MapPin, label: 'Parcel Management', labelNp: 'कित्ता व्यवस्थापन' },
  { href: '/officer/disputes', icon: Scale, label: 'Dispute Management', labelNp: 'विवाद व्यवस्थापन' },
  { href: '/officer/tiro', icon: Coins, label: 'Tiro & Tax Records', labelNp: 'तिरो र कर' },
  { href: '/officer/blockchain', icon: Blocks, label: 'Blockchain Explorer', labelNp: 'ब्लकचेन एक्सप्लोरर' },
  { href: '/officer/fraud-detection', icon: Activity, label: 'Fraud Detection', labelNp: 'धोखाधडी पत्ता' },
  { href: '/officer/zkp', icon: Fingerprint, label: 'ZKP Verification', labelNp: 'ZKP प्रमाणीकरण' },
  { href: '/officer/notifications', icon: Bell, label: 'Notifications', labelNp: 'सूचनाहरू' },
  { href: '/officer/reports', icon: BarChart3, label: 'Reports', labelNp: 'प्रतिवेदन' },
  { href: '/officer/settings', icon: Settings, label: 'Settings', labelNp: 'सेटिङ' },
];

export default function OfficerLayout({ children }) {
  const { user, logout, t, toggleLang, lang, loading, notifications, setNotifications } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Notification State
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'officer')) router.push('/');
  }, [user, loading, router]);

  // Close notification dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  // Toast listener
  const prevFirstNotifRef = useRef(null);
  useEffect(() => {
    if (notifications.length > 0) {
      const first = notifications[0];
      if (first.id !== prevFirstNotifRef.current && !first.is_read) {
        addToast(first);
        prevFirstNotifRef.current = first.id;
      }
    }
  }, [notifications]);

  const addToast = (n) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => {
      const newToasts = [...prev, { ...n, id, exiting: false }];
      if (newToasts.filter(t => !t.exiting).length > 3) {
        const firstNonExitingIdx = newToasts.findIndex(t => !t.exiting);
        if (firstNonExitingIdx !== -1) {
          newToasts[firstNonExitingIdx] = { ...newToasts[firstNonExitingIdx], exiting: true };
          setTimeout(() => setToasts(curr => curr.filter(t => t.id !== newToasts[firstNonExitingIdx].id)), 500);
        }
      }
      return newToasts;
    });
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t)), 4500);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`http://localhost:5001/api/notifications/${id}/read?userLin=${user.id}`, { method: 'PUT' });
      if (res.ok) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://localhost:5001/api/notifications/read-all?userLin=${user.id}`, { method: 'PUT' });
      if (res.ok) setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-blue-govt border-t-transparent rounded-full"></div></div>;



  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Overlay for mobile */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-navy-900 text-white transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-govt to-blue-700 rounded-lg flex items-center justify-center shrink-0">
            <Mountain size={18} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight">ChainLand</h1>
              <p className="text-[10px] text-blue-300/60 truncate">Malpot Karyalaya</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/officer' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${active ? 'bg-blue-govt/20 text-blue-300' : 'text-white/60 hover:text-white hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`}>
                <item.icon size={18} className={`shrink-0 ${active ? 'text-blue-300' : 'text-white/40 group-hover:text-white/70'}`} />
                {!collapsed && <span className="truncate">{t(item.label, item.labelNp)}</span>}
                {item.href === '/officer/notifications' && unreadCount > 0 && (
                  <span className={`bg-danger text-white text-[10px] font-bold rounded-full ${collapsed ? 'w-4 h-4 absolute -mt-5 ml-3' : 'ml-auto px-1.5 py-0.5'} flex items-center justify-center`}>{unreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-2">
          <button onClick={logout} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={18} />
            {!collapsed && <span>{t('Logout', 'लगआउट')}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700"><Menu size={20} /></button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block text-slate-400 hover:text-slate-600 transition-colors"><ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} /></button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-slate-800">{t('Malpot Karyalaya — Land Revenue Office', 'मालपोत कार्यालय')}</h2>
              <p className="text-[11px] text-slate-400">{user.office}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors">
              <Globe size={12} /> {lang === 'en' ? 'नेपाली' : 'English'}
            </button>
            <div className="relative" ref={notifRef}>
              <div 
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[9px] rounded-full flex items-center justify-center font-bold">{unreadCount}</span>}
              </div>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h4 className="font-semibold text-sm text-slate-800">{t('Notifications', 'सूचनाहरू')}</h4>
                    <span onClick={markAllRead} className="text-[10px] text-blue-600 cursor-pointer font-bold hover:underline">
                      {t('Mark all read', 'सबै पढिएको')}
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                       <div className="p-6 text-center text-xs text-slate-400">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => !n.is_read && markAsRead(n.id)}
                          className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className="pt-0.5 text-slate-400"><Bell size={14} /></div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{t(n.title, n.title_np)}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t(n.message, n.message_np)}</p>
                              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-govt to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">{user.name.charAt(0)}</div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-700">{user.name}</p>
                <p className="text-[10px] text-slate-400">{user.id}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>

      {/* Toasts */}
      <style>{`
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(100%) scale(0.9); }
        }
        .animate-toast-out {
          animation: slideOutRight 0.5s ease forwards;
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-4 flex gap-4 pointer-events-auto animate-in slide-in-from-right-10 fade-in duration-500 origin-bottom-right ${toast.exiting ? 'animate-toast-out' : ''}`}>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Bell size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{t(toast.title, toast.title_np)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-2">{t(toast.message, toast.message_np)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
