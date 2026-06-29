'use client';
import { useAuth } from '@/context/AuthContext';
import { Coins, Send, Download, Search, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TiroOfficerPage() {
  const { t } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/api/parcels')
      .then(res => res.json())
      .then(data => { if (data.success) setParcels(data.data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? parcels : parcels.filter(p => p.tiro_status === filter);

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading tax records...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t('Tiro Management', 'तिरो व्यवस्थापन')}</h1>
          <p className="text-sm text-slate-500">{t('Land Revenue Tax Records', 'भूमि राजस्व कर अभिलेख')}</p>
        </div>
        <button disabled={selected.length === 0} className="px-4 py-2 bg-blue-govt text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
          <Send size={14} /> {t('Send Reminder', 'स्मरण पठाउनुहोस्')} ({selected.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[['all', 'All', 'सबै'], ['paid', 'Paid', 'तिरिएको'], ['due', 'Due', 'बाँकी'], ['overdue', 'Overdue', 'ढिलो']].map(([val, en, np]) => (
          <button key={val} onClick={() => setFilter(val)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === val ? 'bg-blue-govt text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'}`}>
            {t(en, np)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-100">
              <th className="text-left px-5 py-3"><input type="checkbox" className="rounded border-slate-300" onChange={e => setSelected(e.target.checked ? filtered.map(p => p.id) : [])} /></th>
              <th className="text-left px-3 py-3 font-medium">{t('Kitta', 'कित्ता')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Owner', 'मालिक')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Last Paid', 'अन्तिम')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Amount Due', 'बाँकी रकम')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Due Date', 'म्याद')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Status', 'स्थिति')}</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const ownerName = p.ownerLin === 'LIN-07801234' ? 'Ram Bahadur Shrestha' : p.ownerLin === 'LIN-07805678' ? 'Sita Kumari Tamang' : 'Hari Prasad Pokharel';
              return (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={e => setSelected(e.target.checked ? [...selected, p.id] : selected.filter(x => x !== p.id))} className="rounded border-slate-300" /></td>
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-800">{p.id}</td>
                  <td className="px-3 py-3 text-xs text-slate-700">{ownerName}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{p.last_tiro_paid ? new Date(p.last_tiro_paid).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-3 py-3 text-xs font-semibold">NPR {Number(p.tiro_amount || 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{p.tiro_due_date ? new Date(p.tiro_due_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.tiro_status === 'paid' ? 'bg-green-100 text-green-700' : p.tiro_status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.tiro_status === 'paid' ? <CheckCircle size={10} /> : p.tiro_status === 'overdue' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                      {(p.tiro_status || 'paid').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3"><Download size={14} className="text-slate-300 hover:text-slate-600 cursor-pointer" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
