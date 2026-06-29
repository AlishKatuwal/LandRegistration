'use client';
import { useAuth } from '@/context/AuthContext';
import { Coins, Download, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TiroPage() {
  const { user, t } = useAuth();
  const [myParcels, setMyParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, parcelId: null, amount: 0 });

  const fetchParcels = async () => {
    if (!user?.lin) return;
    try {
      const res = await fetch(`http://localhost:5001/api/parcels?ownerLin=${user.lin}`);
      const data = await res.json();
      if (data.success) setMyParcels(data.data);
    } catch (err) {
      console.error('Error fetching tiro', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, [user?.lin]);

  const handlePay = async (id) => {
    const parcelId = id || confirmModal.parcelId;
    if (!parcelId) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`http://localhost:5001/api/parcels/${parcelId}/tiro`, { method: 'PUT' });
      if (res.ok) {
        await fetchParcels();
        setConfirmModal({ show: false, parcelId: null, amount: 0 });
      }
    } catch (err) {
      alert('Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading tax records...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('Tiro & Payments', 'तिरो र भुक्तानी')}</h1>
        <p className="text-sm text-slate-500">{t('Land Revenue & Payment Management', 'भूमि राजस्व र भुक्तानी व्यवस्थापन')}</p>
      </div>

      {/* Warning notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-4 animate-fade-up">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-900 mb-0.5">{t('Tax Compliance Notice', 'कर अनुपालन सूचना')}</p>
          <p className="text-[11px] text-amber-700 leading-relaxed">{t('Tiro must be cleared before initiating any transfer. Overdue Tiro may result in Jagga Rokka (Land Lock).', 'कुनै पनि हस्तान्तरण गर्नु अघि तिरो चुक्ता गर्नुपर्छ। बाँकी तिरोले जग्गा रोक्का हुन सक्छ।')}</p>
        </div>
      </div>
      {/* Tiro cards per parcel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {myParcels.map((p, idx) => {
          const payments = [];
          return (
            <div key={p.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-up" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/50 to-white">
                <div>
                  <p className="font-mono font-bold text-base text-slate-900">{p.id}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{p.district} • Ward {p.ward}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border-2 ${
                  p.tiro_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  p.tiro_status === 'overdue' ? 'bg-red-50 text-red-700 border-red-100' : 
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {(p.tiro_status || 'paid').toUpperCase()}
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Annual Tax', 'वार्षिक कर')}</p>
                    <p className="text-lg font-black text-slate-800 font-mono">Rs. {(p.tiro_amount || 500).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Status', 'अवस्था')}</p>
                    <div className="flex items-center gap-1.5">
                       <div className={`w-1.5 h-1.5 rounded-full ${p.tiro_status === 'paid' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                       <p className="text-xs font-bold text-slate-700">{p.tiro_status === 'paid' ? 'Active' : 'Payment Due'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Due Date', 'म्याद')}</p>
                    <p className={`text-xs font-bold ${p.tiro_status === 'overdue' ? 'text-red-600' : 'text-slate-600'}`}>
                      {p.tiro_due_date ? new Date(p.tiro_due_date).toLocaleDateString() : 'Dec 2026'}
                    </p>
                  </div>
                </div>

                {p.tiro_status !== 'paid' && (
                  <button 
                    disabled={processing} 
                    onClick={() => setConfirmModal({ show: true, parcelId: p.id, amount: p.tiro_amount || 500 })} 
                    className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-bold transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 group"
                  >
                    <CreditCard size={16} className="group-hover:rotate-12 transition-transform" /> 
                    {t('Settle Land Tax Now', 'अहिले तिरो तिर्नुहोस्')}
                  </button>
                )}

                {p.tiro_status === 'paid' && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700">
                    <CheckCircle size={18} />
                    <span className="text-xs font-bold uppercase tracking-tight">Tiro Cleared for FY 2081/82</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in duration-300">
            <div className="h-2 bg-crimson-600" />
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-crimson-50 text-crimson-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <Coins size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{t('Confirm Tax Payment', 'कर भुक्तानी पुष्टि गर्नुहोस्')}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                {t('You are about to pay land tax for parcel', 'तपाईं कित्ताका लागि जग्गा कर तिर्न लाग्नुभएको छ')} <strong className="text-slate-800">{confirmModal.parcelId}</strong>.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center mb-8">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                 <span className="text-lg font-black text-crimson-600 font-mono">Rs. {confirmModal.amount.toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handlePay()}
                  disabled={processing}
                  className="w-full py-4 bg-crimson-600 hover:bg-crimson-700 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-crimson-100 flex items-center justify-center gap-2"
                >
                  {processing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {t('Confirm & Pay', 'पुष्टि र भुक्तानी')}
                </button>
                <button 
                  onClick={() => setConfirmModal({ show: false, parcelId: null, amount: 0 })}
                  disabled={processing}
                  className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                >
                  {t('Cancel', 'रद्द गर्नुहोस्')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
