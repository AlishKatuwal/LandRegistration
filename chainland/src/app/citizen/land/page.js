'use client';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Download, Shield, AlertTriangle, ArrowRight, ChevronRight, FileText, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MapEditor from '@/components/MapEditor';

const statusBadge = { active: 'bg-green-100 text-green-700 border-green-200', rokka: 'bg-orange-100 text-orange-700 border-orange-200', dispute: 'bg-red-100 text-red-700 border-red-200', pending_transfer: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
const statusLabel = { active: ['ACTIVE', 'सक्रिय'], rokka: ['ROKKA', 'रोक्का'], dispute: ['UNDER DISPUTE', 'विवादमा'], pending_transfer: ['PENDING TRANSFER', 'हस्तान्तरण बाँकी'] };

export default function MyLandPage() {
  const { user, t } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [myParcels, setMyParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchParcels = async () => {
      if (!user?.lin) return;
      try {
        const res = await fetch(`http://localhost:5001/api/parcels?ownerLin=${user.lin}`);
        const data = await res.json();
        if (data.success) setMyParcels(data.data);
      } catch (err) {
        console.error('Error fetching parcels', err);
      } finally {
        setLoading(false);
      }
    };
    fetchParcels();
  }, [user?.lin]);

  useEffect(() => {
    if (selected) {
      fetch(`http://localhost:5001/api/history/${selected}`)
        .then(res => res.json())
        .then(data => { if (data.success) setHistory(data.data); })
        .catch(e => console.error(e));
    } else {
      setHistory([]);
    }
  }, [selected]);

  const parcel = selected ? myParcels.find(p => p.id === selected) : null;

  if (loading) return (
    <div className="p-12 text-center animate-fade-up">
      <div className="animate-spin w-10 h-10 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-sm font-medium text-slate-500 font-sans">{t('Accessing secure land records...', 'सुरक्षित जग्गा रेकर्डहरू पहुँच गर्दै...')}</p>
    </div>
  );

  if (parcel) return (
    <div className="space-y-6 animate-fade-up font-sans">
      <button onClick={() => setSelected(null)} className="text-[13px] text-slate-500 hover:text-slate-900 font-bold flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 transition-all shadow-sm">
        ← {t('Back to My Land', 'मेरो जग्गामा फर्कनुहोस्')}
      </button>

      {/* Lalpurja summary */}
      <div className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-crimson-50 rounded-2xl flex items-center justify-center">
                <FileText size={24} className="text-crimson-600" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-extrabold text-slate-900 tracking-tight leading-tight">{t('Lalpurja — Land Certificate', 'लालपुर्जा — जग्गा प्रमाणपत्र')}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${statusBadge[parcel.status] || 'bg-slate-100'}`}>{t(...(statusLabel[parcel.status] || ['UNKNOWN', 'अज्ञात']))}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Verified by Malpot', 'मालपोत द्वारा प्रमाणित')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-6">
              {[
                { label: t('Kitta Number', 'कित्ता नम्बर'), val: parcel.id, mono: true },
                { label: t('Owner', 'मालिक'), val: user.name },
                { label: 'LIN', val: user.lin, mono: true },
                { label: t('Area', 'क्षेत्रफल'), val: `${parcel.area} ${parcel.area_unit} (${parcel.area_sqm || '-'} sq.m)` },
                { label: t('District', 'जिल्ला'), val: parcel.district },
                { label: t('Municipality', 'नगरपालिका'), val: parcel.municipality },
                { label: t('Ward No.', 'वडा'), val: parcel.ward },
                { label: t('Registered', 'दर्ता मिति'), val: parcel.registered_date ? new Date(parcel.registered_date).toLocaleDateString() : 'N/A' }
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{item.label}</p>
                  <p className={`text-sm font-semibold text-slate-800 ${item.mono ? 'font-mono' : ''}`}>{item.val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full text-[13px] font-bold hover:bg-slate-800 transition-all shadow-lg">
              <Download size={15} /> {t('Download Certificate', 'प्रमाणपत्र डाउनलोड')}
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-full text-[13px] font-bold hover:bg-slate-50 transition-all">
              <Shield size={15} className="text-emerald-600" /> {t('Verify on Chain', 'चेनमा प्रमाणित गर्नुहोस्')}
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map View */}
        <div className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
          <h3 className="font-serif font-extrabold text-slate-900 text-lg mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-crimson-600" /> {t('Parcel Geometry', 'कित्ताको स्थान')}
          </h3>
          <div className="w-full h-[350px] rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
            <MapEditor 
              readOnly={true} 
              initialPolygon={typeof parcel.coordinates === 'string' ? JSON.parse(parcel.coordinates) : parcel.coordinates} 
            />
          </div>
        </div>

        {/* Ownership Timeline */}
        <div className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm overflow-hidden">
          <h3 className="font-serif font-extrabold text-slate-900 text-lg mb-6 flex items-center gap-2">
            <Clock size={18} className="text-crimson-600" /> {t('Ownership History', 'स्वामित्व इतिहास')}
          </h3>
          <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {history.length > 0 ? history.map((e, i) => (
              <div key={i} className="relative animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-crimson-600 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-crimson-600" />
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-crimson-200 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-crimson-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{e.remarks || 'Transfer'}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(e.transfer_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-800">{e.prev_owner_name ? `${e.prev_owner_name} → ` : ''}{e.new_owner_name || 'System'}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-tighter">Application Hash: {e.application_id}</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center">
                <Clock size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium italic">{t('No history records available', 'कुनै इतिहास उपलब्ध छैन')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('Initiate Transfer', 'हस्तान्तरण सुरु'), icon: ArrowRight, color: 'hover:border-blue-500 hover:text-blue-600', disabled: parcel.status !== 'active' || parcel.tiro_status === 'overdue' },
          { label: t('Apply for Partition', 'दा-खा आवेदन'), icon: FileText, color: 'hover:border-purple-500 hover:text-purple-600', disabled: parcel.status !== 'active' },
          { label: t('Download Lalpurja PDF', 'लालपुर्जा PDF'), icon: Download, color: 'hover:border-crimson-500 hover:text-crimson-600', disabled: false },
          { label: t('Pay Tiro', 'तिरो तिर्नुहोस्'), icon: '💰', color: 'hover:border-amber-500 hover:text-amber-600', disabled: parcel.tiro_status === 'paid' },
        ].map((act, i) => (
          <button 
            key={i} 
            disabled={act.disabled} 
            onClick={() => {
              if (act.label.includes('Initiate Transfer') || act.label.includes('हस्तान्तरण सुरु')) {
                router.push(`/citizen/land/transfer/${parcel.id}`);
              }
            }}
            className={`flex items-center justify-between gap-2 px-6 py-5 rounded-[24px] text-sm font-bold transition-all ${act.disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed grayscale' : `bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 ${act.color}`}`}
          >
            <div className="flex items-center gap-3">
              {typeof act.icon === 'string' ? <span className="text-xl">{act.icon}</span> : <act.icon size={20} />}
              {act.label}
            </div>
            {!act.disabled && <ChevronRight size={16} className="opacity-30" />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-up font-sans">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] px-2 py-0.5 rounded-full text-[10px] font-semibold">मेरो विवरण</span>
          <span className="text-xs text-slate-400 font-medium">Digital Land Registry</span>
        </div>
        <h1 className="font-serif text-[32px] font-extrabold text-slate-900 tracking-tight leading-tight">{t('My Land Holdings', 'मेरो जग्गा')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('Manage your registered land parcels and ownership documents', 'तपाईंका दर्ता भएका जग्गा कित्ताहरू र स्वामित्व कागजातहरू व्यवस्थापन गर्नुहोस्')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {myParcels.map(p => (
          <div 
            key={p.id} 
            className="bg-white rounded-[32px] border border-black/5 p-7 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden" 
            onClick={() => setSelected(p.id)}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[64px] flex items-center justify-center translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-all">
              <MapPin size={24} className="text-crimson-600/20 translate-x-1 -translate-y-1" />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-crimson-50 rounded-xl flex items-center justify-center">
                <MapPin size={20} className="text-crimson-600" />
              </div>
              <div>
                <span className="font-mono font-extrabold text-slate-900 text-lg leading-none">{p.id}</span>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kitta / Parcel ID</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${statusBadge[p.status] || 'bg-slate-100'}`}>{t(...(statusLabel[p.status] || ['UNKNOWN', 'अज्ञात']))}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${p.tiro_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {t('TIRO', 'तिरो')}: {(p.tiro_status || 'paid').toUpperCase()}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[13px] font-bold text-slate-700">{t(p.district, p.district_np || p.district)}, {t(p.municipality, p.municipality_np || p.municipality)}</p>
                <p className="text-xs text-slate-400 font-medium">{p.area} {p.area_unit} • Ward {p.ward} • {t(p.land_class, p.land_class_np || p.land_class)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-slate-50">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">{t('View Details', 'विवरण हेर्नुहोस्')}</span>
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center scale-0 group-hover:scale-100 transition-all shadow-lg shadow-slate-900/20">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        ))}

        {/* Add Land Placeholder */}
        <div 
          onClick={() => router.push('/citizen/register-land')}
          className="rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 hover:border-crimson-300 hover:bg-crimson-50/30 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-crimson-100 transition-colors">
            <span className="text-3xl text-slate-300 group-hover:text-crimson-600 transition-colors">+</span>
          </div>
          <p className="font-bold text-slate-400 group-hover:text-crimson-700 transition-colors">{t('Register New Land', 'नयाँ जग्गा दर्ता')}</p>
        </div>
      </div>
    </div>
  );
}
