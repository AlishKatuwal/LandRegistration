'use client';
import { useAuth } from '@/context/AuthContext';
import { MapPin, FileText, Coins, Scale, AlertTriangle, ChevronRight, Info, X, Shield, Bell, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const statusBadge = {
  active: 'bg-green-100 text-green-700',
  rokka: 'bg-orange-100 text-orange-700',
  dispute: 'bg-red-100 text-red-700',
  pending_transfer: 'bg-yellow-100 text-yellow-700',
};
const statusLabel = {
  active: ['Active', 'सक्रिय'],
  rokka: ['Rokka', 'रोक्का'],
  dispute: ['Dispute', 'विवाद'],
  pending_transfer: ['Pending Transfer', 'हस्तान्तरण बाँकी'],
};
const tiroColors = {
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  due: 'bg-yellow-100 text-yellow-700',
};

export default function CitizenDashboard() {
  const { user, t, notifications, setNotifications } = useAuth();
  const router = useRouter();
  const [data, setData] = useState({
    parcels: [],
    applications: [],
    disputes: [],
    activities: [],
    loading: true
  });
  const [alerts, setAlerts] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!user?.lin) return;

    const fetchData = async () => {
      try {
        const [parcelsRes, appsRes, disputesRes, activitiesRes, notificationsRes] = await Promise.all([
          fetch(`http://localhost:5001/api/parcels?ownerLin=${user.lin}`),
          fetch(`http://localhost:5001/api/applications?applicantLin=${user.lin}`),
          fetch(`http://localhost:5001/api/disputes?claimantLin=${user.lin}`),
          fetch(`http://localhost:5001/api/activities?userLin=${user.lin}`),
          fetch(`http://localhost:5001/api/notifications?userLin=${user.lin}`)
        ]);

        const [parcelsData, appsData, buyerAppsData, disputesData, activitiesData, notificationsData] = await Promise.all([
          parcelsRes.json(),
          appsRes.json(),
          fetch(`http://localhost:5001/api/applications?buyerLin=${user.lin}`).then(r => r.json()),
          disputesRes.json(),
          activitiesRes.json(),
          notificationsRes.json()
        ]);

        const combinedApps = [
          ...(appsData.success ? appsData.data : []),
          ...(buyerAppsData.success ? buyerAppsData.data : [])
        ];
        // Deduplicate by id — a citizen can appear as both applicant (seller)
        // AND buyer of the same application, causing the same app to be returned
        // by both API calls → duplicate React keys. Map deduplicates by id.
        const deduplicatedApps = Array.from(
          new Map(combinedApps.map(a => [a.id, a])).values()
        );

        setData({
          parcels: parcelsData.success ? parcelsData.data : [],
          applications: deduplicatedApps,
          disputes: disputesData.success ? disputesData.data : [],
          activities: activitiesData.success ? activitiesData.data : [],
          loading: false
        });

        if (notificationsData.success) {
          let newAlerts = notificationsData.data
            .filter(n => !n.is_read)
            .map(n => ({
              id: n.id,
              type: n.type === 'tiro' ? 'danger' : 'info',
              icon: n.icon || '🔔',
              text: t(n.message, n.message_np)
            }));
          
          // Add system alerts for pending buyer actions
          const pendingBuyerApps = combinedApps.filter(a => a.buyer_lin === user.lin && a.status === 'buyer_action_pending');
          pendingBuyerApps.forEach(app => {
            newAlerts.push({
              id: `buyer-${app.id}`,
              type: 'warning',
              icon: '🤝',
              text: t(`Action Required: Confirm land purchase for Kitta ${app.kitta}`, `कार्य आवश्यक: कित्ता ${app.kitta} को लागि जग्गा खरिद पुष्टि गर्नुहोस्`),
              link: `/citizen/land/transfer/confirm/${app.id}`
            });
          });

          setAlerts(newAlerts);
        }
      } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchData();
  }, [user?.lin]);

  const { parcels: myParcels, applications: myApps, disputes: myDisputes, activities: myActivities, loading } = data;
  const worstTiro = myParcels.reduce((w, p) => p.tiro_status === 'overdue' ? 'overdue' : p.tiro_status === 'due' && w !== 'overdue' ? 'due' : w, 'paid');

  const cards = [
    { label: t('Your Land Parcels', 'तपाईंका जग्गा कित्ता'), value: myParcels.length, sub: t('View All', 'सबै हेर्नुहोस्'), icon: MapPin, gradient: 'from-emerald-500 to-teal-500', link: '/citizen/land' },
    { label: t('Pending Applications', 'बाँकी आवेदनहरू'), value: myApps.filter(a => a.status === 'pending').length, sub: t('Active', 'सक्रिय'), icon: FileText, gradient: 'from-blue-500 to-indigo-500', link: '/citizen/applications' },
    { label: t('Tiro Status', 'तिरो स्थिति'), value: (worstTiro || 'PAID').toUpperCase(), sub: t('Most urgent', 'सबैभन्दा जरुरी'), icon: Coins, gradient: worstTiro === 'overdue' ? 'from-red-500 to-rose-500' : worstTiro === 'due' ? 'from-amber-500 to-orange-500' : 'from-green-500 to-emerald-500', link: '/citizen/tiro' },
    { label: t('Active Disputes', 'सक्रिय विवाद'), value: myDisputes.length, sub: myDisputes.length > 0 ? t('Action needed', 'कार्य आवश्यक') : t('No disputes', 'विवाद छैन'), icon: Scale, gradient: myDisputes.length > 0 ? 'from-red-500 to-pink-500' : 'from-slate-400 to-slate-500', link: '/citizen/disputes' },
  ];

  const alertColors = { danger: 'bg-red-50 border-red-200 text-red-800', warning: 'bg-amber-50 border-amber-200 text-amber-800', info: 'bg-blue-50 border-blue-200 text-blue-800' };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-crimson-600 to-rose-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-crimson-600/20">{user.name.charAt(0)}</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{t(`Namaste, ${user.name}`, `नमस्ते, ${user.nameNp || user.name}`)}</h1>
            <p className="text-sm text-slate-500">{t('Welcome to your land portal', 'तपाईंको जग्गा पोर्टलमा स्वागत छ')}</p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-crimson-600 hover:border-crimson-100 transition-all relative shadow-sm"
          >
            <Bell size={22} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-crimson-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Notifications</h4>
                <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-slate-400 hover:text-crimson-600 uppercase">Clear All</button>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Info size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 leading-tight mb-0.5">{n.title || 'Notification'}</p>
                          <p className="text-[11px] text-slate-500 leading-snug">{n.text}</p>
                          <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={10} /> {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                   <button onClick={() => setShowNotifs(false)} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest">Close Panel</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* High-Priority Tasks (e.g. Buyer Confirmation) */}
      {data.applications.filter(a => a.buyer_lin === user.lin && a.status === 'buyer_action_pending').map(app => (
        <div key={app.id} className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-200 animate-pulse-subtle flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Shield size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Action Required: Complete Purchase Registration</h3>
              <p className="text-sm opacity-90 leading-tight">Seller has initiated transfer for Kitta {app.kitta}. You must verify your identity and accept terms to proceed.</p>
            </div>
          </div>
          <button 
            onClick={() => router.push(`/citizen/land/transfer/confirm/${app.id}`)}
            className="px-8 py-3 bg-white text-orange-600 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all shrink-0"
          >
            Register My Intent Now
          </button>
        </div>
      ))}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Link key={i} href={c.link || '#'} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer group block">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{c.label}</p>
                <p className="text-3xl font-bold text-slate-800">{c.value}</p>
                <p className="text-[11px] mt-1 text-slate-400 group-hover:text-crimson-600 transition-colors flex items-center gap-1">{c.sub} <ChevronRight size={10} /></p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-lg`}>
                <c.icon size={18} className="text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">{t('Recent Activity', 'हालको गतिविधि')}</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {myActivities.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">{t('No recent activity', 'हालैको कुनै गतिविधि छैन')}</div>
          ) : (
            myActivities.map((item, i) => (
              <div key={i} className="flex gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <span className="text-lg">{item.activity_type === 'application' ? '📋' : '⚖️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 font-medium">{item.id} - {(item.type || 'Activity').toUpperCase()}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{(item.status || 'Pending').toUpperCase()} • {new Date(item.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
