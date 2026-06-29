'use client';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Clock, Scale, Coins, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const typePill = {
  REGISTRATION: 'bg-blue-100 text-blue-700',
  TRANSFER: 'bg-orange-100 text-orange-700',
  NAMSARI: 'bg-purple-100 text-purple-700',
  'DA-KHA': 'bg-teal-100 text-teal-700',
  ROKKA_LIFT: 'bg-red-100 text-red-700',
};

export default function OfficerDashboard() {
  const { t } = useAuth();
  const router = useRouter();
  const [data, setData] = useState({
    applications: [],
    parcels: [],
    disputes: [],
    activities: [],
    loading: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, parcelsRes, disputesRes, activitiesRes] = await Promise.all([
          fetch('http://localhost:5001/api/applications'),
          fetch('http://localhost:5001/api/parcels'),
          fetch('http://localhost:5001/api/disputes'),
          fetch('http://localhost:5001/api/activities')
        ]);

        const [appsData, parcelsData, disputesData, activitiesData] = await Promise.all([
          appsRes.json(),
          parcelsRes.json(),
          disputesRes.json(),
          activitiesRes.json()
        ]);

        setData({
          applications: appsData.success ? appsData.data : [],
          parcels: parcelsData.success ? parcelsData.data : [],
          disputes: disputesData.success ? disputesData.data : [],
          activities: activitiesData.success ? activitiesData.data : [],
          loading: false
        });
      } catch (error) {
        console.error('Officer Dashboard Fetch Error:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchData();
  }, []);

  const { applications, parcels, disputes, activities: activityFeed, loading } = data;
  const pendingApps = applications.filter(a => a.status === 'pending');
  const activeRokka = parcels.filter(p => p.status === 'rokka').length;
  const tiroOverdue = parcels.filter(p => p.tiro_status === 'overdue').length;
  const disputeCount = disputes.length;

  const kpis = [
    { label: t('Pending Applications', 'बाँकी आवेदनहरू'), value: pendingApps.length, sub: t('Requires Action', 'कार्य आवश्यक'), icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', link: '/officer/transfers' },
    { label: t('Active Rokka', 'सक्रिय रोक्का'), value: activeRokka, sub: t('Encumbrances', 'रोक्काहरू'), icon: AlertTriangle, color: 'from-red-500 to-rose-500', bg: 'bg-red-50', text: 'text-red-700', link: '/officer/parcels' },
    { label: t('Tiro Overdue', 'तिरो बाँकी'), value: tiroOverdue, sub: t('Parcels', 'कित्ताहरू'), icon: Coins, color: tiroOverdue > 0 ? 'from-red-600 to-red-500' : 'from-green-500 to-emerald-500', bg: tiroOverdue > 0 ? 'bg-red-50' : 'bg-green-50', text: tiroOverdue > 0 ? 'text-red-700' : 'text-green-700', link: '/officer/tiro' },
    { label: t('Disputes This Month', 'यो महिनाको विवाद'), value: disputeCount, sub: t('Active Cases', 'सक्रिय केसहरू'), icon: Scale, color: 'from-purple-500 to-violet-500', bg: 'bg-purple-50', text: 'text-purple-700', link: '/officer/disputes' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('Dashboard', 'ड्यासबोर्ड')}</h1>
        <p className="text-sm text-slate-500">{t('Overview of land registry operations', 'भूमि दर्ता कार्यहरूको सारांश')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} onClick={() => kpi.link && router.push(kpi.link)} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold text-slate-800">{kpi.value}</p>
                <p className={`text-[11px] mt-1 font-medium ${kpi.text}`}>{kpi.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg`}>
                <kpi.icon size={18} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Pending Queue */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">{t('Pending Queue', 'बाँकी लाइन')}</h3>
            <span className="text-xs text-slate-400">{pendingApps.length} {t('items', 'वटा')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-medium">{t('Application ID', 'आवेदन ID')}</th>
                  <th className="text-left px-3 py-3 font-medium">{t('Type', 'प्रकार')}</th>
                  <th className="text-left px-3 py-3 font-medium">{t('Applicant', 'आवेदक')}</th>
                  <th className="text-left px-3 py-3 font-medium">{t('Kitta', 'कित्ता')}</th>
                  <th className="text-left px-3 py-3 font-medium">{t('Submitted', 'पेश मिति')}</th>
                  <th className="text-left px-3 py-3 font-medium">{t('Priority', 'प्राथमिकता')}</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} onClick={() => router.push('/officer/transfers')} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-blue-govt">{app.id}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${typePill[app.type] || 'bg-slate-100 text-slate-600'}`}>
                        {(app.type || 'UNKNOWN').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700 text-xs">{app.applicant}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{app.kitta}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{app.submitted}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${app.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                        {app.priority === 'high' ? '🔴 HIGH' : 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-3 py-3"><ChevronRight size={14} className="text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">{t('Activity Feed', 'गतिविधि फिड')}</h3>
          </div>
          <div className="p-4 space-y-3">
            {activityFeed.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">{t('No recent activity', 'हालैको कुनै गतिविधि छैन')}</div>
            ) : (
              activityFeed.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="text-lg">{item.activity_type === 'application' ? '📋' : '⚖️'}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{item.id} - {(item.type || 'Activity').toUpperCase()}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{(item.status || 'Pending').toUpperCase()} • {new Date(item.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
