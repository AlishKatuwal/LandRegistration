'use client';
import { useAuth } from '@/context/AuthContext';
import { Search, MapPin, Lock, Unlock, ChevronRight, Shield, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import MapEditor from '@/components/MapEditor';

export default function ParcelsPage() {
  const { t } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5001/api/parcels')
      .then(res => res.json())
      .then(data => { if (data.success) setParcels(data.data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

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

  const filtered = parcels.filter(p => p.id.toLowerCase().includes(search.toLowerCase()) || p.district.toLowerCase().includes(search.toLowerCase()));
  const parcel = selected ? parcels.find(p => p.id === selected) : null;

  const statusColor = { active: 'bg-green-100 text-green-700', rokka: 'bg-orange-100 text-orange-700', dispute: 'bg-red-100 text-red-700', pending_transfer: 'bg-yellow-100 text-yellow-700' };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading all registry parcels...</div>;

  if (parcel) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelected(null)} className="text-sm text-blue-govt hover:text-blue-800 font-medium">← {t('Back to Parcels', 'कित्ताहरूमा फर्कनुहोस्')}</button>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-slate-800">{parcel.id}</h2>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColor[parcel.status] || 'bg-slate-100'}`}>{parcel.status.toUpperCase()}</span>
              </div>
              <p className="text-sm text-slate-500">{parcel.district} &gt; {parcel.municipality} &gt; Ward {parcel.ward}</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-200 flex items-center gap-1.5"><Lock size={12} /> {t('Place Rokka', 'रोक्का लगाउनुहोस्')}</button>
              <button className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 flex items-center gap-1.5"><Unlock size={12} /> {t('Lift Rokka', 'रोक्का हटाउनुहोस्')}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-[10px] text-slate-400 uppercase">{t('Owner', 'मालिक')}</p><p className="font-semibold">{parcel.owner_lin}</p></div>
            <div><p className="text-[10px] text-slate-400 uppercase">LIN</p><p className="font-mono text-xs">{parcel.owner_lin}</p></div>
            <div><p className="text-[10px] text-slate-400 uppercase">{t('Area', 'क्षेत्रफल')}</p><p>{parcel.area} {parcel.area_unit}</p></div>
            <div><p className="text-[10px] text-slate-400 uppercase">{t('Class', 'वर्ग')}</p><p>{parcel.land_class}</p></div>
            <div><p className="text-[10px] text-slate-400 uppercase">{t('Type', 'प्रकार')}</p><p>{parcel.land_type}</p></div>
            <div><p className="text-[10px] text-slate-400 uppercase">{t('Registered', 'दर्ता')}</p><p>{parcel.registered_date ? new Date(parcel.registered_date).toLocaleDateString() : 'N/A'}</p></div>
            <div><p className="text-[10px] text-slate-400 uppercase">{t('Tiro', 'तिरो')}</p><p className={parcel.tiro_status === 'overdue' ? 'text-red-600 font-bold' : ''}>{(parcel.tiro_status || 'paid').toUpperCase()}</p></div>
            {parcel.rokka_reason && <div><p className="text-[10px] text-slate-400 uppercase">{t('Rokka Reason', 'रोक्का कारण')}</p><p className="text-orange-600 font-semibold">{parcel.rokka_reason}</p></div>}
          </div>
        </div>

        {/* Map View */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">{t('Parcel Location', 'कित्ताको स्थान')}</h3>
          <div className="w-full h-[300px] rounded-xl overflow-hidden border border-slate-100">
            <MapEditor 
              readOnly={true} 
              initialPolygon={typeof parcel.coordinates === 'string' ? JSON.parse(parcel.coordinates) : parcel.coordinates} 
            />
          </div>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">{t('Ownership History', 'स्वामित्व इतिहास')}</h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.map((e, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-govt" />
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{e.remarks || 'Transfer'}</span>
                      <span className="text-slate-400">{new Date(e.transfer_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{e.prev_owner_name ? `${e.prev_owner_name} → ` : ''}{e.new_owner_name || 'System'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Application: {e.application_id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('Parcel Management', 'कित्ता व्यवस्थापन')}</h1>
        <p className="text-sm text-slate-500">{t('View and manage all registered parcels', 'सबै दर्ता भएका कित्ताहरू')}</p>
      </div>
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search by Kitta, district, owner...', 'कित्ता, जिल्ला, मालिक खोज्नुहोस्...')} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-govt/30" /></div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {filtered.map(p => (
          <div key={p.id} onClick={() => setSelected(p.id)} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
            <MapPin size={16} className="text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><span className="font-mono font-bold text-sm text-slate-800">{p.id}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[p.status || 'active'] || 'bg-slate-100'}`}>{(p.status || 'active').replace('_', ' ').toUpperCase()}</span></div>
              <p className="text-xs text-slate-500">{p.district} &gt; {p.municipality} &gt; Ward {p.ward} • {p.land_class}</p>
            </div>
            <span className="text-xs text-slate-400">{p.area} {p.area_unit}</span>
            <ChevronRight size={16} className="text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
}
