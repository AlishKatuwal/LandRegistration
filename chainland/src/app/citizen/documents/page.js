'use client';
import { useAuth } from '@/context/AuthContext';
import { FolderOpen, Shield, AlertTriangle, Download, RefreshCw, Upload, FileText, Search, Lock, CheckCircle, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';

const docs = [
  { name: 'Lalpurja Certificate', nameNp: 'लालपुर्जा प्रमाणपत्र', type: 'PDF', date: '2075-11-15', verified: true, size: '2.4 MB', hash: 'a3f2b8c1...d4e5f6' },
  { name: 'Ghar Bato Sifaris', nameNp: 'घर बाटो सिफारिस', type: 'PDF', date: '2075-11-10', verified: true, size: '1.1 MB', hash: 'b7c8d9e0...f1g2h3' },
  { name: 'Citizenship Certificate', nameNp: 'नागरिकता प्रमाणपत्र', type: 'Image', date: '2068-05-20', verified: true, size: '3.8 MB', hash: 'i4j5k6l7...m8n9o0' },
  { name: 'Survey Field Book Extract', nameNp: 'नक्सा किताब', type: 'PDF', date: '2075-11-12', verified: false, size: '890 KB', hash: 'p1q2r3s4...MISMATCH' },
];

export default function DocumentsPage() {
  const { user, t } = useAuth();
  const [myParcels, setMyParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParcel, setSelectedParcel] = useState('all');

  useEffect(() => {
    if (!user?.lin) return;
    fetch(`http://localhost:5001/api/parcels?ownerLin=${user.lin}`)
      .then(res => res.json())
      .then(data => { if (data.success) setMyParcels(data.data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [user?.lin]);

  const verifiedCount = docs.filter(d => d.verified).length;
  const totalCount = docs.length;

  if (loading) return (
    <div className="p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-slate-500">{t('Loading documents...', 'कागजातहरू लोड हुँदैछ...')}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t('Document Vault', 'कागजात भण्डार')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('Blockchain-verified documents linked to your parcels', 'तपाईंका कित्ताहरूसँग सम्बन्धित ब्लकचेन-प्रमाणित कागजातहरू')}</p>
        </div>
        <button className="px-4 py-2.5 bg-crimson-600 text-white rounded-xl text-sm font-semibold hover:bg-crimson-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
          <Upload size={14} /> {t('Upload Document', 'कागजात अपलोड')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Total Documents', 'कुल कागजात')}</p>
          <p className="text-2xl font-bold text-slate-800">{totalCount * myParcels.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle size={10} className="text-green-500" />
            <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('Verified', 'प्रमाणित')}</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{verifiedCount * myParcels.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={10} className="text-amber-500" />
            <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('Issues', 'समस्या')}</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{(totalCount - verifiedCount) * myParcels.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Lock size={10} className="text-blue-500" />
            <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('Parcels', 'कित्ता')}</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">{myParcels.length}</p>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('Search documents...', 'कागजात खोज्नुहोस्...')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500/20 focus:border-crimson-300 transition-all"
          />
        </div>
        <select
          value={selectedParcel}
          onChange={e => setSelectedParcel(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500/20 cursor-pointer"
        >
          <option value="all">{t('All Parcels', 'सबै कित्ता')}</option>
          {myParcels.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
        </select>
      </div>

      {/* Documents by parcel */}
      {(selectedParcel === 'all' ? myParcels : myParcels.filter(p => p.id === selectedParcel)).map(p => (
        <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-crimson-50 text-crimson-600 rounded-lg flex items-center justify-center">
                <FolderOpen size={16} />
              </div>
              <div>
                <span className="font-mono font-bold text-sm text-slate-800">{p.id}</span>
                <p className="text-[10px] text-slate-400">{p.district} &gt; {p.municipality}</p>
              </div>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-semibold">{docs.length} {t('files', 'फाइलहरू')}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.nameNp.includes(searchTerm)).map((doc, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.verified ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 font-medium">{t(doc.name, doc.nameNp)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{doc.type}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">{doc.size}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">{t('Uploaded', 'अपलोड')}: {doc.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">
                    <Hash size={8} /> {doc.hash}
                  </div>
                  {doc.verified ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      <Shield size={10} /> {t('Verified', 'प्रमाणित')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <AlertTriangle size={10} /> {t('Mismatch', 'मेल खाएन')}
                    </span>
                  )}
                  <button className="text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100" title="Re-verify">
                    <RefreshCw size={14} />
                  </button>
                  <button className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
