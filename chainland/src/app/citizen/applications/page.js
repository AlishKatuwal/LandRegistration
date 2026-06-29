'use client';
import { useAuth } from '@/context/AuthContext';
import { FileText, CheckCircle, Clock, AlertTriangle, MapPin, ArrowRight, XCircle, Filter, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const typePill = { TRANSFER: 'bg-orange-100 text-orange-700 border-orange-200', REGISTRATION: 'bg-blue-100 text-blue-700 border-blue-200', NAMSARI: 'bg-purple-100 text-purple-700 border-purple-200', 'DA-KHA': 'bg-teal-100 text-teal-700 border-teal-200', ROKKA_LIFT: 'bg-red-100 text-red-700 border-red-200' };
const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending' },
  buyer_action_pending: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Buyer Action' },
  under_review: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Under Review' },
  payment_pending: { icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Payment Pending' },
  payment_submitted: { icon: Clock, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Payment Submitted' },
  payment_verified: { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Payment Verified' },
  approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
  need_correction: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Needs Correction' }
};

export default function ApplicationsPage() {
  const { user, t } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('all');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user?.lin) return;
    Promise.all([
      fetch(`http://localhost:5001/api/applications?applicantLin=${user.lin}`).then(r => r.json()),
      fetch(`http://localhost:5001/api/applications?buyerLin=${user.lin}`).then(r => r.json())
    ]).then(([sellerData, buyerData]) => {
      const sellerApps = sellerData.success ? sellerData.data : [];
      const buyerApps = buyerData.success ? buyerData.data : [];
      const combined = [...sellerApps, ...buyerApps.filter(b => !sellerApps.find(s => s.id === b.id))];
      setApps(combined);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, [user?.lin]);

  const activeApps = apps.filter(a => !['approved', 'rejected'].includes(a.status));
  const completedApps = apps.filter(a => ['approved', 'rejected'].includes(a.status));
  const displayApps = tab === 'active' ? activeApps : tab === 'completed' ? completedApps : apps;
  const filtered = displayApps.filter(a => a.id.toLowerCase().includes(searchTerm.toLowerCase()) || (a.kitta || '').toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return (
    <div className="p-12 text-center animate-fade-up">
      <div className="animate-spin w-10 h-10 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-sm font-medium text-slate-500 font-sans">{t('Synchronizing application records...', 'आवेदन रेकर्डहरू सिङ्क्रोनाइज गर्दै...')}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] px-2 py-0.5 rounded-full text-[10px] font-semibold">हाम्रो ट्र्याकिङ</span>
            <span className="text-xs text-slate-400 font-medium">Application Tracking System</span>
          </div>
          <h1 className="font-serif text-[28px] font-extrabold text-slate-900 tracking-tight leading-tight">{t('My Applications', 'मेरा आवेदनहरू')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('Monitor the legal status of your active land requests', 'तपाईंका सक्रिय जग्गा अनुरोधहरूको कानुनी स्थिति निगरानी गर्नुहोस्')}</p>
        </div>
        <button
          onClick={() => router.push('/citizen/register-land')}
          className="bg-slate-900 text-white px-6 py-3 rounded-full text-[13px] font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
        >
          <FileText size={15} /> {t('New Application', 'नयाँ आवेदन')}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('Total Applications', 'कुल आवेदन'), val: apps.length, color: 'text-slate-900' },
          { label: t('Under Review', 'प्रगतिमा'), val: activeApps.length, color: 'text-amber-600' },
          { label: t('Approved / Final', 'सम्पन्न'), val: completedApps.length, color: 'text-emerald-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[24px] border border-black/5 p-6 shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">{stat.label}</p>
            <p className={`text-3xl font-serif font-extrabold ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-4 py-2">
        <div className="flex gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-black/5">
          {[
            ['all', 'All', 'सबै'], 
            ['active', 'In Progress', 'प्रगतिमा'], 
            ['completed', 'Completed', 'सम्पन्न']
          ].map(([val, en, np]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              className={`px-6 py-2 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all ${tab === val ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
            >
              {t(en, np)}
            </button>
          ))}
        </div>
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-crimson-600 transition-colors" />
          <input
            type="text"
            placeholder={t('Search ID or Kitta...', 'ID वा कित्ताले खोज्नुहोस्...')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-11 pr-5 py-3 bg-white border border-black/5 rounded-2xl text-[13px] outline-none transition-all focus:ring-4 focus:ring-crimson-600/5 focus:border-crimson-600/20 w-64 shadow-sm"
          />
        </div>
      </div>

      {/* Application list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-black/5 p-20 text-center animate-fade-up">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-slate-200" />
          </div>
          <p className="text-slate-500 font-medium italic">{t('No matching applications found', 'कुनै आवेदन भेटिएन')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-black/5 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-50">
            {filtered.map((app, i) => {
              const config = statusConfig[app.status] || statusConfig.pending;
              const Icon = config.icon;
              const isBuyer = app.buyer_lin === user?.lin;
              return (
                <div 
                  key={app.id} 
                  onClick={() => router.push('/citizen/transfers')} 
                  className="flex items-center gap-6 px-8 py-5 hover:bg-slate-50/80 transition-all cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${typePill[app.type]?.split(' ')[0] || 'bg-slate-100'}`}>
                    <FileText size={20} className={typePill[app.type]?.split(' ')[1] || 'text-slate-400'} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-base font-extrabold text-slate-900">{app.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest border uppercase ${typePill[app.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {(app.type || 'UNKNOWN').replace(/_/g, ' ')}
                      </span>
                      {isBuyer && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white shadow-sm shadow-blue-600/10 tracking-widest">
                          BUYER
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <MapPin size={12} className="text-slate-300" />
                      <span>{t('Kitta', 'कित्ता')}: <strong className="font-mono text-slate-600">{app.kitta}</strong></span>
                      {app.district && <span className="flex items-center gap-2"><span className="w-1 h-1 bg-slate-200 rounded-full" /> {app.district}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <div className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 border ${config.bg} ${config.color} ${config.bg.replace('bg-', 'border-')}/50 shadow-sm`}>
                      <Icon size={12} />
                      {config.label}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
