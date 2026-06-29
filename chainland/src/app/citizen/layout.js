'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Mountain, Home, MapPin, FileText, Coins, Scale, FolderOpen, Bell, HelpCircle, LogOut, Globe, Menu, X, ArrowLeftRight, AlertTriangle, Blocks, Fingerprint } from 'lucide-react';

const navItems = [
  { href: '/citizen', icon: Home, label: 'My Dashboard', labelNp: 'मेरो ड्यासबोर्ड' },
  { href: '/citizen/land', icon: MapPin, label: 'My Land', labelNp: 'मेरो जग्गा' },
  { href: '/citizen/register-land', icon: FileText, label: 'Register New Land', labelNp: 'नयाँ जग्गा दर्ता' },
  { href: '/citizen/transfers', icon: ArrowLeftRight, label: 'Transfers', labelNp: 'हस्तान्तरण' },
  { href: '/citizen/applications', icon: FileText, label: 'Applications', labelNp: 'आवेदनहरू' },
  { href: '/citizen/tiro', icon: Coins, label: 'Tiro & Payments', labelNp: 'तिरो र भुक्तानी' },
  { href: '/citizen/disputes', icon: Scale, label: 'My Disputes', labelNp: 'विवाद' },
  { href: '/citizen/documents', icon: FolderOpen, label: 'Documents', labelNp: 'कागजपत्र' },
  { href: '/citizen/blockchain', icon: Blocks, label: 'Blockchain Proof', labelNp: 'ब्लकचेन प्रमाण' },
  { href: '/citizen/zkp', icon: Fingerprint, label: 'Zero-Knowledge Proof', labelNp: 'शून्य-ज्ञान प्रमाण' },
  { href: '/citizen/notifications', icon: Bell, label: 'Notifications', labelNp: 'सूचनाहरू' },
  { href: '/citizen/help', icon: HelpCircle, label: 'Help', labelNp: 'सहायता' },
];

export default function CitizenLayout({ children }) {
  const { user, logout, t, toggleLang, lang, loading, notifications, setNotifications } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'citizen')) router.push('/');
  }, [user, loading, router]);

  // Toast listener: whenever notifications update, if the first one is unread and new, toast it.
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
      // If more than 3, immediately mark the oldest non-exiting one as exiting
      if (newToasts.filter(t => !t.exiting).length > 3) {
        const firstNonExitingIdx = newToasts.findIndex(t => !t.exiting);
        if (firstNonExitingIdx !== -1) {
          newToasts[firstNonExitingIdx] = { ...newToasts[firstNonExitingIdx], exiting: true };
          // Remove it sooner
          setTimeout(() => {
            setToasts(curr => curr.filter(t => t.id !== newToasts[firstNonExitingIdx].id));
          }, 500);
        }
      }
      return newToasts;
    });
    
    // Start exit animation after 4.5s (0.5s before removal)
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, 4500);

    // Remove from state after 5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`http://localhost:5001/api/notifications/${id}/read?userLin=${user.lin}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    if (!user?.lin) return;
    try {
      const res = await fetch(`http://localhost:5001/api/notifications/read-all?userLin=${user.lin}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (e) { console.error(e); }
  };

  // 🔒 FIX: Lock the body and html to prevent out-of-context scrolling/rubber-banding
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = 'hidden';
    html.style.height = '100dvh'; // Dynamic viewport height for mobile
    html.style.overscrollBehavior = 'none';

    body.style.overflow = 'hidden';
    body.style.height = '100dvh';
    body.style.overscrollBehavior = 'none';

    return () => {
      // Cleanup if layout unmounts
      html.style.overflow = '';
      html.style.height = '';
      html.style.overscrollBehavior = '';
      body.style.overflow = '';
      body.style.height = '';
      body.style.overscrollBehavior = '';
    };
  }, []);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const unread = notifications.filter(n => !n.is_read).length;

  if (loading || !user) return (
    <div className="h-[100dvh] flex items-center justify-center bg-[#F5F1EA]">
      <div className="animate-spin w-10 h-10 border-4 border-crimson-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    // Root container locked to screen dimensions with no overflow bounce
    <div className="h-[100dvh] w-full flex bg-[#F5F1EA] selection:bg-crimson-200 selection:text-crimson-900 overflow-hidden overscroll-none">
      
      {/* Smooth Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setMobileOpen(false)} 
      />

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 w-72 transition-all duration-300 ease-in-out ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-none'}`}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-crimson-600 to-crimson-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-crimson-600/20">
            <Mountain size={20} />
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-lg text-slate-900 tracking-tight">ChainLand</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t("Official Portal", 'आधिकारिक पोर्टल')}</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* User card */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-crimson-600 to-rose-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">{user.lin}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Nav - overscroll-y-contain prevents pulling the body through the nav */}
        <nav className="flex-1 overflow-y-auto overscroll-y-contain py-4 px-3 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/citizen' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                  active 
                    ? 'bg-crimson-50 text-crimson-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-crimson-600 rounded-r-full" />}
                <item.icon size={18} className={`transition-colors duration-200 ${active ? 'text-crimson-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="truncate">{t(item.label, item.labelNp)}</span>
                {item.href === '/citizen/notifications' && unread > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{unread}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200">
            <LogOut size={18} /> {t('Logout', 'लगआउट')}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold tracking-widest uppercase">Blockchain Active</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors">
              <Globe size={14} /> {lang === 'en' ? 'नेपाली' : 'English'}
            </button>
            
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)} 
                className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold animate-bounce">
                    {unread}
                  </span>
                )}
              </button>
              
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-hidden flex flex-col origin-top-right animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="font-semibold text-sm text-slate-800">{t('Notifications', 'सूचनाहरू')}</h4>
                    <span 
                      onClick={markAllRead}
                      className="text-[10px] text-crimson-600 cursor-pointer font-bold hover:underline"
                    >
                      {t('Mark all read', 'सबै पढिएको')}
                    </span>
                  </div>
                  <div className="overflow-y-auto overscroll-y-contain flex-1">
                    {notifications.length === 0 ? (
                       <div className="p-6 text-center text-xs text-slate-400">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => !n.is_read && markAsRead(n.id)}
                          className={`px-5 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}
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
          </div>
        </header>

        {/* Scrollable Content Area - overscroll-y-contain stops pull-to-refresh bleeding */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto overscroll-y-contain">
          <div className="animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>

      {/* Instagram-style Toast Notifications */}
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
          <div 
            key={toast.id} 
            className={`w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 flex gap-4 pointer-events-auto animate-in slide-in-from-right-10 fade-in duration-500 origin-bottom-right ${toast.exiting ? 'animate-toast-out' : ''}`}
          >
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              {toast.icon || <Bell size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{t(toast.title, toast.title_np)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-2">{t(toast.message, toast.message_np)}</p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-300 hover:text-slate-600 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}